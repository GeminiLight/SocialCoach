import {readTaskBody,TaskInputSchemas} from "@/lib/task-input";
import {taskLLM} from "@/lib/task-runtime";
import { SMART_MODEL, serverLLM } from "@/lib/llm";
import { runAssess } from "@/lib/tasks/assess";
import { checkRateLimit } from "@/lib/rate-limit";
import { fail, taskStream } from "@/lib/api-utils";

export const maxDuration = 180;

/**
 * Emits only the evidence-validated report, then appends "\n@@final\n<sanitized report json>" as the
 * authoritative result.
 */
export async function POST(req: Request) {
  try {
    checkRateLimit(req);
    const body = await readTaskBody(req,TaskInputSchemas["assess"]);
    const input = body;
    return taskStream((onDelta,signal) => runAssess(input, taskLLM(serverLLM,"assess",signal,event=>console.info("[model_task]",event),body.lang), SMART_MODEL, onDelta,req.signal), { final: true,signal:req.signal });
  } catch (e) {
    return fail(e);
  }
}
