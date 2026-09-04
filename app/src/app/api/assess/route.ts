import { SMART_MODEL, serverLLM } from "@/lib/llm";
import { runAssess } from "@/lib/tasks/assess";
import type { AssessInput } from "@/lib/tasks/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { asLang, fail, taskStream } from "@/lib/api-utils";

export const maxDuration = 180;

/**
 * Streams the tutor's raw output so the client can render sections as they are
 * written, then appends "\n@@final\n<sanitized report json>" as the
 * authoritative result.
 */
export async function POST(req: Request) {
  try {
    checkRateLimit(req);
    const body = (await req.json()) as AssessInput & { lang: string };
    const input = { ...body, lang: asLang(body.lang) };
    return taskStream((onDelta) => runAssess(input, serverLLM, SMART_MODEL, onDelta), { final: true });
  } catch (e) {
    return fail(e);
  }
}
