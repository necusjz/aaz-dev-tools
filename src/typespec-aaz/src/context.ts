import { SdkContext } from "@azure-tools/typespec-client-generator-core";
import { Program, Service } from "@typespec/compiler";
import { MutabilityEnum } from "./model/fields.js";
// import { HttpOperation } from "@typespec/http";
// import { TypeSpecPathItem } from "./model/path_item.js";

export interface AAZEmitterContext {
    readonly program: Program;
    readonly service: Service;
    readonly sdkContext: SdkContext;
    readonly apiVersion: string;
}

export interface AAZOperationEmitterContext extends AAZEmitterContext {
    readonly operationId: string;
    readonly mutability: MutabilityEnum;
    // operation: HttpOperation;
    // pathItem: TypeSpecPathItem;
}
