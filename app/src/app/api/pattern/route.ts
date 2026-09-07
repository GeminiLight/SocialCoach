import { NextResponse } from "next/server";
import { SMART_MODEL, serverLLM } from "@/lib/llm";
import { runPattern } from "@/lib/tasks/pattern";
import type { PatternInput } from "@/lib/tasks/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { asLang, fail } from "@/lib/api-utils";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    checkRateLimit(req);
    const body = (await req.json()) as PatternInput & { lang: string };
    return NextResponse.json(await runPattern({ ...body, lang: asLang(body.lang) }, serverLLM, SMART_MODEL));
  } catch (e) {
    return fail(e);
  }
}
