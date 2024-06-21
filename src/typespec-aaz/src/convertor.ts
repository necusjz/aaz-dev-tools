import { HttpOperation, getHeaderFieldOptions, getQueryParamOptions, isContentTypeHeader } from "@typespec/http";
import { AAZEmitterContext, AAZOperationEmitterContext, AAZSchemaEmitterContext } from "./context.js";
import { resolveOperationId } from "./utils.js";
import { TypeSpecPathItem } from "./model/path_item.js";
import { CMDHttpOperation } from "./model/operation.js";
import { Model, ModelProperty, Program, Scalar, Type, getDoc, getProjectedName, isNeverType, isNullType, isVoidType, resolveEncodedName } from "@typespec/compiler";
import { PagedResultMetadata, getLroMetadata, getPagedResult } from "@azure-tools/typespec-azure-core";
import { XmsPageable } from "./model/x_ms_pageable.js";
import { MutabilityEnum } from "./model/fields.js";
import { CMDHttpRequest, CMDHttpResponse } from "./model/http.js";
import { CMDObjectSchema, CMDSchema, CMDSchemaBase } from "./model/schema.js";


export function retrieveAAZOperation(context: AAZEmitterContext, operation: HttpOperation, pathItem: TypeSpecPathItem | undefined): TypeSpecPathItem {
    if (!pathItem) {
        pathItem = {};
    }

    const verb = operation.verb;
    const opId = resolveOperationId(context, operation);
    if (!pathItem[verb]) {
        pathItem[verb] = {}
    }
    pathItem[verb]!.operationId = opId;
    pathItem[verb]!.pageable = extractPagedMetadata(context.program, operation);

    if (verb === 'get') {
        pathItem[verb]!.read = convert2CMDOperation({
            ...context,
            operationId: opId,
            mutability: MutabilityEnum.Read,
        }, operation);
    } else if (verb === 'head') {
        pathItem[verb]!.read = convert2CMDOperation({
            ...context,
            operationId: opId,
            mutability: MutabilityEnum.Read,
        }, operation);
    } else if (verb === 'delete') {
        pathItem[verb]!.create = convert2CMDOperation({
            ...context,
            operationId: opId,
            mutability: MutabilityEnum.Create,
        }, operation);
    } else if (verb === 'post') {
        pathItem[verb]!.create = convert2CMDOperation({
            ...context,
            operationId: opId,
            mutability: MutabilityEnum.Create,
        }, operation);
    } else if (verb === 'put') {
        pathItem[verb]!.create = convert2CMDOperation({
            ...context,
            operationId: opId,
            mutability: MutabilityEnum.Create,
        }, operation);
        pathItem[verb]!.update = convert2CMDOperation({
            ...context,
            operationId: opId,
            mutability: MutabilityEnum.Update,
        }, operation);
    } else if (verb === 'patch') {
        pathItem[verb]!.update = convert2CMDOperation({
            ...context,
            operationId: opId,
            mutability: MutabilityEnum.Update,
        }, operation);
    } else {
        console.log(" verb not expected: ", verb)
    }
    return pathItem;
}

function convert2CMDOperation(context: AAZOperationEmitterContext, operation: HttpOperation): CMDHttpOperation {
    // TODO: resolve host parameters for the operation

    const op: CMDHttpOperation = {
        operationId: context.operationId,
        description: getDoc(context.program, operation.operation),
        http: {
            // TODO: add host path if exists
            path: getPathWithoutQuery(operation.path),
        }
    };

    const lroMetadata = getLroMetadata(context.program, operation.operation);
    if (lroMetadata !== undefined && operation.verb !== "get") {
        op.longRunning = {
            finalStateVia: lroMetadata.finalStateVia,
        }
        // TODO: add support for custom polling information
    }

    op.http.request = extractHttpRequest(context, operation);
    op.http.responses = extractHttpResponses(context, operation);
    if (lroMetadata !== undefined && lroMetadata.logicalResult) {
        // TODO: add logicalResult in responses
    }
    return op;
}

