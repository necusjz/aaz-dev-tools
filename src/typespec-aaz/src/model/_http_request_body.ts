import { CMDRequestJson } from "./_content.js"

export interface CMDHttpRequestBody {}

export interface CMDHttpRequestJsonBody extends CMDHttpRequestBody{
  json?: CMDRequestJson;
}
