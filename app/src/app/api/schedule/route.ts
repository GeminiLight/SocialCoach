import { NextResponse } from "next/server";
import { FAST_MODEL, serverLLM } from "@/lib/llm";
import { runSchedule } from "@/lib/tasks/schedule";
import type { ScheduleInput } from "@/lib/tasks/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { asLang, fail } from "@/lib/api-utils";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    checkRateLimit(req);
    const body = (await req.json()) as ScheduleInput & { lang: string };
    const out = await runSchedule({ ...body, lang: asLang(body.lang) }, serverLLM, FAST_MODEL);
    return NextResponse.json(out);
  } catch (e) {
    return fail(e);
  }
}