// function extractHostParameters(context: AAZEmitterContext) {
//     // TODO: resolve host parameters
//     // return context.sdkContext.host;
// }


function extractHttpRequest(context: AAZOperationEmitterContext, operation: HttpOperation): CMDHttpRequest | undefined {
    // TODO: Add host parameters to the request
    const request: CMDHttpRequest = {
      method: operation.verb,
    };

    const methodParams = operation.parameters;
    const paramModels: Record<string, Record<string, CMDSchema>> = {};
    let clientRequestIdName;
    for (const httpOpParam of methodParams.parameters) {
        if (httpOpParam.type === "header" && isContentTypeHeader(context.program, httpOpParam.param)) {
            continue;
        }
        if (isNeverType(httpOpParam.param.type)) {
            continue;
        }
        const schema = convert2CMDSchema(
          buildSchemaEmitterContext(context, httpOpParam.param, httpOpParam.type),
          httpOpParam.param,
          httpOpParam.name
        );
        if (!schema) {
          continue;
        }

        if (paramModels[httpOpParam.type] === undefined) {
          paramModels[httpOpParam.type] = {};
        }
        paramModels[httpOpParam.type][schema.name] = schema;
        if (httpOpParam.type === "header" && schema.name === "x-ms-client-request-id") {
          clientRequestIdName = schema.name;
        }
    }

    if (paramModels["path"]) {
      request.path =  {
        params: [],
      }
      // sort by param name
      for (const name of Object.keys(paramModels["path"]).sort()) {
        request.path.params!.push(paramModels["path"][name]);
      }
    }

    if (paramModels["query"]) {
      request.query = {
        params: [],
      }
      // sort by param name
      for (const name of Object.keys(paramModels["query"]).sort()) {
        request.query.params!.push(paramModels["query"][name]);
      }
    }

    if (paramModels["header"]) {
      request.header = {
        params: [],
      }
      // sort by param name
      for (const name of Object.keys(paramModels["header"]).sort()) {
        request.header.params!.push(paramModels["header"][name]);
      }
      if (clientRequestIdName) {
        request.header.clientRequestId = clientRequestIdName;
      }
    }

    if (methodParams.body && !isVoidType(methodParams.body.type)) {
      const body = methodParams.body!;
      const consumes: string[] = body.contentTypes ?? [];
      if (consumes.length === 0) {
        // we didn't find an explicit content type anywhere, so infer from body.
        if (getModelOrScalarTypeIfNullable(body.type)) {
          consumes.push("application/json");
        }
      }
      const isBinary = isBinaryPayload(body.type, consumes);
      if (isBinary) { 
        throw new Error("NotImplementedError: Binary payloads are not supported.");
      }
      if (consumes.includes("multipart/form-data")) {
        throw new Error("NotImplementedError: Multipart form data payloads are not supported.");
      }
      let schema: CMDSchema | undefined;
      if (body.parameter) {
        schema = convert2CMDSchema(
          buildSchemaEmitterContext(context, body.parameter, "body"),
          body.parameter,
          getJsonName(context, body.parameter)
        );
      } else {
        schema = {
          ...convert2CMDSchemaBase(
            buildSchemaEmitterContext(context, body.type, "body"),
            body.type
          )!,
          name: "body",
          required: true,
        };
      }
      if (schema !== undefined) {
        if (schema.type === "object") {
          schema = {
            ...schema,
            clientFlatten: true,
          } as CMDObjectSchema;
        }
        request.body = {
          json: {
            schema
          }
        }
      }
    }
    return request;
}

function extractHttpResponses(context: AAZOperationEmitterContext, operation: HttpOperation): CMDHttpResponse[] | undefined {
    // TODO:
    return undefined
}

// Schema functions

