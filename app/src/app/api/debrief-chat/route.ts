import {taskLLM} from "@/lib/task-runtime";
import {readTaskBody} from "@/lib/task-input";
import {debriefInputSchema} from "@/lib/debrief-chat";
import { FAST_MODEL, serverLLM } from "@/lib/llm";
import { runDebriefChat } from "@/lib/tasks/debrief-chat";
import { checkRateLimit } from "@/lib/rate-limit";
import { fail } from "@/lib/api-utils";

export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    checkRateLimit(req);
    const body=await readTaskBody(req,debriefInputSchema);
    const reply=await runDebriefChat(body,taskLLM(serverLLM,'debrief-chat',req.signal,event=>console.info("[model_task]",event),body.lang),FAST_MODEL,req.signal);
    return Response.json(reply);
  } catch (e) { return fail(e); }
}
