import { FAST_MODEL, serverLLM, LLMError } from "@/lib/llm";
import { runDebriefChat } from "@/lib/tasks/debrief-chat";
import type { DebriefChatInput } from "@/lib/debrief-chat";
import { checkRateLimit } from "@/lib/rate-limit";
import { fail } from "@/lib/api-utils";
import { pick } from "@/lib/i18n";

export const maxDuration = 60;
export async function POST(req: Request) {
  const lang = req.headers.get("accept-language")?.startsWith("en") ? "en" : "zh";
  const tooLarge = pick({ zh: "本次练习资料过长，暂时无法提交。", en: "The practice context is too long to submit." }, lang);
  try {
    checkRateLimit(req);
    if (Number(req.headers.get("content-length")) > 160_000) throw new LLMError(tooLarge, 413);
    const text = await req.text();
    if (new TextEncoder().encode(text).length > 160_000) throw new LLMError(tooLarge, 413);
    let body: DebriefChatInput;
    try { body = JSON.parse(text); } catch { throw new LLMError(pick({ zh: "提交资料无法读取，请重试。", en: "The submitted data could not be read. Please try again." }, lang), 400); }
    const reply = await runDebriefChat(body, serverLLM, FAST_MODEL);
    return Response.json(reply);
  } catch (e) { return fail(e); }
}
