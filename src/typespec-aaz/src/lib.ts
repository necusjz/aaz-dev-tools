import { JSONSchemaType, createTypeSpecLibrary } from "@typespec/compiler";

export interface AAZEmitterOptions {
  "operation": "list-resources" | "get-resources-operations";
  "api-version"?: string;
  "resources"?: string[];
}

const EmitterOptionsSchema: JSONSchemaType<AAZEmitterOptions> = {
  type: "object",
  additionalProperties: true,
  properties: {
    operation: {
      type: "string",
      enum: ["list-resources", "get-resources-operations"],
    },
    "api-version": {
      type: "string",
      nullable: true,
    },
    resources: {
      type: "array",
      items: {
        type: "string",
      },
      nullable: true,
    },
  },
  required: ["operation"],
}

const libDef = {
  name: "@azure-tools/typespec-aaz",
  diagnostics: {},
  emitter: {
    options: EmitterOptionsSchema as JSONSchemaType<AAZEmitterOptions>,
  }
} as const;

export const $lib = createTypeSpecLibrary(libDef);
export const { reportDiagnostic, createStateSymbol, getTracer } = $lib;
