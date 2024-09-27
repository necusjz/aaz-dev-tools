import {
    CompilerHost,
    // CompilerOptions,
    LinterDefinition,
    NodePackage,
    TypeSpecLibrary,
} from "@typespec/compiler";

export interface TspLibrary {
    name: string;
    packageJson: NodePackage;
    isEmitter: boolean;
    definition?: TypeSpecLibrary<any>;
    linter?: LinterDefinition;
}

export interface BrowserHost extends CompilerHost {
    compiler: typeof import("@typespec/compiler");
    libraries: Record<string, TspLibrary>;
}
