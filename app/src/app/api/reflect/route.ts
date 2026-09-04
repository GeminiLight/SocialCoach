import { FAST_MODEL, serverLLM } from "@/lib/llm";
import { runReflect } from "@/lib/tasks/reflect";
import type { ReflectInput } from "@/lib/tasks/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { asLang, fail, taskStream } from "@/lib/api-utils";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    checkRateLimit(req);
    const body = (await req.json()) as ReflectInput & { lang: string };
    const input = { ...body, lang: asLang(body.lang) };
    return taskStream((onDelta) => runReflect(input, serverLLM, FAST_MODEL, onDelta));
  } catch (e) {
    return fail(e);
  }
}
