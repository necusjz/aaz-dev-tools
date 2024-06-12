import { CMDSchema } from "./_schema.js";
import { CMDHttpRequestBody } from "./_http_request_body.js";
import { CMDHttpResponseBody } from "./_http_response_body.js";
import { CMDVariantField } from "./_fields.js";

export type CMDHttpAction = {
  path: string;
  request?: CMDHttpRequest;
  response?: CMDHttpResponse[];
}

export type CMDHttpRequest = {
  method: "get" | "put" | "post" | "delete" | "options" | "head" | "patch";
  path: CMDHttpRequestArgs;
  query: CMDHttpRequestArgs;
  header: CMDHttpRequestHeader;
  body: CMDHttpRequestBody;
}

export type CMDHttpResponse = {
  statusCode?: number[];
  isError?: boolean;
  description?: string;
  header?: CMDHttpResponseHeader;
  body?: CMDHttpResponseBody;
}

export interface CMDHttpRequestArgs {
  params: CMDSchema[];
  consts: CMDSchema[];
}

export interface CMDHttpRequestHeader extends CMDHttpRequestArgs {
  clientRequestId?: string;
}

export type CMDHttpResponseHeader = {
  items: CMDHttpResponseHeaderItem[]
}

export type CMDHttpResponseHeaderItem = {
  name: string;
  var?: CMDVariantField;
}
