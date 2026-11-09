import {readTaskBody,TaskInputSchemas} from "@/lib/task-input";
import {taskLLM} from "@/lib/task-runtime";
import { NextResponse } from "next/server";
import { FAST_MODEL, serverLLM } from "@/lib/llm";
import { runSchedule } from "@/lib/tasks/schedule";
import { checkRateLimit } from "@/lib/rate-limit";
import { fail } from "@/lib/api-utils";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = await readTaskBody(req,TaskInputSchemas["schedule"]);
    checkRateLimit(req);
    const out = await runSchedule(body, taskLLM(serverLLM,"schedule",req.signal,event=>console.info("[model_task]",event),body.lang), FAST_MODEL);
    return NextResponse.json(out);
  } catch (e) {
    return fail(e);
  }
}
