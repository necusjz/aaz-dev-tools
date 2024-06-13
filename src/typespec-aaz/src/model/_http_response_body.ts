import { CMDResponseJson } from "./_content.js"

export interface CMDHttpResponseBody {}
export interface CMDHttpResponseJsonBody extends CMDHttpResponseBody {
  json?: CMDResponseJson;
}
