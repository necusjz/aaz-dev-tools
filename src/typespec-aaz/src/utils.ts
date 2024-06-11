import { Program } from "@typespec/compiler";
import { HttpOperation, isSharedRoute, HttpOperationResponse, HttpOperationParameters, HttpOperationParameter, } from "@typespec/http";

import { RequestPathParamSchema, ResponseSchema, CMDBuildInVariants, RequestQueryParamConstSchema, } from "./types.js";

function getPathWithoutQuery(path: string): string {
    // strip everything from the key including and after the ?
    return path.replace(/\/?\?.*/, "");
}


const URL_PARAMETER_PLACEHOLDER = "{}";

// export function swaggerResourcePathToResourceIdTemplate(path: string): string {
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

export function swaggerResourcePathToResourceId(path: string): string {
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

export function getResourcePath(program: Program, operation: HttpOperation) {
    const { operation: op } = operation;
    let { path: fullPath } = operation;
    if (!isSharedRoute(program, op)) {
        fullPath = getPathWithoutQuery(fullPath);
    }
    return fullPath;
}


// export function getResourceID(program: Program, operation: HttpOperation): string {
//     const { operation: op } = operation;
//     let { path: fullPath } = operation;
//     if (!isSharedRoute(program, op)) {
//         fullPath = getPathWithoutQuery(fullPath);
//     }
//     return swaggerResourcePathToResourceId(fullPath);
// }

export function getQueryParamters(parameters: HttpOperationParameters) {
  const rt: RequestQueryParamConstSchema[] = [];
  parameters.parameters.forEach((param: HttpOperationParameter) => {
      if (param.type === "query") {
          const obj: RequestQueryParamConstSchema = {
              readOnly: false,
              const: false,
              default: {
                  value: param.param.default,
              },
              type: "string",
              name: param.name,
              required: param.param.optional,
          };
          rt.push(obj);
      }
  });
  return rt;
}

// TODO
export function getPathParamters(parameters: HttpOperationParameters) {
  const rt: RequestPathParamSchema[] = [];
  parameters.parameters.forEach((param: HttpOperationParameter) => {
      if (param.type === "path") {
          const obj: RequestPathParamSchema = {
              type: "string",
              name: param.name,
              arg: `$Path.${param.name}`,
              required: false,
              format: {
                  pattern: "",
                  maxLength: 0,
                  minLength: 1,
              },
          };
          rt.push(obj);
      }
  });
  return rt;
}

export function getResponse(response: HttpOperationResponse[]) {
  const rt: ResponseSchema[] = [];
  response.forEach((el) => {
      rt.push({
          statusCode: el.statusCodes,
          isError: false, // TODO
          body: {
              json: {
                  var: CMDBuildInVariants.Instance,
                  schema: {
                      type: "object",
                      name: "",
                  },
              },
          },
      });
  });
  return rt;
}
