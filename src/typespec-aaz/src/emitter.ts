import { EmitContext, emitFile, resolvePath } from "@typespec/compiler";
import { getTracer} from "./lib.js";

export async function $onEmit(context: EmitContext) {
  const tracer = getTracer(context.program);
  tracer.trace("aazOperation", "Hello World\n");
  if (context.options.operation === "list-resources") {
    await emitFile(context.program, {
      path: resolvePath(context.emitterOutputDir, "output.txt"),
      content: "List resources\n",
    });
    tracer.trace("aazOperation", "List resources");
  } else if (context.options.operation === "retrieve-operation") {
    await emitFile(context.program, {
      path: resolvePath(context.emitterOutputDir, "output.txt"),
      content: "Retrieve operation\n",
    });
    tracer.trace("aazOperation", "Retrieve operation");
  } 
}
