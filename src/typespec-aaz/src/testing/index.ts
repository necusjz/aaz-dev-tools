import { resolvePath } from "@typespec/compiler";
import { createTestLibrary, TypeSpecTestLibrary } from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const TypespecAazTestLibrary: TypeSpecTestLibrary = createTestLibrary({
  name: "@azure-tools/typespec-aaz",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../../../"),
});
