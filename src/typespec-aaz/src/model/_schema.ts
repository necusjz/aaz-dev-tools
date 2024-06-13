import { CMDVariantField } from "./_fields.js"
import { CMDArrayFormat, CMDFloatFormat, CMDIntegerFormat, CMDObjectFormat, CMDResourceIdFormat, CMDStringFormat } from "./_format.js";


export type CMDSchemaDefault<T> = {
  value: T | null;
}

export type CMDSchemaEnumItem<T> = {
  value: T;
  arg?: CMDVariantField;
}

export type CMDSchemaEnum<T> = {
  items: CMDSchemaEnumItem<T>[];
}

export interface CMDSchemaBase {
  type: string;

  readOnly?: boolean;
  frozen?: boolean;   // python set?
  const?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default?: CMDSchemaDefault<any>;
  nullable?: boolean;
}

export interface CMDSchemaBaseT<T> extends CMDSchemaBase {
  default?: CMDSchemaDefault<T>;
}

export interface CMDSchema extends CMDSchemaBase {
  name: string;
  arg?: CMDVariantField;
  required?: boolean;
  description?: string;
  skipUrlEncoding?: boolean;
  secret?: boolean;
}

export interface CMDSchemaT<T> extends CMDSchema {
  default?: CMDSchemaDefault<T>;
}

export interface CMDClsSchemaBase extends CMDSchemaBase {

}

export interface CMDClsSchema extends CMDClsSchemaBase, CMDSchema {
  clientFlatten?: boolean;
}

export interface CMDStringSchemaBase extends CMDSchemaBaseT<string> {
  format?: CMDStringFormat;
  enum?: CMDSchemaEnum<string>;
}

export interface CMDStringSchema extends CMDStringSchemaBase, CMDSchemaT<string> {
}

// type: byte
export interface CMDByteSchemaBase extends CMDStringSchemaBase {}

export interface CMDByteSchema extends CMDByteSchemaBase, CMDStringSchema {}

// type: binary
export interface CMDBinarySchemaBase extends CMDStringSchemaBase {}

export interface CMDBinarySchema extends CMDBinarySchemaBase, CMDStringSchema {}

// type: duration
export interface CMDDurationSchemaBase extends CMDStringSchemaBase {}

export interface CMDDurationSchema extends CMDDurationSchemaBase, CMDStringSchema {}

// type: date  As defined by full-date - https://xml2rfc.tools.ietf.org/public/rfc/html/rfc3339.html#anchor14
export interface CMDDateSchemaBase extends CMDStringSchemaBase {}

export interface CMDDateSchema extends CMDDateSchemaBase, CMDStringSchema {}

// type: date-time  As defined by date-time - https://xml2rfc.tools.ietf.org/public/rfc/html/rfc3339.html#anchor14
export interface CMDDateTimeSchemaBase extends CMDStringSchemaBase {}

export interface CMDDateTimeSchema extends CMDDateTimeSchemaBase, CMDStringSchema {}

// type: time
export interface CMDTimeSchemaBase extends CMDStringSchemaBase {}

export interface CMDTimeSchema extends CMDTimeSchemaBase, CMDStringSchema {}

// type: uuid 
export interface CMDUuidSchemaBase extends CMDStringSchemaBase {}

export interface CMDUuidSchema extends CMDUuidSchemaBase, CMDStringSchema {}

// type: password
export interface CMDPasswordSchemaBase extends CMDStringSchemaBase {}

export interface CMDPasswordSchema extends CMDPasswordSchemaBase, CMDStringSchema {}

// type: ResourceLocation
export interface CMDResourceLocationSchemaBase extends CMDStringSchemaBase {}

export interface CMDResourceLocationSchema extends CMDResourceLocationSchemaBase, CMDStringSchema {}

// type: ResourceId
export interface CMDResourceIdSchemaBase extends CMDSchemaBaseT<string> {
  format?: CMDResourceIdFormat;
  enum?: CMDSchemaEnum<string>;
}

export interface CMDResourceIdSchema extends CMDResourceIdSchemaBase, CMDSchemaT<string> {}

// type: integer
export interface CMDIntegerSchemaBase extends CMDSchemaBaseT<number> {}

export interface CMDIntegerSchema extends CMDIntegerSchemaBase, CMDSchemaT<number> {
  format?: CMDIntegerFormat;
  enum?: CMDSchemaEnum<number>;
}

// type: integer32
export interface CMDInteger32SchemaBase extends CMDIntegerSchemaBase {}

export interface CMDInteger32Schema extends CMDInteger32SchemaBase, CMDIntegerSchema {}

// type: integer64
export interface CMDInteger64SchemaBase extends CMDIntegerSchemaBase {}

export interface CMDInteger64Schema extends CMDInteger64SchemaBase, CMDIntegerSchema {}

// type: boolean
export interface CMDBooleanSchemaBase extends CMDSchemaBaseT<boolean> {}

export interface CMDBooleanSchema extends CMDBooleanSchemaBase, CMDSchemaT<boolean> {}


// type: float
export interface CMDFloatSchemaBase extends CMDSchemaBaseT<number> {
  format?: CMDFloatFormat;
  enum?: CMDSchemaEnum<number>;
}

export interface CMDFloatSchema extends CMDFloatSchemaBase, CMDSchemaT<number> {}

// type: float32
export interface CMDFloat32SchemaBase extends CMDFloatSchemaBase {}

export interface CMDFloat32Schema extends CMDFloat32SchemaBase, CMDFloatSchema {}

// type: float64
export interface CMDFloat64SchemaBase extends CMDFloatSchemaBase {}

export interface CMDFloat64Schema extends CMDFloat64SchemaBase, CMDFloatSchema {}

// object

// discriminator

export type CMDObjectSchemaDiscriminator = {
  property: string,
  value: string,
  frozen?: boolean,

  props?: CMDSchema[],
  discriminators?: CMDObjectSchemaDiscriminator[],
};

// additionalProperties

export type CMDObjectSchemaAdditionalProperties = {
  readOnly?: boolean,
  frozen?: boolean,

  item?: CMDSchemaBase,
  anyType?: boolean,
}

export interface CMDObjectSchemaBase extends CMDSchemaBase {
  format?: CMDObjectFormat;
  props?: CMDSchema[];
  discriminators?: CMDObjectSchemaDiscriminator[];
  additionalProps?: CMDObjectSchemaAdditionalProperties;
  cls?: string;
}

export interface CMDObjectSchema extends CMDObjectSchemaBase, CMDSchema {
  clientFlatten?: boolean;
}


// type: IdentityObject
export interface CMDIdentityObjectSchemaBase extends CMDObjectSchemaBase {}

export interface CMDIdentityObjectSchema extends CMDIdentityObjectSchemaBase, CMDObjectSchema {}

// type: array
export interface CMDArraySchemaBase extends CMDSchemaBase {
  format?: CMDArrayFormat;
  item?: CMDSchemaBase;

  identifiers?: string[];

  cls?: string;
}

export interface CMDArraySchema extends CMDArraySchemaBase, CMDSchema {}
