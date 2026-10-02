/** Opt-in synthetic real-model smoke: LIVE_ASSISTANT_URL=http://localhost:3102 npx tsx scripts/check-debrief-assistant-live.ts */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fixtureSession } from "./check-debrief-assistant";
import { buildDebriefInput } from "../src/lib/debrief-chat";
import { hasQuote } from "../src/lib/practice-policy";
import type { DebriefReply } from "../src/lib/types";

async function main() {
  const base = process.env.LIVE_ASSISTANT_URL;
  assert(base && ["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Explicit local endpoint required; uses synthetic records only");
  const session = fixtureSession();
  const results: unknown[] = [];
  for (const [lang, question] of [
    ["zh", "复盘说到自我暴露，我不熟悉这个概念。能解释一下，在这次聊天里我具体该怎么用吗？"],
    ["zh", "如果对方只回了一个词，还需要继续分享吗？我担心显得话太多。"],
    ["en", "Does my wording prove that I am introverted? Please explain what we can and cannot conclude from this practice."],
  ] as const) {
    const started = Date.now();
    const input = buildDebriefInput(session, question, lang);
    const response: Response = await fetch(`${base}/api/debrief-chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(60_000) });
    const reply = await response.json() as DebriefReply;
    assert.equal(response.status, 200, JSON.stringify(reply));
    assert(hasQuote(reply.evidence, session.messages.filter(m => m.role === "learner").map(m => m.text)));
    assert(!JSON.stringify(reply).includes("PRIVATE_"));
    if (!session.debriefChat?.length) assert(reply.sources.some(s => s.id === "aron-self-disclosure"), "Concept explanation should cite its supplied source");
    session.debriefChat = [...(session.debriefChat ?? []), { id: String(results.length), question, reply, at: Date.now() }];
    results.push({ lang, question, ms: Date.now() - started, history: input.history.length, reply });
    console.log(`PASS live ${lang} question ${results.length}: ${Date.now() - started}ms, ${reply.sources.length} sources`);
  }
  const invalid = await fetch(`${base}/api/debrief-chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"lang":"zh","question":""}' });
  assert.equal(invalid.status, 400);
  const path = process.env.LIVE_ASSISTANT_ARTIFACT ?? "/tmp/socialcoach-debrief-live.json";
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ at: new Date().toISOString(), syntheticOnly: true, results, invalidInputStatus: invalid.status }, null, 2));
  console.log(`Live evidence: ${path}`);
}
void main();
