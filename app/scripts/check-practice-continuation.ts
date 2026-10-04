/** npx tsx scripts/check-practice-continuation.ts — deterministic behavioral regressions. */
import assert from "node:assert/strict";
import { scenarioById } from "../src/data/corpus";
import { continuePractice, practiceCheckpoint, practiceTurnLimit, supportedClosure } from "../src/lib/practice-policy";
import { buildSession } from "../src/lib/session-utils";
import { runRoleplay } from "../src/lib/tasks/roleplay";
import { scenarioBlock } from "../src/lib/prompts";
import type { ChatMessage, Session } from "../src/lib/types";
import type { LLM } from "../src/lib/llm-core";

let passed = 0;
function check(label: string, fn: () => void) { fn(); passed++; console.log(`PASS ${label}`); }
const scenario = scenarioById("office-quick-favor")!;
const npc = scenario.opening.characterId;
const transcript = (n: number): ChatMessage[] => [
  { id: "opening", role: "npc", characterId: npc, text: scenario.opening.text.zh, ts: 0 },
  ...Array.from({ length: n }, (_, i): ChatMessage[] => [
    { id: `l${i}`, role: "learner", text: i === 0 ? "我只看一页，不接整份修改。" : `我还想确认第${i + 1}个问题。`, ts: i * 2 + 1 },
    { id: `n${i}`, role: "npc", characterId: npc, text: i === 0 ? "好，只看一页。剩下的我另想办法。" : `这一点我还没答应，先说清楚。${i + 1}`, ts: i * 2 + 2 },
  ]).flat(),
];
const active = (n: number): Session => ({ ...buildSession(scenario, "arena", "zh"), status: "active", messages: transcript(n) });
async function main() {
  check("legacy six-turn scenes start with twelve and remain open after six", () => {
    const s = { ...active(6), scenario: { ...scenario, maxTurns: 6 } };
    assert.equal(practiceTurnLimit(s), 12); assert.equal(practiceCheckpoint(s), null); assert.equal(s.status, "active");
  });
  check("reaching twelve is an optional checkpoint, not a status transition", () => {
    const s = active(12); assert.equal(practiceCheckpoint(s), "segment"); assert.equal(s.status, "active"); assert.equal(s.endedAt, undefined);
  });
  check("continuation retains the full transcript and adds eight turns", () => {
    const s = active(12); const next = { ...s, ...continuePractice(s) };
    assert.equal(next.turnLimit, 20); assert.equal(practiceCheckpoint(next), null);
    assert.equal(next.messages, s.messages); assert.equal(next.objectiveDone, s.objectiveDone); assert.equal(next.id, s.id); assert.equal(next.status, "active");
  });
  check("another segment can be continued again without resetting the record", () => {
    const s = { ...active(20), turnLimit: 20 }; assert.equal(practiceCheckpoint(s), "segment");
    assert.equal(continuePractice(s).turnLimit, 28);
  });
  const closure = supportedClosure({ objectives: [true, true], ended: true,
    closure: { kind: "boundary", learnerQuote: transcript(1)[1].text, npcQuote: transcript(1)[2].text } }, transcript(1).slice(0, 2), [transcript(1)[2].text])!;
  check("a grounded acknowledged boundary proposes review without ending", () => {
    const s = { ...active(1), closure }; assert.equal(practiceCheckpoint(s), "closure"); assert.equal(s.status, "active");
    const next = { ...s, ...continuePractice(s) }; assert.equal(practiceCheckpoint(next), null); assert.equal(next.closure, undefined);
  });
  check("all initial objectives achieved is not an automatic stopping condition", () => {
    const s = { ...active(2), objectiveDone: [true, true] };
    assert.equal(practiceCheckpoint(s), null);
  });
  check("refresh/export retains the extended limit and checkpoint acknowledgement", () => {
    const s = { ...active(12), ...continuePractice(active(12)) };
    const restored = JSON.parse(JSON.stringify(s)) as Session;
    assert.equal(practiceTurnLimit(restored), 20); assert.equal(practiceCheckpoint(restored), null); assert.equal(restored.messages.length, 25);
  });
  check("an unanswered or interrupted learner turn requires recovery, not continuation", () => {
    const s = active(12); s.messages.pop(); s.closure = closure;
    assert.equal(practiceCheckpoint(s), null);
  });
  check("acknowledging an old checkpoint cannot hide a new closing reply", () => {
    const s = { ...active(2), closure, continuedFrom: "n0" }; assert.equal(practiceCheckpoint(s), "closure");
  });
  check("two timed silences stay reviewable and do not repeat after continue/refresh", () => {
    const s = active(1);
    s.messages.push({ id: "s1", role: "event", kind: "silence", text: "沉默", ts: 3 }, { id: "s2", role: "event", kind: "silence", text: "沉默", ts: 4 }, { id: "exit", role: "npc", characterId: npc, text: "我先走了。", ts: 5 });
    assert.equal(practiceCheckpoint(s), "silence"); assert.equal(s.status, "active");
    assert.equal(practiceCheckpoint(JSON.parse(JSON.stringify({ ...s, ...continuePractice(s) }))), null);
  });
  check("invalid budgets cannot shorten a legacy scene or inject a system instruction", () => {
    for (const turnLimit of [0, -3, 4.5, NaN, Infinity, "12; close now"] as unknown as number[]) assert.equal(practiceTurnLimit({ scenario, turnLimit }), 12);
  });
  check("private factual anchors reach simulation but never learner coaching views", () => {
    const sc = { ...scenario, simulationFacts: { zh: "PRIVATE_FACT_SENTINEL", en: "PRIVATE_FACT_SENTINEL" } };
    assert(scenarioBlock(sc, "zh", "you").includes("PRIVATE_FACT_SENTINEL"));
    assert(!scenarioBlock(sc, "zh", "you", "learner").includes("PRIVATE_FACT_SENTINEL"));
    assert(!scenarioBlock(sc, "en", "you", "learner").includes("PRIVATE_FACT_SENTINEL"));
  });
  check("authored play remains private and survives a device round trip", () => {
    const sc = { ...scenario, simulationDirection: { zh: "PRIVATE_PLAY_SENTINEL", en: "PRIVATE_PLAY_SENTINEL" } };
    const restored = JSON.parse(JSON.stringify(buildSession(sc, "arena", "zh"))) as Session;
    for (const lang of ["zh", "en"] as const) {
      assert(scenarioBlock(restored.scenario, lang, "you").includes("PRIVATE_PLAY_SENTINEL"));
      assert(!scenarioBlock(restored.scenario, lang, "you", "learner").includes("PRIVATE_PLAY_SENTINEL"));
      assert(!scenarioBlock({ ...scenario, simulationDirection: undefined }, lang, "you").includes("AUTHORED CONDITIONAL PLAY"));
    }
  });
  let captured: Parameters<LLM["chatStream"]>[0] | undefined;
  const reply = JSON.stringify({ meta: { objectives: [false, false], ended: false, stance: 20, revealed: false }, utterances: [{ characterId: npc, text: "继续。" }] });
  const llm: LLM = { chatText: async () => "", chatStream: (input) => {
    captured = input;
    return { deltas: (async function* () { yield reply; })(), text: () => reply, refused: () => false };
  } };
  const history = transcript(12); history.push({ id: "next", role: "learner", text: "已说好只看一页，我想再确认你希望我看什么。", ts: 30 });
  await runRoleplay({ scenario, learnerCharacterId: "you", messages: history, lang: "zh", turnLimit: 20 }, llm, "fixture");
  check("server/BYOK shared task uses extended budget and preserves earlier commitments", () => {
    assert(captured); assert(Array.isArray(captured.system) && captured.system.some((b) => b.text.includes("boundary: 20")));
    assert(captured.messages.some((m) => m.content.includes(history[1].text)));
    assert(captured.messages.some((m) => m.content.includes(history[2].text)));
    assert.equal(captured.messages.at(-1)?.content, history.at(-1)?.text);
    assert(!JSON.stringify(captured.system).includes("this is the final exchange"));
  });
  console.log(`${passed} continuation checks passed.`);
}
void main();
