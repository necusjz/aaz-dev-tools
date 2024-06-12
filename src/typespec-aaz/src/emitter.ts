import { 
  compilerAssert,
  EmitContext, 
  emitFile, 
  ignoreDiagnostics,
  getDoc, 
  getService,
  listServices,
  Model, 
  projectProgram, 
  Program, 
  resolvePath, 
  Service, 
 } from "@typespec/compiler";

import { buildVersionProjections } from "@typespec/versioning";
import {
  PagedResultMetadata,
  extractLroStates,
  getLroMetadata,
  getPagedResult,
} from "@azure-tools/typespec-azure-core";
import { HttpService, getAllHttpServices, reportIfNoRoutes, getHttpOperation, HttpOperation } from "@typespec/http";
// import { SdkContext, createSdkContext } from "@azure-tools/typespec-client-generator-core";
import {getResourcePath, swaggerResourcePathToResourceId, } from "./utils.js";
import { AAZResourceEmitterSchema, AAZTspPathItem, MutabilityEnum, AAZTspHttpOperation } from "./types.js";
import { AAZEmitterOptions, getTracer } from "./lib.js";

export async function $onEmit(context: EmitContext<AAZEmitterOptions>) {
  if (context.options.operation === "list-resources") {
    const emitter = createListResourceEmitter(context);
    const resources = await emitter.listResources();
    await emitFile(context.program, {
      path: resolvePath(context.emitterOutputDir, "resources.json"),
      content: JSON.stringify(resources, null, 2),
    });
  } else if (context.options.operation === "retrieve-operation") {
    // TODO:
    // const sdkContext = createSdkContext(context, "@client-tools/typespec-aaz");
    // const emitter = createRetrieveOperationsEmitter(sdkContext);
    // await emitter.retrieveOperations();
  } else if (context.options.operation === "get-resources-operations") {
    const emitter = createGetResourceOperationEmitter(context);
    const res = await emitter.getResourcesOperation();
    await emitFile(context.program, {
      path: resolvePath(context.emitterOutputDir, "resources_operations.json"),
      content: JSON.stringify(res, null, 2),
    });
  } else {
    throw TypeError(`Unknown operation: ${context.options.operation}`);
  }
}

function createListResourceEmitter(context: EmitContext<AAZEmitterOptions>) {
  const _resources: Record<string, string[]> = {};
  const resourceVersions: Record<string, Record<string, string>> = {};
  async function listResources() {
    const services = listServices(context.program);
    if (services.length === 0) {
      services.push({ type: context.program.getGlobalNamespaceType() });
    }
    for (const service of services) {
      const versions = buildVersionProjections(context.program, service.type);
      for (const record of versions) {
        let program = context.program;
        if (record.projections.length > 0) {
          program = projectProgram(context.program, record.projections);
        }
        const httpService = ignoreDiagnostics(getAllHttpServices(program))[0]
        emitService(httpService, program, record.version!);
      }
    }

    const tracer = getTracer(context.program);
    tracer.trace("Resources", JSON.stringify(_resources, null, 2));

    const result = Object.entries(resourceVersions).map(([id, versions]) => ({ id, versions: Object.entries(versions).map(([version, path]) => ({version, path, id}))}));
    return result;
  }

  return { listResources };

  function emitService(service: HttpService, program: Program, version: string) {
    const routes = service.operations;
    reportIfNoRoutes(program, routes);
    routes.forEach((op) => {
      const resourcePath = getResourcePath(program, op);
      const resourceId = swaggerResourcePathToResourceId(resourcePath);
      const versions = resourceVersions[resourceId] || {};
      versions[version] = resourcePath;
      resourceVersions[resourceId] = versions;
      if (!_resources[resourcePath]) {
        _resources[resourcePath] = [];
      }
      _resources[resourcePath].push(`${op.verb}:${version}`);
    })
  }
}

// function emitOperation(program: Program, operation: HttpOperation) {

// }

// function createRetrieveOperationsEmitter(context: SdkContext) {


//   async function retrieveOperations() {

//   }

//   return { retrieveOperations };
// }

