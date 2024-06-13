import { CMDSchema, CMDSchemaBase } from "./_schema.js"
import { CMDVariantField } from "./_fields.js";

export type CMDRequestJson = {
  ref?: CMDVariantField;
  schema?: CMDSchema;
}

export type CMDResponseJson = {
  var?: CMDVariantField;
  schema: CMDSchemaBase;
}
