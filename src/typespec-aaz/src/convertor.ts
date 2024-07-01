import { HttpOperation, HttpOperationBody, HttpOperationMultipartBody, HttpOperationResponse, HttpOperationResponseBody, HttpStatusCodeRange, HttpStatusCodesEntry, getHeaderFieldOptions, getQueryParamOptions, getStatusCodeDescription, isContentTypeHeader } from "@typespec/http";
import { AAZEmitterContext, AAZOperationEmitterContext, AAZSchemaEmitterContext } from "./context.js";
import { resolveOperationId } from "./utils.js";
import { TypeSpecPathItem } from "./model/path_item.js";
import { CMDHttpOperation } from "./model/operation.js";
import { DiagnosticTarget, Enum, EnumMember, Model, ModelProperty, Program, Scalar, Type, Union, getDiscriminator, getDoc, getEncode, getProjectedName, getProperty, isArrayModelType, isNeverType, isNullType, isRecordModelType, isTemplateDeclarationOrInstance, isVoidType, resolveEncodedName } from "@typespec/compiler";
import { LroMetadata, PagedResultMetadata, UnionEnum, getLroMetadata, getPagedResult, getUnionAsEnum } from "@azure-tools/typespec-azure-core";
import { XmsPageable } from "./model/x_ms_pageable.js";
import { MutabilityEnum } from "./model/fields.js";
import { CMDHttpRequest, CMDHttpResponse } from "./model/http.js";
import { CMDArraySchemaBase, CMDClsSchemaBase, CMDObjectSchema, CMDObjectSchemaBase, CMDSchema, CMDSchemaBase, CMDStringSchema, CMDStringSchemaBase, CMDIntegerSchemaBase } from "./model/schema.js";
import { getTracer, reportDiagnostic } from "./lib.js";
import {
  getExtensions,
  isReadonlyProperty,
} from "@typespec/openapi";

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

  let lroMetadata = getLroMetadata(context.program, operation.operation);
  if (operation.verb === "get") {
    lroMetadata = undefined;
  }
  if (lroMetadata !== undefined && operation.verb !== "get") {
    op.longRunning = {
      finalStateVia: lroMetadata.finalStateVia,
    }
    // TODO: add support for custom polling information
  }

  op.http.request = extractHttpRequest(context, operation);
  op.http.responses = extractHttpResponses(context, operation, lroMetadata);
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
    request.path = {
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
    if (body.bodyKind === "multipart") {
      throw new Error("NotImplementedError: Multipart form data payloads are not supported.");
    }
    if (isBinaryPayload(body.type, consumes)) {
      throw new Error("NotImplementedError: Binary payloads are not supported.");
    }
    if (consumes.includes("multipart/form-data")) {
      throw new Error("NotImplementedError: Multipart form data payloads are not supported.");
    }

    let schema: CMDSchema | undefined;
    if (body.property) {
      schema = convert2CMDSchema(
        buildSchemaEmitterContext(context, body.property, "body"),
        body.property,
        getJsonName(context, body.property)
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

function extractHttpResponses(context: AAZOperationEmitterContext, operation: HttpOperation, lroMetadata: LroMetadata | undefined): CMDHttpResponse[] | undefined {
  let success202Response: CMDHttpResponse | undefined; // only one success 202 response is allowed
  let success204Response: CMDHttpResponse | undefined; // only one success 204 response is allowed
  let success2xxResponse: CMDHttpResponse | undefined; // only one success 2xx(except 202 and 204) response is allowed
  let redirectResponse: CMDHttpResponse | undefined;
  const errorResponses = [];

  for (const response of operation.responses) {
    let statusCodes = getOpenAPI2StatusCodes(context, response.statusCodes, response.type);
    if (statusCodes.length === 0) {
      reportDiagnostic(context.program, {
        code: "missing-status-codes",
        target: response.type,
      });
    }
    if (statusCodes.includes("default")) {
      errorResponses.push(convert2CMDHttpResponse(context, response, undefined, true));
      continue;
    }
    const isSuccess = statusCodes.map((code) => code.startsWith("2")).includes(true);
    const isRedirect = statusCodes.map((code) => code.startsWith("3")).includes(true);
    const isError = !isSuccess && !isRedirect;
    if (isSuccess) {
      if (statusCodes.includes("202")) {
        if (success202Response !== undefined) {
          reportDiagnostic(context.program, {
            code: "Duplicated-success-202",
            target: response.type,
          });
        }
        success202Response = convert2CMDHttpResponse(context, response, ["202"], false);
      }
      if (statusCodes.includes("204")) {
        if (success204Response !== undefined) {
          reportDiagnostic(context.program, {
            code: "Duplicated-success-204",
            target: response.type,
          });
        }
        success204Response = convert2CMDHttpResponse(context, response, ["204"], false);
      }
      statusCodes = statusCodes.splice(statusCodes.indexOf("202"), 1);
      statusCodes = statusCodes.splice(statusCodes.indexOf("204"), 1);
      if (statusCodes.length > 0) {
        if (success2xxResponse !== undefined) {
          reportDiagnostic(context.program, {
            code: "Duplicated-success-2xx",
            target: response.type,
          });
        }
        success2xxResponse = convert2CMDHttpResponse(context, response, statusCodes, false);
      }
    } else if (isRedirect) {
      if (redirectResponse !== undefined) {
        reportDiagnostic(context.program, {
          code: "Duplicated-redirect",
          target: response.type,
        });
      }
      redirectResponse = convert2CMDHttpResponse(context, response, statusCodes, false);
    } else if (isError) {
      errorResponses.push(convert2CMDHttpResponse(context, response, statusCodes, true));
    }
  }

  const responses = [];
  if (success2xxResponse !== undefined) {
    responses.push(success2xxResponse);
  }
  if (success202Response !== undefined) {
    responses.push(success202Response);
  }
  if (success204Response !== undefined) {
    responses.push(success204Response);
  }
  if (redirectResponse !== undefined) {
    responses.push(redirectResponse);
  }
  responses.push(...errorResponses);

  if (lroMetadata !== undefined && lroMetadata.logicalResult) {
    // TODO: add logicalResult in responses
  }

  return responses
}

function convert2CMDHttpResponse(context: AAZOperationEmitterContext, response: HttpOperationResponse, statusCodes: string[] | undefined, isError: boolean): CMDHttpResponse {
  const res: CMDHttpResponse = {
    statusCode: statusCodes?.map((code) => Number(code)),
    isError: isError,
    description: response.description ?? getResponseDescriptionForStatusCodes(statusCodes),
  };

  const contentTypes: string[] = [];
  let body: HttpOperationBody | HttpOperationMultipartBody | undefined;
  for (const data of response.responses) {
    if (data.headers && Object.keys(data.headers).length > 0) {
      res.header ??= {
        items: [],
      };
      for (const name of Object.keys(data.headers)) {
        res.header.items.push({ name })
      }
    }
    if (data.body) {
      if (body && body.type !== data.body.type) {
        reportDiagnostic(context.program, {
          code: "duplicate-body-types",
          target: response.type,
        });
      }
      body = data.body;
      contentTypes.push(...data.body.contentTypes);
    }
  }
  if (body) {
    const isBinary = contentTypes.every((t) => isBinaryPayload(body!.type, t));
    if (isBinary) {
      throw new Error("NotImplementedError: Binary response are not supported.");
    }
    if (body.bodyKind === "multipart") {
      throw new Error("NotImplementedError: Multipart form data responses are not supported.");
    }
    let schema = convert2CMDSchemaBase(
      {
        ...buildSchemaEmitterContext(context, body.type, "body"),
        mutability: MutabilityEnum.Read,
      },
      body.type
    );
    if (!schema || schema.frozen) {
      throw new Error("Invalid Response Schema. It's None.");
    }
    if (isError) {
      const errorFormat = classifyErrorFormat(context, schema);
      if (errorFormat === undefined) {
        throw new Error("Error response schema is not supported yet.");
      }
      schema = {
        readOnly: schema.readOnly,
        frozen: schema.frozen,
        type: `@${errorFormat}`,
      }
    }
    res.body = {
      json: {
        schema: schema,
      }
    }
  }
  return res;
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
    deep: 0,
  }
}


function convert2CMDSchema(context: AAZSchemaEmitterContext, param: ModelProperty, name?: string): CMDSchema | undefined {
  if (isNeverType(param.type)) {
    return undefined;
  }
  let schema;
  switch (param.type.kind) {
    case "Intrinsic":
      schema = undefined;
      break;
    case "Model":
      schema = convert2CMDSchemaBase(context, param.type as Model);
      break;
    case "ModelProperty":
      schema = convert2CMDSchema(context, param.type as ModelProperty);
      break;
    case "Scalar":
      schema = convert2CMDSchemaBase(context, param.type as Scalar);
      break;
    case "UnionVariant":
      schema = convert2CMDSchemaBase(context, param.type.type);
      break;
    case "Union":
      schema = convert2CMDSchemaBase(context, param.type as Union);
      break;
    case "Enum":
      schema = convert2CMDSchemaBase(context, param.type as Enum);
      break;
    // TODO: handle Literals
    // case "Number":
    // case "String":
    // case "Boolean":
    // case "Tuple":
    default:
      reportDiagnostic(context.program, { code: "Unsupported-Type", target: param.type });
    
  }
  if (schema) {
    schema = {
      ...schema,
      name: name ?? param.name,
      description: getDoc(context.program, param),
    }
  }
  return schema;
}

function convert2CMDSchemaBase(context: AAZSchemaEmitterContext, type: Type): CMDSchemaBase | undefined {
  if (isNeverType(type)) {
    return undefined;
  }
  // const tracer = getTracer(context.program);
  // tracer.trace("Deeps", context.deep.toString());
  let schema;
  switch (type.kind) {
    case "Intrinsic":
      schema = undefined;
      break;
    case "Scalar":
      schema = convertScalar2CMDSchemaBase({
        ...context,
        deep: context.deep + 1,
      }, type as Scalar);
      break;
    case "Model":
      if (isArrayModelType(context.program, type)) {
        schema = convertModel2CMDArraySchemaBase({
          ...context,
          deep: context.deep + 1,
        }, type as Model);
      } else {
        schema = convertModel2CMDObjectSchemaBase({
          ...context,
          deep: context.deep + 1,
        }, type as Model);
      }
      break;
    case "ModelProperty":
      schema = convert2CMDSchema({
        ...context,
        deep: context.deep + 1,
      }, type.type as ModelProperty);
      break;
    case "UnionVariant":
      schema = convert2CMDSchemaBase({
        ...context,
        deep: context.deep + 1,
      }, type.type);
      break;
    case "Union":
      schema = convertUnion2CMDSchemaBase({
        ...context,
        deep: context.deep + 1,
      }, type as Union);
      break;
    case "Enum":
      schema = convertEnum2CMDSchemaBase({
        ...context,
        deep: context.deep + 1,
      }, type as Enum);
      break;
    // TODO: handle Literals
    // case "Number":
    // case "String":
    // case "Boolean":
    // case "Tuple":
    default:
      reportDiagnostic(context.program, { code: "Unsupported-Type", target: type });
  }
  return schema;
}

function convertModel2CMDObjectSchemaBase(context: AAZSchemaEmitterContext, model: Model): CMDObjectSchemaBase | undefined {
  if (isArrayModelType(context.program, model)) {
    return undefined;
  }

  const object: CMDObjectSchemaBase = {
    type: "object",
  };

  if (model.baseModel) {
    // TODO: handle discriminator
  }

  if (isRecordModelType(context.program, model)) {
    object.additionalProps = {
      item: convert2CMDSchemaBase(context, model.indexer.value),
    }
  }
  
  // TODO: handle derived models
  const discriminator = getDiscriminator(context.program, model);
  if (discriminator) {
    const { propertyName } = discriminator;
    // Push discriminator into base type, but only if it is not already there
    if (!model.properties.get(propertyName)) {
      const discriminatorProperty: CMDStringSchema = {
        name: propertyName,
        type: "string",
        required: true,
        description: `Discriminator property for ${model.name}.`,
      };
      object.props = [
        ...object.props ?? [],
        discriminatorProperty,
      ]
    }

    // TODO: add possible enum values for the discriminatorProperty
    // TODO: handle discriminators
  }

  for (const prop of model.properties.values()) {
    if (isNeverType(prop.type)) {
      // If the property has a type of 'never', don't include it in the schema
      continue;
    }

    const jsonName = getJsonName(context, prop);
    const schema = convert2CMDSchema(context, prop, jsonName);
    if (schema) {
      if (isReadonlyProperty(context.program, prop)) {
        schema.readOnly = true;
      }

      object.props = [
        ...object.props ?? [],
        schema,
      ]
    }
  }

  // Special case: if a model type extends a single *templated* base type and
  // has no properties of its own, absorb the definition of the base model
  // into this schema definition.  The assumption here is that any model type
  // defined like this is just meant to rename the underlying instance of a
  // templated type.
  if (model.baseModel && isTemplateDeclarationOrInstance(model.baseModel) && (object.props ?? []).length === 0) {
    // Take the base model schema but carry across the documentation property
    // that we set before
    const baseSchema = convert2CMDSchemaBase(context, model.baseModel);
    Object.assign(object, baseSchema);
  } else if (model.baseModel) {
    // TODO:
  }


  return object;
}

function convertModel2CMDArraySchemaBase(context: AAZSchemaEmitterContext, model: Model): CMDArraySchemaBase | undefined {
  if (isArrayModelType(context.program, model)) {
    const array: CMDArraySchemaBase = {
      type: "array",
      // item: convert2CMDSchemaBase(context, model.indexer.value!),
      identifiers: getExtensions(context.program, model).get("x-ms-identifiers"),
    };
    if (!array.identifiers && getProperty(model.indexer.value as Model, "id")) {
      array.identifiers = ["id"];
    }
    return array;
  }
  return undefined;
}

function convertScalar2CMDSchemaBase(context: AAZSchemaEmitterContext, scalar: Scalar): CMDSchemaBase | undefined {
  const isStd = context.program.checker.isStdType(scalar);
  const encodeData = getEncode(context.program, scalar);
  let schema;
  if (isStd) {
    switch (scalar.name) {
      case "bytes":
        schema = {
          type: "byte",
        }
        break;
      case "numeric":
        schema = {
          type: "integer",
        }
        break;
      case "integer":
        schema = {
          type: "integer",
        }
        break;
      case "int8":
        // TODO: add format for int8
        schema = {
          type: "integer",
        }
        break;
      case "int16":
        // TODO: add format for int16
        schema = {
          type: "integer",
        }
        break;
      case "int32":
        schema = { type: "integer32" };
        break;
      case "int64":
        schema = { type: "integer64" };
        break;
      case "safeint":
        schema = { type: "integer64" };
        break;
      case "uint8":
        // TODO: add format for uint8
        schema = {
          type: "integer",
        }
        break;
      case "uint16":
        // TODO: add format for uint16
        schema = {
          type: "integer",
        }
        break;
      case "uint32":
        // TODO: add format for uint32
        schema = {
          type: "integer",
        }
        break;
      case "uint64":
        // TODO: add format for uint64
        schema = {
          type: "integer",
        }
        break;
      case "float":
        schema = { type: "float" }
        break;
      case "float64":
        schema = { type: "float64" }
        break;
      case "float32":
        schema = { type: "float32" }
        break;
      case "decimal":
        schema = { type: "float64" }
        break;
      case "decimal128":
        // TODO: add format for decimal128
        schema = { type: "float" }
        break;
      case "string":
        schema = { type: "string" }
        break;
      case "url":
        schema = { type: "string" }
        break;
      case "plainDate":
        schema = { type: "date" }
        break;
      case "plainTime":
        schema = { type: "time" }
        break;
      case "utcDateTime":
      case "offsetDateTime":
        switch (encodeData?.encoding) {
          case "rfc3339":
            schema = { type: "dateTime" }
            break;
          case "unixTimestamp":
            // TODO: add "unixtime" support
            schema = { type: "dateTime" };
            break;
          case "rfc7231":
            // TODO: add "date-time-rfc7231" support
            schema = { type: "dateTime" };
            break;
          default:
            if (encodeData !== undefined) {
              schema = convertScalar2CMDSchemaBase(context, encodeData.type);
            }
            schema ??= { type: "dateTime" };
        }
        break;
      case "duration":
        switch (encodeData?.encoding) {
          case "ISO8601":
            schema = { type: "duration" }
            break;
          case "seconds":
            // TODO: add "seconds" support
            schema = { type: "duration" }
            break;
          default:
            if (encodeData !== undefined) {
              schema = convertScalar2CMDSchemaBase(context, encodeData.type);
            }
            schema ??= { type: "duration" }
        }
        break;
      case "boolean":
        schema = { type: "boolean" }
        break;
    }
    // return scalar.name;
  } else if (scalar.baseScalar) {
    schema = convertScalar2CMDSchemaBase(context, scalar.baseScalar);
  }

  return schema;
}

function convertUnion2CMDSchemaBase(context: AAZSchemaEmitterContext, union: Union): CMDSchemaBase | undefined {
  const nonNullOptions = [...union.variants.values()]
      .map((x) => x.type)
      .filter((t) => !isNullType(t));
  const nullable = union.variants.size !== nonNullOptions.length;
  if (nonNullOptions.length === 0) {
    reportDiagnostic(context.program, { code: "union-null", target: union });
    return undefined;
  }

  let schema;
  if (nonNullOptions.length === 1) {
    const type = nonNullOptions[0];
    schema = {
      ...convert2CMDSchemaBase(context, type)!,
      nullable,
    }
  } else {
    const [asEnum] = getUnionAsEnum(union);
    if (asEnum) {
      schema = convertUnionEnum2CMDSchemaBase(context, union, asEnum);
    } else {
      reportDiagnostic(context.program, {
        code: "union-unsupported",
        target: union,
      });
    }
  }
  return schema;
}

function convertUnionEnum2CMDSchemaBase(context: AAZSchemaEmitterContext, union: Union, e: UnionEnum): CMDStringSchemaBase | CMDIntegerSchemaBase | undefined {
  let schema;
  if (e.kind === 'number') {
    schema = {
      type: "integer",
      nullable: e.nullable,
      enum: {
        items: Array.from(e.flattenedMembers.values()).map((member) => {
          return {
            value: member.value,
          }
        }),
      }
    } as CMDIntegerSchemaBase;
  } else if (e.kind === 'string') {
    schema = {
      type: "string",
      nullable: e.nullable,
      enum: {
        items: Array.from(e.flattenedMembers.values()).map((member) => {
          return {
            value: member.value,
          }
        }),
      }
    } as CMDStringSchemaBase;
  }
  // TODO: handle e.open which supports additional enum values
  return schema;
}

function convertEnum2CMDSchemaBase(context: AAZSchemaEmitterContext, e: Enum): CMDStringSchemaBase | CMDIntegerSchemaBase | undefined {
  let schema;
  const type = getEnumMemberType(e.members.values().next().value);
  for (const option of e.members.values()) {
    if (type !== getEnumMemberType(option)) {
      return undefined;
    }
  }
  if (type === 'number') {
    schema = {
      type: "integer",
      enum: {
        items: Array.from(e.members.values()).map((member) => {
          return {
            value: member.value! as number,
          }
        }),
      }
    } as CMDIntegerSchemaBase;
  } else if (type === 'string') {
    schema = {
      type: "string",
      enum: {
        items: Array.from(e.members.values()).map((member) => {
          return {
            value: (member.value ?? member.name) as string,
          }
        }),
      }
    } as CMDStringSchemaBase;
  }
  return schema;

  function getEnumMemberType(member: EnumMember): "string" | "number" {
    if (typeof member.value === "number") {
      return "number";
    }
    return "string";
  }
}

// function applyIntrinsicSchemaDecorators(
//   context: AAZSchemaEmitterContext,
//   typespecType: Model | Scalar | ModelProperty | Union,
//   target: CMDSchemaBase
// ): CMDSchemaBase {
//   const newTarget = { ...target };
// }



// Utils functions

function getJsonName(context: AAZOperationEmitterContext, type: Type & { name: string }): string {
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

function getOpenAPI2StatusCodes(
  context: AAZOperationEmitterContext,
  statusCodes: HttpStatusCodesEntry,
  diagnosticTarget: DiagnosticTarget
): string[] {
  if (statusCodes === "*") {
    return ["default"];
  } else if (typeof statusCodes === "number") {
    return [String(statusCodes)];
  } else {
    return rangeToOpenAPI(context, statusCodes, diagnosticTarget);
  }
}

function rangeToOpenAPI(
  context: AAZOperationEmitterContext,
  range: HttpStatusCodeRange,
  diagnosticTarget: DiagnosticTarget
): string[] {
  const reportInvalid = () =>
    reportDiagnostic(context.program, {
      code: "unsupported-status-code-range",
      format: { start: String(range.start), end: String(range.end) },
      target: diagnosticTarget,
    });

  const codes: string[] = [];
  let start = range.start;
  let end = range.end;

  if (range.start < 100) {
    reportInvalid();
    start = 100;
    codes.push("default");
  } else if (range.end > 599) {
    reportInvalid();
    codes.push("default");
    end = 599;
  }
  const groups = [1, 2, 3, 4, 5];

  for (const group of groups) {
    if (start > end) {
      break;
    }
    const groupStart = group * 100;
    const groupEnd = groupStart + 99;
    if (start >= groupStart && start <= groupEnd) {
      codes.push(`${group}XX`);
      if (start !== groupStart || end < groupEnd) {
        reportInvalid();
      }
      start = groupStart + 100;
    }
  }
  return codes;
}

function getResponseDescriptionForStatusCodes(statusCodes: string[] | undefined) {
  if (!statusCodes || statusCodes.length === 0) {
    return undefined;
  }
  if (statusCodes.includes("default")) {
    return undefined;
  }
  return getStatusCodeDescription(statusCodes[0]) ?? undefined;
}

function classifyErrorFormat(context: AAZOperationEmitterContext, schema: CMDSchemaBase): "ODataV4Format" | "MgmtErrorFormat" | undefined {
  if (schema.type.startsWith("@")) {
    schema = getClsDefinitionModel(context, schema as CMDClsSchemaBase);
  }
  if (schema.type !== "object" || (schema as CMDObjectSchemaBase).props === undefined) {
    return undefined;
  }
  let errorSchema = schema as CMDObjectSchemaBase;
  const props: Record<string, CMDSchema> = {};
  for (const prop of errorSchema.props!) {
    props[prop.name] = prop;
  }

  if (props.error) {
    if (props.error.type.startsWith("@")) {
      errorSchema = getClsDefinitionModel(context, props.error as CMDClsSchemaBase) as CMDObjectSchemaBase;
    } else if (props.error.type !== "object") {
      return undefined;
    }
    errorSchema = props.error as CMDObjectSchemaBase;
  }

  const propKeys = new Set();
  for (const prop of errorSchema.props!) {
    propKeys.add(prop.name);
  }

  if (!(propKeys.has("code") && propKeys.has("message"))) {
    return undefined;
  }

  // difference update propKeys with ["code", "message", "target", "details", "innerError", "innererror"]
  for (const key of ["code", "message", "target", "details", "innerError", "innererror"]) {
    propKeys.delete(key);
  }

  if (propKeys.size === 0) {
    return "ODataV4Format";
  }
  if (propKeys.size === 1 && propKeys.has("additionalInfo")) {
    return "MgmtErrorFormat";
  }
  return undefined;
}

function getClsDefinitionModel(context: AAZOperationEmitterContext, schema: CMDClsSchemaBase): CMDSchemaBase {
  // TODO:
  return {
    type: "object",
  };
}