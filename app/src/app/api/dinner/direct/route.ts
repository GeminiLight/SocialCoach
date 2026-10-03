import { FAST_MODEL, serverLLM, LLMError, hasServerCredential } from '@/lib/llm';
import { checkRateLimit } from '@/lib/rate-limit';
import { pick } from '@/lib/i18n';
import { fail } from '@/lib/api-utils';
import { parseDinnerInput, runDinner } from '@/features/dinner/lib/director';

export const runtime = 'nodejs';
export const maxDuration = 40;

export async function POST(req: Request) {
  const lang=req.headers.get('accept-language')?.startsWith('en')?'en':'zh';
  const tooLarge=pick({zh:'这次饭局资料过长，暂时无法提交。',en:'The dinner context is too long to submit.'},lang);
  try {
    if (Number(req.headers.get('content-length')) > 196_608) throw new LLMError(tooLarge, 413);
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 196_608) throw new LLMError(tooLarge, 413);
    let input: unknown;
    try { input = JSON.parse(raw); } catch { throw new LLMError(pick({zh:'提交内容无法读取，请再试一次。',en:'The submission could not be read. Please try again.'},lang), 400); }
    const body = parseDinnerInput(input);
    if (!hasServerCredential() || ['1','true'].includes(process.env.LLM_REQUIRE_BYOK ?? '')) throw new LLMError(pick({zh:'请先在 SocialCoach 的模型设置中接入自己的模型。',en:'Connect your model in SocialCoach settings to continue.'},body.lang), 503, false, 'setup');
    checkRateLimit(req);
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(30_000)]);
    const reply = await runDinner(body, serverLLM, FAST_MODEL, signal);
    return Response.json(reply, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return fail(e); }
}
