import {readTaskBody,TaskInputSchemas} from "@/lib/task-input";
import {taskLLM} from "@/lib/task-runtime";
import { SMART_MODEL, serverLLM,toHttpError } from "@/lib/llm";
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
    return taskStream(async(onDelta,signal) => {
      const started=Date.now();
      try{
        const report=await runAssess(input,taskLLM(serverLLM,'assess',signal,event=>console.info('[model_task]',{...event,requestId:body.requestId}),body.lang),SMART_MODEL,onDelta,signal);
        console.info('[assessment_completed]',{requestId:body.requestId,durationMs:Date.now()-started});
        return report;
      }catch(error){
        if(!signal.aborted){const {status,modelIssue}=toHttpError(error);console.warn('[assessment_failed]',{requestId:body.requestId,status,modelIssue:modelIssue??'task_error',durationMs:Date.now()-started});}
        throw error;
      }
    }, { final: true,signal:req.signal,heartbeat:true });
  } catch (e) {
    return fail(e);
  }
}