function buildSchemaEmitterContext(context: AAZOperationEmitterContext, param: Type, type: "header" | "query" | "path" | "body"): AAZSchemaEmitterContext {
  let collectionFormat;
  if (type === "query") {
    collectionFormat = getQueryParamOptions(context.program, param).format;
  } else if (type === "header") {
    collectionFormat = getHeaderFieldOptions(context.program, param).format;
  }
  if (collectionFormat === "csv") {
    collectionFormat = undefined;
  }
  return {
    ...context,
    collectionFormat,
  }
}



function convert2CMDSchema(context: AAZSchemaEmitterContext, param: ModelProperty, name?: string): CMDSchema | undefined {
    if (isNeverType(param.type)) {
        return undefined;
    }

    switch (param.type.kind) {
      case "Number":
      case "String":
      case "Boolean":
      case "Intrinsic":
      case "Model":
      case "ModelProperty":
        return convert2CMDSchema(context, param.type as ModelProperty);
      case "Scalar":
        
      case "Union":
      case "UnionVariant":
      case "Enum":
      case "Tuple":
    }


    // if (param.type.kind === "Model" && isArrayModelType(context.program, param.type)) {

    // }

}

function convert2CMDSchemaBase(context: AAZSchemaEmitterContext, type: Type): CMDSchemaBase | undefined {

  return undefined;
}


// Utils functions


function getJsonName(context: AAZOperationEmitterContext,type: Type & { name: string }): string {
  const viaProjection = getProjectedName(context.program, type, "json");
  const encodedName = resolveEncodedName(context.program, type, "application/json");
  // Pick the value set via `encodedName` or default back to the legacy projection otherwise.
  // `resolveEncodedName` will return the original name if no @encodedName so we have to do that check
  return encodedName === type.name ? viaProjection ?? type.name : encodedName;
}

function getPathWithoutQuery(path: string): string {
    // strip everything from the key including and after the ?
    return path.replace(/\/?\?.*/, "");
}

function parseNextLinkName(paged: PagedResultMetadata): string | undefined {
    const pathComponents = paged.nextLinkSegments;
    if (pathComponents) {
        return pathComponents[pathComponents.length - 1];
    }
    return undefined;
}

function extractPagedMetadataNested(
    program: Program,
    type: Model
): PagedResultMetadata | undefined {
    // This only works for `is Page<T>` not `extends Page<T>`.
    let paged = getPagedResult(program, type);
    if (paged) {
        return paged;
    }
    if (type.baseModel) {
        paged = getPagedResult(program, type.baseModel);
    }
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

function extractPagedMetadata(program: Program, operation: HttpOperation): XmsPageable | undefined {
    for (const response of operation.responses) {
        const paged = extractPagedMetadataNested(program, response.type as Model);
        if (paged) {
            let nextLinkName = parseNextLinkName(paged);
            if (!nextLinkName) {
                nextLinkName = 'nextLink';
            }
            return {
                nextLinkName,
            };
        }
    }
}


function getModelOrScalarTypeIfNullable(type: Type): Model | Scalar | undefined {
    if (type.kind === "Model" || type.kind === "Scalar") {
      return type;
    } else if (type.kind === "Union") {
      // Remove all `null` types and make sure there's a single model type
      const nonNulls = [...type.variants.values()]
        .map((x) => x.type)
        .filter((variant) => !isNullType(variant));
      if (nonNulls.every((t) => t.kind === "Model" || t.kind === "Scalar")) {
        return nonNulls.length === 1 ? (nonNulls[0] as Model) : undefined;
      }
    }
    return undefined;
  }

  function isBinaryPayload(body: Type, contentType: string | string[]) {
    const types = new Set(typeof contentType === "string" ? [contentType] : contentType);
    return (
      body.kind === "Scalar" &&
      body.name === "bytes" &&
      !types.has("application/json") &&
      !types.has("text/plain")
    );
  }