'use client';
import { withModelAccess } from '@/lib/model-access';
import type { ModelIssue } from '@/lib/model-status';

class DinnerRequestError extends Error {
  constructor(message: string, public status: number, public modelIssue?: ModelIssue | null) { super(message); }
}
import { byokConfig } from '@/lib/byok';
import { makeByokLLM } from '@/lib/llm-client';
import { runDinner, type DinnerInput } from './director';
import { scenarios } from './content';
import { validateReply } from './engine';

export async function directDinner(input: DinnerInput, signal: AbortSignal) {
  const own = byokConfig();
  return withModelAccess(input.lang, async () => {
  // Credentials travel directly to the chosen provider, just like the main app.
  if (own) return runDinner(input, makeByokLLM(own), own.fastModel.trim(), signal);
  const response = await fetch('/api/dinner/direct', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input), signal,
  }).catch(error => {
    if (signal.aborted) throw error;
    throw new DinnerRequestError('Connection failed', 0, 'network');
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new DinnerRequestError(body.error || 'Reply unavailable', response.status, body.modelIssue);
  }
  return validateReply(await response.json(), scenarios.find(s => s.id === input.scenarioId)!);
  });
}
