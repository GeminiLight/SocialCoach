import { NextResponse } from "next/server";
import { FAST_MODEL, serverLLM } from "@/lib/llm";
import { runHint } from "@/lib/tasks/hint";
import type { TurnInput } from "@/lib/tasks/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { asLang, fail } from "@/lib/api-utils";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    checkRateLimit(req);
    const body = (await req.json()) as TurnInput & { lang: string };
    return NextResponse.json(await runHint({ ...body, lang: asLang(body.lang) }, serverLLM, FAST_MODEL));
  } catch (e) {
    return fail(e);
  }
}
