import {readTaskBody} from "@/lib/task-input";
import {taskLLM} from "@/lib/task-runtime";
import { FAST_MODEL, serverLLM, LLMError, hasServerCredential,serverRequiresByok } from '@/lib/llm';
import { checkRateLimit } from '@/lib/rate-limit';
import { pick } from '@/lib/i18n';
import { fail } from '@/lib/api-utils';
import { DinnerInputSchema,parseDinnerInput, runDinner } from '@/features/dinner/lib/director';

export const runtime = 'nodejs';
export const maxDuration = 40;

export async function POST(req: Request) {
  try {
    const body = parseDinnerInput(await readTaskBody(req,DinnerInputSchema));
    if (!hasServerCredential() || serverRequiresByok()) throw new LLMError(pick({zh:'请先在 SocialCoach 的模型设置中接入自己的模型。',en:'Connect your model in SocialCoach settings to continue.'},body.lang), 503, false, 'setup');
    checkRateLimit(req);
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(30_000)]);
    const reply = await runDinner(body, taskLLM(serverLLM,"dinner",signal,event=>console.info("[model_task]",event),body.lang), FAST_MODEL, signal);
    return Response.json(reply, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return fail(e); }
}
