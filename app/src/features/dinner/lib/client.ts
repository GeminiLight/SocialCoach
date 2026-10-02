'use client';
import { byokConfig } from '@/lib/byok';
import { makeByokLLM } from '@/lib/llm-client';
import { runDinner, type DinnerInput } from './director';
import { scenarios } from './content';
import { validateReply } from './engine';

export async function directDinner(input: DinnerInput, signal: AbortSignal) {
  const own = byokConfig();
  // Credentials travel directly to the chosen provider, just like the main app.
  if (own) return runDinner(input, makeByokLLM(own), own.fastModel.trim(), signal);
  const response = await fetch('/api/dinner/direct', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input), signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Reply unavailable');
  }
  return validateReply(await response.json(), scenarios.find(s => s.id === input.scenarioId)!);
}
