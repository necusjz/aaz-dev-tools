import { 
  compilerAssert,
  EmitContext, 
  emitFile, 
  ignoreDiagnostics, 
  getService,
  listServices, 
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
import {getResourcePath, swaggerResourcePathToResourceId, getPathParamters, getQueryParamters, getResponse } from "./utils.js";
import { HttpOperationSchema, AAZResourceEmitterSchema, AAZTspPathItem } from "./types.js";
import { AAZEmitterOptions, getTracer } from "./lib.js";

export async function $onEmit(context: EmitContext<AAZEmitterOptions>) {
  console.log("context in onemit: ", context)
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
    console.log("res in emitter getResourceOperation", res)
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
    console.log("services: ", services)
    if (services.length === 0) {
      services.push({ type: context.program.getGlobalNamespaceType() });
    }
    console.log("services after push: ", services)
    for (const service of services) {
      const versions = buildVersionProjections(context.program, service.type);
      for (const record of versions) {
        let program = context.program;
        if (record.projections.length > 0) {
          program = projectProgram(context.program, record.projections);
        }
        const httpService = ignoreDiagnostics(getAllHttpServices(program))[0]
        console.log("http service: ", httpService)
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
  console.log("options: ", context.options);
  const originalProgram = context.program;
  let currentService: Service;
  let projectedProgram: Program;
  let result: AAZResourceEmitterSchema[] = context.options?.resources?.map((rt) => {
    return {
      id: rt,
      version: context.options.apiVersion,
    }
  }) || [];

  console.log("roots: ", result)

  async function getResourcesOperation() {
    console.log("apiVersion: ", context.options.apiVersion)
    tracer.trace("options for createGetResourceOperationEmitter", JSON.stringify(context.options, null, 2));
    const services = listServices(context.program);
    console.log("services after listServices: ", services)
    for (const service of services) {
      currentService = service;
      const versions = buildVersionProjections(context.program, service.type).filter(
        (v) => !context.options.apiVersion || context.options.apiVersion === v.version
      );
      console.log("versions after filter: ", versions)
      for (const record of versions) {
        projectedProgram = context.program;
        if (record.projections.length > 0) {
          projectedProgram = projectProgram(context.program, record.projections);
        }
        const httpService = getService(projectedProgram, service.type);

        const services = ignoreDiagnostics(getAllHttpServices(projectedProgram));
        console.log("services from projectedProgram: ", services)

        const operations = services[0].operations;
        reportIfNoRoutes(projectedProgram, operations);
        console.log("routes (operations) from service: ", operations);
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
      console.log("operation for path", selected_operations, path);
      if (selected_operations.length == 0) {
        console.log(" no op found for path: ", path)
        continue;
      }
      let schema: AAZTspPathItem = {};
      for (const operation of selected_operations){
        emitResourceOperation(program, operation, rt, schema);
      } 
      console.log('schema for path', schema, path)
      rt.pathItem = schema;
    }
  }

  function emitResourceOperation(program: Program, operation: HttpOperation, resourceObj: AAZResourceEmitterSchema, schema:AAZTspPathItem){
    let { path: fullPath, operation: op, verb, parameters } = operation;
    let selected_path = getPathWithoutArg(fullPath).toLocaleLowerCase();
    if (selected_path != resourceObj.id) {
      compilerAssert(false, `Operation path "${resourceObj.id}" not match fullPath "${fullPath}".`);
    }
    const opId = op.namespace?.name + "_" + op.name;
    console.log("op_id", opId);
    if (!schema[verb]) {
      schema[verb] = {}
    }
    schema[verb] = {
      operationId: opId
    };
  }

  function getPathWithoutArg(path: string): string {
    // strip everything between {}
    return path.replace(/\{.*?\}/g, '{}')
  }

}

