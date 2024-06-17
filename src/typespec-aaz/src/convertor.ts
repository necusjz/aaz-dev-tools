import { HttpOperation } from "@typespec/http";
import { AAZEmitterContext, AAZOperationEmitterContext } from "./context.js";
import { resolveOperationId } from "./utils.js";
import { TypeSpecPathItem } from "./model/path_item.js";
import { CMDHttpOperation } from "./model/operation.js";
import { Model, Program, getDoc } from "@typespec/compiler";
import { PagedResultMetadata, getLroMetadata, getPagedResult } from "@azure-tools/typespec-azure-core";
import { XmsPageable } from "./model/x_ms_pageable.js";
import { MutabilityEnum } from "./model/fields.js";
import { CMDHttpRequest, CMDHttpResponse } from "./model/http.js";


export function retrieveAAZOperation(context: AAZEmitterContext, operation: HttpOperation, pathItem: TypeSpecPathItem | undefined): TypeSpecPathItem {
    if (!pathItem) {
        pathItem = {};
    }
    
    const verb = operation.verb;
    const opId = resolveOperationId(context, operation);
    if (!pathItem[verb]) {
        pathItem[verb] = {}
    }
    pathItem[verb]!.operationId = opId;
    pathItem[verb]!.pageable = extractPagedMetadata(context.program, operation);

    if (verb === 'get') {
        pathItem[verb]!.read = convert2CMDOperation({
            ...context,
            operationId: opId,
            mutability: MutabilityEnum.Read,
        }, operation);
    } else if (verb === 'head') {
        pathItem[verb]!.read = convert2CMDOperation({
            ...context,
            operationId: opId,
            mutability: MutabilityEnum.Read,
        }, operation);
    } else if (verb === 'delete') {
        pathItem[verb]!.create = convert2CMDOperation({
            ...context,
            operationId: opId,
            mutability: MutabilityEnum.Create,
        }, operation);
    } else if (verb === 'post') {
        pathItem[verb]!.create = convert2CMDOperation({
            ...context,
            operationId: opId,
            mutability: MutabilityEnum.Create,
        }, operation);
    
    } else if (verb === 'put') {
        pathItem[verb]!.create = convert2CMDOperation({
            ...context,
            operationId: opId,
            mutability: MutabilityEnum.Create,
        }, operation);
        pathItem[verb]!.update = convert2CMDOperation({
            ...context,
            operationId: opId,
            mutability: MutabilityEnum.Update,
        }, operation);
    } else if (verb === 'patch') {
        pathItem[verb]!.update = convert2CMDOperation({
            ...context,
            operationId: opId,
            mutability: MutabilityEnum.Update,
        }, operation);
    } else {
        console.log(" verb not expected: ", verb)
    }
    return pathItem;
}

// function retrieveHostParameters(context: AAZEmitterContext) {
//     // TODO: resolve host parameters
//     // return context.sdkContext.host;
// }

function parseNextLinkName(paged: PagedResultMetadata): string | undefined {
    const pathComponents = paged.nextLinkSegments;
    if (pathComponents) {
        return pathComponents[pathComponents.length - 1];
    }
    return undefined;
}

function extractPagedMetadataNested(
    program: Program,
    type: Model
): PagedResultMetadata | undefined {
    // This only works for `is Page<T>` not `extends Page<T>`.
    let paged = getPagedResult(program, type);
    if (paged) {
        return paged;
    }
    if (type.baseModel) {
        paged = getPagedResult(program, type.baseModel);
    }
    if (paged) {
        return paged;
    }
    const templateArguments = type.templateMapper;
    if (templateArguments) {
        for (const argument of templateArguments.args) {
            const modelArgument = argument as Model;
            if (modelArgument) {
                paged = extractPagedMetadataNested(program, modelArgument);
                if (paged) {
                    return paged;
                }
            }
        }
    }
    return paged;
}

function extractPagedMetadata(program: Program, operation: HttpOperation): XmsPageable | undefined{
    for (const response of operation.responses) {
        const paged = extractPagedMetadataNested(program, response.type as Model);
        if (paged) {
            let nextLinkName = parseNextLinkName(paged);
            if (!nextLinkName) {
                nextLinkName = 'nextLink';
            }
            return {
                nextLinkName,
            };
        }
    }
}

function convert2CMDOperation(context: AAZOperationEmitterContext, operation: HttpOperation): CMDHttpOperation {
    // TODO: resolve host parameters for the operation

    const op: CMDHttpOperation = {
        operationId: context.operationId,
        description: getDoc(context.program, operation.operation),
        http: {
            path: getPathWithoutQuery(operation.path),
        }
    };

    const lroMetadata = getLroMetadata(context.program, operation.operation);
    if (lroMetadata !== undefined && operation.verb !== "get") {
        op.longRunning = {
            finalStateVia: lroMetadata.finalStateVia,
        }
        // TODO: add support for custom polling information
    }

    op.http.request = retrieveHttpRequest(context, operation);
    op.http.responses = retrieveHttpResponses(context, operation);
    if (lroMetadata !== undefined && lroMetadata.logicalResult) {
        // TODO: add logicalResult in responses
    }
    return op;
}

function retrieveHttpRequest(context: AAZOperationEmitterContext, operation: HttpOperation): CMDHttpRequest | undefined {
    // TODO:
    return undefined;
}

function retrieveHttpResponses(context: AAZOperationEmitterContext, operation: HttpOperation): CMDHttpResponse[] | undefined {
    // TODO:
    return undefined
}

function getPathWithoutQuery(path: string): string {
    // strip everything from the key including and after the ?
    return path.replace(/\/?\?.*/, "");
  }

