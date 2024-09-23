import {
  EmitContext,
  emitFile,
  ignoreDiagnostics,
  listServices,
  projectProgram,
  Program,
  resolvePath,
} from "@typespec/compiler";

import { buildVersionProjections } from "@typespec/versioning";
import { HttpService, getAllHttpServices, reportIfNoRoutes } from "@typespec/http";
import { getResourcePath, swaggerResourcePathToResourceId, } from "./utils.js";
import { AAZResourceSchema } from "./types.js";
import { AAZEmitterOptions, getTracer } from "./lib.js";
import { createSdkContext } from "@azure-tools/typespec-client-generator-core";
import { AAZEmitterContext } from "./context.js";
import { retrieveAAZOperation } from "./convertor.js";

export async function $onEmit(context: EmitContext<AAZEmitterOptions>) {
  if (context.options.operation === "list-resources") {
    const emitter = createListResourceEmitter(context);
    const resources = await emitter.listResources();
    await emitFile(context.program, {
      path: resolvePath(context.emitterOutputDir, "resources.json"),
      content: JSON.stringify(resources, null, 2),
    });
  } else if (context.options.operation === "get-resources-operations") {
    const emitter = createGetResourceOperationEmitter(context);
    const res = await emitter.getResourcesOperations();
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

    // const tracer = getTracer(context.program);
    // tracer.trace("Resources", JSON.stringify(_resources, null, 2));

    const result = Object.entries(resourceVersions).map(([id, versions]) => ({ id, versions: Object.entries(versions).map(([version, path]) => ({ version, path, id })) }));
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

function createGetResourceOperationEmitter(context: EmitContext<AAZEmitterOptions>) {
  const sdkContext = createSdkContext(context, "@azure-tools/typespec-aaz");
  const tracer = getTracer(context.program);
  tracer.trace("options", JSON.stringify(context.options, null, 2));
  const apiVersion = sdkContext.apiVersion!;
  tracer.trace("apiVersion", apiVersion);

  let projectedProgram: Program;
  const resOps: Record<string, AAZResourceSchema> = {};
  context.options?.resources?.forEach((id) => {
    resOps[id] = {
      id: id,
      path: "",
      version: apiVersion
    };
  });

  async function getResourcesOperations() {
    const services = listServices(context.program);
    for (const service of services) {
      // currentService = service;
      const versions = buildVersionProjections(context.program, service.type).filter(
        (v) => apiVersion === v.version
      );
      for (const record of versions) {
        projectedProgram = context.program;
        if (record.projections.length > 0) {
          projectedProgram = projectProgram(context.program, record.projections);
        }
        const aazContext: AAZEmitterContext = {
          program: projectedProgram,
          service: service,
          sdkContext: sdkContext,
          apiVersion: apiVersion,
          tracer,
        };
        emitResourceOps(aazContext);
      }
    }
    const results = [];     
    
    for (const id in resOps) {
      if (resOps[id].pathItem) {
        results.push(resOps[id]);
      }
    }
    return results;
  }

  return { getResourcesOperations };

  function emitResourceOps(context: AAZEmitterContext) {
    const services = ignoreDiagnostics(getAllHttpServices(context.program));
    const operations = services[0].operations;
    reportIfNoRoutes(projectedProgram, operations);

    operations.forEach((op) => {
      const resourcePath = getResourcePath(context.program, op);
      const resourceId = swaggerResourcePathToResourceId(resourcePath);
      if (resourceId in resOps) {
        resOps[resourceId]!.path = resourcePath;
        resOps[resourceId]!.pathItem = retrieveAAZOperation(context, op, resOps[resourceId].pathItem);
      }
    });
  }
}
