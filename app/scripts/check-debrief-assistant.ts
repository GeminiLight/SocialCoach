/** npx tsx scripts/check-debrief-assistant.ts — deterministic shared hosted/BYOK contract checks. */
import assert from "node:assert/strict";
import { scenarioById } from "../src/data/corpus";
import { buildDebriefInput, DEBRIEF_HISTORY_LIMIT } from "../src/lib/debrief-chat";
import { debriefKnowledge, runDebriefChat } from "../src/lib/tasks/debrief-chat";
import type { DebriefReply, Session } from "../src/lib/types";
import { extractJSON, type ChatOpts, type LLM } from "../src/lib/llm-core";

export const quote = "我刚来这里的时候，也有点不知道该怎么开口。";
export const fixtureReply: DebriefReply = { evidence: quote, answer: "自我暴露是分享一点真实的自己，让对话有来有往。先从低风险的小经历开始，看看对方是否愿意分享，再决定要不要深入。", example: "如果这与你的真实经历一致，可以试着说：‘我刚来时也不太熟悉这里，后来发现附近有家小店很不错。你最近有发现什么有意思的地方吗？’", sources: [{ kind: "theory", id: "aron-self-disclosure" }] };
export function fixtureSession(): Session {
  const original = scenarioById("first-date-silence")!;
  const scenario = { ...original, characters: original.characters.map(c => c.id === "you" ? c : { ...c, hidden: { zh: "PRIVATE_HIDDEN_SENTINEL", en: "PRIVATE_HIDDEN_SENTINEL" }, stance: { zh: "PRIVATE_STANCE_SENTINEL", en: "PRIVATE_STANCE_SENTINEL" }, personality: { zh: "PRIVATE_PERSONALITY_SENTINEL", en: "PRIVATE_PERSONALITY_SENTINEL" } }), success: { zh: "PRIVATE_SUCCESS_SENTINEL", en: "PRIVATE_SUCCESS_SENTINEL" } };
  return {
    id: "debrief-assistant-check", scenario, learnerCharacterId: "you", status: "assessed", origin: "arena", startedAt: 1, endedAt: 2,
    objectiveDone: scenario.objectives.map(() => false), reflections: [], revealSeen: true,
    messages: [{ id: "n1", role: "npc", characterId: original.opening.characterId, text: "你平时会去哪里逛？", ts: 1 }, { id: "l1", role: "learner", text: quote, ts: 2 }, { id: "h1", role: "coach", text: "COACH_HINT_SENTINEL", ts: 3 }],
    report: { scoringVersion: 2, ratings: [{ skill: "building-relationships", level: 2, evidence: quote, reason: "分享了一点真实的自己。" }], stars: 2, outcome: "failure", verdictEvidence: quote, verdict: "你分享了自己的感受，给对方留下接话的空间。", summary: `“${quote}”你用自己的经历开始了对话。`, strengths: [{ evidence: quote, behavior: "给出自己的经历", skill: "building-relationships" }], weaknesses: [], alternatives: [], knowledge: { theoryIds: ["aron-self-disclosure"], caseIds: [], whyThis: "用对等的自我暴露让对话继续。" }, reflectionQuestions: [], nextStep: "分享一件小事，再给对方一个接话的机会。", deltas: { "building-relationships": 0.2 } },
  };
}

