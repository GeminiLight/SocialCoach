'use client';
import {watched} from '@/lib/client-api';
import {taskLLM} from '@/lib/task-runtime';
import type { ModelIssue } from '@/lib/model-status';

class DinnerRequestError extends Error {
  constructor(message: string, public status: number, public modelIssue?: ModelIssue | null) { super(message); }
}
import { byokConfig } from '@/lib/byok';
import type { DinnerInput } from './director';
import { scenarios } from './content';
import { validateReply } from './engine';
import { pick } from '@/lib/i18n';

const offline = { zh: '看起来断网了，连上网络后再试。', en: 'You seem to be offline. Reconnect and try again.' };
const unavailable = { zh: '这一轮回复暂时没有生成，请重试。', en: 'This reply could not be generated. Please retry.' };

export async function directDinner(input: DinnerInput, signal: AbortSignal) {
  const own = byokConfig();
  return watched("dinner",!!own,input.lang, async () => {
  // Credentials travel directly to the chosen provider, just like the main app.
  if (own) {
    const [{runDinner},{makeByokLLM}]=await Promise.all([import('./director'),import('@/lib/llm-client')]);
    signal.throwIfAborted();
    return runDinner(input, taskLLM(makeByokLLM(own),"dinner",signal,undefined,input.lang), own.fastModel.trim(), signal);
  }
  const response = await fetch('/api/dinner/direct', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept-Language': input.lang },
    body: JSON.stringify(input), signal,
  }).catch(error => {
    if (signal.aborted) throw error;
    throw new DinnerRequestError(pick(offline, input.lang), 0, 'network');
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new DinnerRequestError(body.error || pick(unavailable, input.lang), response.status, body.modelIssue);
  }
  return validateReply(await response.json(), scenarios.find(s => s.id === input.scenarioId)!);
  });
}
