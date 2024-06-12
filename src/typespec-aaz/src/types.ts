import { Program, Type } from "@typespec/compiler";
import { HttpStatusCodeRange } from "@typespec/http";

export interface AAZListResourcesContext {
    program: Program;

}

export interface AAZRetrieveOperationContext {
    program: Program;
    
}

export enum CMDBuildInVariants {
  Instance = "$Instance",
  EndpointInstance = "$EndpointInstance",
  Subresource = "$Subresource",
  Endpoint = "$Endpoint",
}


export type HttpMethod = "get" | "put" | "post" | "delete" | "head" | "patch";

export enum MutabilityEnum {
  Create = "create",
  Read = "read",
  Update = "update",
}

export interface AAZResourceEmitterSchema {

  /** The available paths and operations for typespec resource */
  pathItem?: AAZTspPathItem;
  id: string;
  version?: string;
}

export type AAZTspPathItem = {
  [method in HttpMethod]?: AAZTspOperation;
} & {  traces?: string[]  }

export type AAZTspOperation = {
  operationId?: string;

  isPageable?: boolean;
  read?: AAZTspHttpOperation;
  create?: AAZTspHttpOperation;
  update?: AAZTspHttpOperation;
};

export type AAZTspVariantField = {
  value: string;
  format: '[$@][a-zA-Z0-9_\[\]\{\}\.]+'
}

export type AAZTspHttpOperation = {
  when?: AAZTspVariantField[];
  longRunning?:AAZTspHttpOperationLongRunning;
  // required
  operationId: string;
  description?: string;
  // required
  http: AAZTspHttpAction;
}

export type AAZTspHttpOperationLongRunning = {
  // "azure-async-operation" | "location" | "original-uri"
  finalStateVia?: string;
}

export type AAZTspHttpAction = {
  path: string;
  request?: AAZTspHttpRequest;
  response?: AAZTspHttpResponse[];
}

export type AAZTspHttpRequest = {
  method: "get" | "put" | "post" | "delete" | "options" | "head" | "patch";
  path: AAZTspHttpRequestArgs;
  query: AAZTspHttpRequestArgs;
  header: AAZTspHttpRequestHeader;
  body: AAZTspHttpRequestBody;
}

export type AAZTspHttpResponse = {
  statusCode?: number[];
  isError?: boolean;
  description?: string;
  header?: AAZTspHttpResponseHeader;
  body?: AAZTspHttpResponseBody;
}


export type AAZTspHttpRequestArgs = {
  params: AAZTspSchema[];
  consts: AAZTspSchema[];
}

export type AAZTspHttpRequestHeader = AAZTspHttpRequestArgs & {
  clientRequestId?: string;
}

export type AAZTspHttpRequestBody = {
  json?: AAZTspRequestJson;
}

export type AAZTspRequestJson = {
  ref?: string;
  schema?: AAZTspSchema;
}

export type AAZTspSchemaBase = {
  readOnly?: boolean;
  frozen?: boolean;   // python set?
  const?: boolean;
  default?: "string" | "number" | "integer" | "boolean" | "array" | "object";
  nullable?: boolean;
}

export type AAZTspSchema = AAZTspSchemaBase & {
  name: string;
  arg?: AAZTspVariantField;
  required?: boolean;
  description?: string;
  skipUrlEncoding?: boolean;
  secret?: boolean;
}

export type AAZTspHttpResponseHeader = {
  items: AAZTspHttpResponseHeaderItem[]
}

export type AAZTspHttpResponseHeaderItem = {
  name: string;
  var?: AAZTspVariantField;
}

export type AAZTspHttpResponseBody = {
  json?: AAZTspResponseJson;
}

export type AAZTspResponseJson = {
  var?: AAZTspVariantField;
  schema: AAZTspSchemaBase;
}