async function main() {
  let checks = 0;
  const check = (name: string, run: () => void) => { run(); checks++; console.log(`PASS ${name}`); };
  const session = fixtureSession();
  const original = JSON.stringify(session);
  const input = buildDebriefInput(session, "什么是自我暴露？我如何在本次聊天中使用？", "zh");
  check("public payload omits all private NPC fields, scoring and coach hints", () => {
    const payload = JSON.stringify(input);
    assert(!payload.includes("PRIVATE_")); assert(!payload.includes("COACH_HINT_")); assert(!payload.includes('"stars"')); assert(!payload.includes('"deltas"'));
  });
  check("Chinese concept queries retrieve the actual sourced theory without relying on report IDs", () => {
    assert(debriefKnowledge({ ...input, report: { ...input.report, knowledge: { theoryIds: [], caseIds: [] } } }).theories.some(t => t.id === "aron-self-disclosure"));
  });
  check("English concept queries retrieve the sourced theory", () => assert(debriefKnowledge({ ...input, question: "How can I use self-disclosure?" }).theories.some(t => t.id === "aron-self-disclosure")));
  let request: ChatOpts | undefined;
  const stub = (reply: unknown): LLM => ({ chatText: async o => { request = o; return JSON.stringify(reply); }, chatStream: () => { throw Error("No unverified reply may stream"); } });
  const output = await runDebriefChat(input, stub(fixtureReply), "test");
  check("reply preserves verified evidence and resolves only existing source IDs", () => assert.deepEqual(output, fixtureReply));
  const paragraphs = await runDebriefChat(input, stub({ ...fixtureReply, answer: ["概念解释。", "本次用法。"] }), "test");
  check("paragraph arrays normalize to readable text for both hosted and BYOK", () => assert.equal(paragraphs.answer, "概念解释。\n\n本次用法。"));
  check("model sees only the public view and citation content", () => { const prompt = JSON.stringify(request); assert(!prompt.includes("PRIVATE_")); assert(prompt.includes("Arthur Aron")); });
  check("practice/report remain unchanged", () => assert.equal(JSON.stringify(session), original));
  for (const [name, bad] of [
    ["fabricated quote", { ...fixtureReply, evidence: "我很擅长聊天。" }],
    ["NPC quote", { ...fixtureReply, evidence: session.messages[0].text }],
    ["missing quote", { ...fixtureReply, evidence: "" }],
    ["invented source", { ...fixtureReply, sources: [{ kind: "theory", id: "made-up" }] }],
    ["known but unretrieved source", { ...fixtureReply, sources: [{ kind: "theory", id: "describe-dont-judge-kids" }] }],
    ["wrong response shape", { answer: 123 }],
  ] as const) { await assert.rejects(() => runDebriefChat(input, stub(bad), "test")); checks++; console.log(`PASS rejects ${name}`); }
  let calls = 0;
  const never = { ...stub(fixtureReply), chatText: async () => { calls++; return "{}"; } };
  for (const bad of [{ ...input, question: " " }, { ...input, question: "x".repeat(1001) }, { ...input, history: Array(7).fill({ question: "q", answer: "a" }) }, null]) {
    await assert.rejects(() => runDebriefChat(bad as typeof input, never, "test")); checks++;
  }
  check("invalid inputs are rejected before spending model quota", () => assert.equal(calls, 0));
  const withHistory = { ...session, debriefChat: Array.from({ length: 9 }, (_, i) => ({ id: String(i), question: `question-${i}`, reply: fixtureReply, at: i })) };
  const followup = buildDebriefInput(withHistory, "如果对方不接话呢？", "zh");
  check("follow-ups include the most recent six exchanges and preserve the full local history", () => { assert.equal(followup.history.length, DEBRIEF_HISTORY_LIMIT); assert.equal(followup.history[0].question, "question-3"); assert.equal(withHistory.debriefChat.length, 9); });
  await runDebriefChat(followup, stub(fixtureReply), "test");
  check("the model receives prior answers for multi-turn questions", () => assert(request!.messages[0].content.includes("question-8")));
  let repairCalls = 0;
  const repaired = await runDebriefChat(input, { ...stub(null), chatText: async () => JSON.stringify(++repairCalls === 1 ? { ...fixtureReply, evidence: "捏造的句子。" } : fixtureReply) }, "test");
  check("one repair revalidates a fresh reply instead of replacing invented evidence", () => { assert.equal(repairCalls, 2); assert.deepEqual(repaired, fixtureReply); });
  const silent = { ...input, transcript: input.transcript.filter(t => t.role !== "learner") };
  const general = await runDebriefChat(silent, stub({ ...fixtureReply, evidence: "" }), "test");
  check("no learner words permits concept-only guidance without fabricated evidence", () => assert.equal(general.evidence, ""));
  check("malformed model output diagnostics do not log practice content", () => {
    const originalError = console.error;
    const logs: unknown[][] = [];
    console.error = (...args: unknown[]) => { logs.push(args); };
    try { assert.throws(() => extractJSON('{"PRIVATE_PRACTICE_SENTINEL"}')); }
    finally { console.error = originalError; }
    assert(logs.length > 0); assert(!JSON.stringify(logs).includes("PRIVATE_PRACTICE_SENTINEL"));
  });
  console.log(`debrief assistant: ${checks} contract checks passed`);
}
if (process.argv[1]?.endsWith("check-debrief-assistant.ts")) void main();
