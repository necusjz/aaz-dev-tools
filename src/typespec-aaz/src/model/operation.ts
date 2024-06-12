import { CMDVariantField } from "./_fields.js"
import { CMDHttpAction } from "./_http.js"

export type TypeSpecOperation = {
  operationId?: string;
  isPageable?: boolean;
  read?: CMDHttpOperation;
  create?: CMDHttpOperation;
  update?: CMDHttpOperation;
};

export interface CMDHttpOperation {
  when?: CMDVariantField[];
  longRunning?:CMDHttpOperationLongRunning;
  // required
  operationId: string;
  description?: string;
  // required
  http: CMDHttpAction;
}


export type CMDHttpOperationLongRunning = {
  // "azure-async-operation" | "location" | "original-uri"
  finalStateVia?: string;
}
