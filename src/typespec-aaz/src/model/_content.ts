import { CMDSchema } from "./_schema.js"
import { CMDVariantField } from "./_fields.js";

export type CMDRequestJson = {
  ref?: string;
  schema?: CMDSchema;
}

export type CMDResponseJson = {
  var?: CMDVariantField;
  schema: CMDSchema;
}
