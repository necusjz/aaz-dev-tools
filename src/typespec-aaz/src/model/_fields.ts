
export type CMDVariantField = {
  value: string;
  format: '[$@][a-zA-Z0-9_\[\]\{\}\.]+'
}

export enum MutabilityEnum {
  Create = "create",
  Read = "read",
  Update = "update",
}
