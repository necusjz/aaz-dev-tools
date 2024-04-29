import { createTypeSpecLibrary } from "@typespec/compiler";

export const $lib = createTypeSpecLibrary({
  name: "typespec-aaz",
  diagnostics: {},
});

export const { reportDiagnostic, createDiagnostic } = $lib;
