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
  path: CMDHttpRequestPath;
  query: CMDHttpRequestQuery;
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

type CMDHttpRequestArgs = {
  params: CMDSchema[];
  consts: CMDSchema[];
};

export type CMDHttpRequestPath = CMDHttpRequestArgs;

export type CMDHttpRequestQuery = CMDHttpRequestArgs;

export type CMDHttpRequestHeader = CMDHttpRequestArgs & {
  clientRequestId?: string;
};

export type CMDHttpResponseHeader = {
  items: CMDHttpResponseHeaderItem[]
}

export type CMDHttpResponseHeaderItem = {
  name: string;
  var?: CMDVariantField;
}
