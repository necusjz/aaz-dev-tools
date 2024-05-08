import { Program } from "@typespec/compiler";
import { HttpOperation, isSharedRoute } from "@typespec/http";


function getPathWithoutQuery(path: string): string {
    // strip everything from the key including and after the ?
    return path.replace(/\/?\?.*/, "");
}


const URL_PARAMETER_PLACEHOLDER = "{}";

// function swaggerResourcePathToResourceIdTemplate(path: string): string {
//     const pathParts = path.split("?", 2);
//     const urlParts = pathParts[0].split("/");
//     let idx = 1;
//     while (idx < urlParts.length) {
//         if (idx === 1 && /^\{[^{}]*\}$/.test(urlParts[idx])) {
//             // ignore to the parameter name in first part of url, such as `/{parameter}` or `/{parameter}/...`
//             // But the placeholder in first part like `/indexes('{indexname}')` will be processed
//             idx++;
//             continue;
//         }
//         urlParts[idx] = urlParts[idx].replace(/\{[^{}]*\}/g, URL_PARAMETER_PLACEHOLDER);
//         idx++;
//     }
//     pathParts[0] = urlParts.join("/");
//     return pathParts.join("?");
// }

function swaggerResourcePathToResourceId(path: string): string {
    const pathParts = path.split("?", 2);
    const urlParts = pathParts[0].split("/");
    let idx = 1;
    while (idx < urlParts.length) {
        if (idx === 1 && /^\{[^{}]*\}$/.test(urlParts[idx])) {
            idx++;
            continue;
        }
        urlParts[idx] = urlParts[idx].replace(/\{[^{}]*\}/g, URL_PARAMETER_PLACEHOLDER);
        idx++;
    }
    pathParts[0] = urlParts.join("/").toLowerCase();
    return pathParts.join("?");
}


export function getResourceID(program: Program, operation: HttpOperation): string {
    const { operation: op } = operation;
    let { path: fullPath } = operation;
    if (!isSharedRoute(program, op)) {
        fullPath = getPathWithoutQuery(fullPath);
    }
    return swaggerResourcePathToResourceId(fullPath);
}

