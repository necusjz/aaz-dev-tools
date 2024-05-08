import { EmitContext, Program, emitFile, ignoreDiagnostics, listServices, projectProgram, resolvePath } from "@typespec/compiler";
import { AAZEmitterOptions} from "./lib.js";
import { buildVersionProjections } from "@typespec/versioning";
import { HttpService, getAllHttpServices, reportIfNoRoutes } from "@typespec/http";
// import { SdkContext, createSdkContext } from "@azure-tools/typespec-client-generator-core";
import {getResourcePath, swaggerResourcePathToResourceId } from "./utils.js";

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
  } else {
    throw TypeError(`Unknown operation: ${context.options.operation}`);
  }
}

function createListResourceEmitter(context: EmitContext<AAZEmitterOptions>) {
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
    })
  }
}

// function emitOperation(program: Program, operation: HttpOperation) {

// }

// function createRetrieveOperationsEmitter(context: SdkContext) {
//   // const tracer = getTracer(program);
//   // tracer.trace("options", JSON.stringify(options, null, 2));

//   async function retrieveOperations() {

//   }

//   return { retrieveOperations };
// }
