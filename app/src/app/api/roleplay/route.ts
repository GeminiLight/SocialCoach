import { FAST_MODEL, serverLLM } from "@/lib/llm";
import { runRoleplay } from "@/lib/tasks/roleplay";
import type { TurnInput } from "@/lib/tasks/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { asLang, fail, taskStream } from "@/lib/api-utils";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    checkRateLimit(req);
    const body = (await req.json()) as TurnInput & { lang: string };
    const input = { ...body, lang: asLang(body.lang) };
    return taskStream((onDelta) => runRoleplay(input, serverLLM, FAST_MODEL, onDelta));
  } catch (e) {
    return fail(e);
  }
}
