import { NextResponse } from "next/server";
import { FAST_MODEL, serverLLM } from "@/lib/llm";
import { runRehearse } from "@/lib/tasks/rehearse";
import type { RehearseInput } from "@/lib/tasks/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { asLang, fail } from "@/lib/api-utils";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    checkRateLimit(req);
    const body = (await req.json()) as RehearseInput & { lang: string };
    return NextResponse.json(await runRehearse({ ...body, lang: asLang(body.lang) }, serverLLM, FAST_MODEL));
  } catch (e) {
    return fail(e);
  }
}