function createGetResourceOperationEmitter(context: EmitContext<AAZEmitterOptions>) {
  const tracer = getTracer(context.program);
  tracer.trace("options", JSON.stringify(context.options, null, 2));
  const originalProgram = context.program;
  let currentService: Service;
  let projectedProgram: Program;
  let result: AAZResourceEmitterSchema[] = context.options?.resources?.map((rt) => {
    return {
      id: rt,
      version: context.options.apiVersion,
    }
  }) || [];
  let schema: AAZTspPathItem = {};

  async function getResourcesOperation() {
    tracer.trace("options for createGetResourceOperationEmitter", JSON.stringify(context.options, null, 2));
    const services = listServices(context.program);
    for (const service of services) {
      currentService = service;
      const versions = buildVersionProjections(context.program, service.type).filter(
        (v) => !context.options.apiVersion || context.options.apiVersion === v.version
      );
      for (const record of versions) {
        projectedProgram = context.program;
        if (record.projections.length > 0) {
          projectedProgram = projectProgram(context.program, record.projections);
        }
        const httpService = getService(projectedProgram, service.type);
        const services = ignoreDiagnostics(getAllHttpServices(projectedProgram));
        const operations = services[0].operations;
        reportIfNoRoutes(projectedProgram, operations);
        emitResourcesOperations(projectedProgram, operations);
      }
      
    }
    return result;
  }

  return { getResourcesOperation };

  function emitResourcesOperations(program: Program, operations: HttpOperation[]) {
    for (let rt of result) {
      let path = rt.id
      let selected_operations = operations.filter((it)=>{return getPathWithoutArg(it.path).toLowerCase() === path});
      if (selected_operations.length == 0) {
        console.log(" no op found for path: ", path)
        continue;
      }
      schema = {};
      for (const operation of selected_operations){
        emitResourceOperation(program, operation, rt, schema);
      } 
      rt.pathItem = schema;
    }
  }

  function emitResourceOperation(program: Program, httpOperation: HttpOperation, resourceObj: AAZResourceEmitterSchema, schema:AAZTspPathItem){
    let { path: fullPath, operation: op, verb, parameters } = httpOperation;
    let selected_path = getPathWithoutArg(fullPath).toLocaleLowerCase();
    if (selected_path != resourceObj.id) {
      compilerAssert(false, `Operation path "${resourceObj.id}" not match fullPath "${fullPath}".`);
    }
    const opId = httpOperation.container.name + "_" + upperFirstString(op.name);
    if (!schema[verb]) {
      schema[verb] = {}
    }

    schema[verb] = {
      operationId: opId,
      isPageable: extractIsPaged(program, httpOperation),
    };

    let mutability = [];
    if (["get", "head"].includes(verb)) {
      mutability.push(MutabilityEnum.Read);
    } else if (["put", "delete", "post"].includes(verb)) {
      mutability.push(MutabilityEnum.Create);
    } else if (["patch"].includes(verb)) {
      mutability.push(MutabilityEnum.Update);
    } else{
      console.log(" verb not expected: ", verb)
    }
    let operationOnMutability: AAZTspHttpOperation;
    for (let mut of mutability){
      operationOnMutability = {
        operationId: opId,
        http: {} as any
      }
      populateOperationOnMutability(program, httpOperation, operationOnMutability)
      schema[verb]![mut] = operationOnMutability
    }

  }

  function getPathWithoutArg(path: string): string {
    // strip everything between {}
    return path.replace(/\{.*?\}/g, '{}')
  }

  function upperFirstString(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  function extractPagedMetadataNested(program: Program, type: Model): PagedResultMetadata | undefined {
    let paged = getPagedResult(program, type);
    if (paged) {
      return paged;
    }
    const templateArguments = type.templateMapper;
    if (templateArguments) {
      for (const argument of templateArguments.args) {
        const modelArgument = argument as Model;
        if (modelArgument) {
          paged = extractPagedMetadataNested(program, modelArgument);
          if (paged) {
            return paged;
          }
        }
      }
    }
    return paged;
  }

  function extractIsPaged(program: Program, httpOperation: HttpOperation) {
    for (const response of httpOperation.responses) {
      const paged = extractPagedMetadataNested(program, response.type as Model);
      if (paged && paged.nextLinkSegments) {
          return true;
      }
    }
    return false;
  }

  function populateOperationOnMutability(program: Program, httpOperation: HttpOperation, operationOnMutability:AAZTspHttpOperation) {
    operationOnMutability.description = getDoc(program, httpOperation.operation);

    const lroMetadata = getLroMetadata(program, httpOperation.operation);
    // We ignore GET operations because they cannot be LROs per our guidelines and this
    // ensures we don't add the x-ms-long-running-operation extension to the polling operation,
    // which does have LRO metadata.
    //  && operation.verb !== "get" ??
    if (lroMetadata !== undefined) {
      operationOnMutability.longRunning = {finalStateVia: lroMetadata.finalStateVia ? lroMetadata.finalStateVia : "azure-async-operation"};
    }
    operationOnMutability.http = {
      path: httpOperation.path,
      request: {} as any,
      response: [],
    }


  }

}

