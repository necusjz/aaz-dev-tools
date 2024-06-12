import { CMDVariantField } from "./_fields.js"

export interface CMDSchemaBase {
  readOnly?: boolean;
  frozen?: boolean;   // python set?
  const?: boolean;
  default?: "string" | "number" | "integer" | "boolean" | "array" | "object";
  nullable?: boolean;
}

export interface CMDSchema extends CMDSchemaBase {
  name: string;
  arg?: CMDVariantField;
  required?: boolean;
  description?: string;
  skipUrlEncoding?: boolean;
  secret?: boolean;
}
