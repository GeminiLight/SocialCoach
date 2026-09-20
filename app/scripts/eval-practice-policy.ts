/** Optional live, synthetic regression sample; uses the configured models.
 * Run from app/: npx tsx --env-file=.env.local scripts/eval-practice-policy.ts
 * No real user transcripts. Model judgments are samples, not guarantees.
 */
import assert from "node:assert/strict";
import { scenarioById } from "../src/data/corpus";
import { FAST_MODEL, SMART_MODEL, hasServerCredential, serverLLM } from "../src/lib/llm";
import { parseRoleplay } from "../src/lib/client-api";
import { supportedClosure } from "../src/lib/practice-policy";
import { runRoleplay } from "../src/lib/tasks/roleplay";
import { runAssess } from "../src/lib/tasks/assess";
import { fitRoles } from "../src/lib/tasks/role-fit";
import type { ChatMessage, Profile } from "../src/lib/types";
import type { Lang } from "../src/data/taxonomy";

async function main() {
  assert.ok(hasServerCredential(), "No model credential configured");
  const checkWithdrawal = async () => {
    const scenario = scenarioById("neighbor-noise")!;
    const messages: ChatMessage[] = [
      { id: "o", role: "npc", characterId: scenario.opening.characterId, text: scenario.opening.text.zh, ts: 1 },
      { id: "l", role: "learner", text: "我现在不愿意继续谈下去了，今天就到这里，我先回家。", ts: 2 },
    ];
    const raw = await runRoleplay({ scenario, learnerCharacterId: "you", messages, lang: "zh" }, serverLLM, FAST_MODEL);
    const parsed = parseRoleplay(raw, scenario.characters.filter((c) => c.id !== "you").map((c) => c.id));
    const closure = supportedClosure(parsed.meta, messages, parsed.utterances.map((u) => u.text));
    console.log(JSON.stringify({ case: "explicit-withdrawal", meta: parsed.meta, npc: parsed.utterances, accepted: !!closure }));
    assert.ok(closure, "An explicit exit should produce a grounded closure without meeting the original goals");
  };
  if (process.argv.includes("--closure-only")) {
    await checkWithdrawal();
    console.log("live closure check passed");
    return;
  }
  const samples: { id: string; lang: Lang; line: string }[] = [
    { id: "salary-raise", lang: "zh", line: "我手里没有市场薪酬报告，也不想编造业绩数字。我能说明最近接手的具体工作。你觉得哪些实际职责变化值得我们一起讨论？" },
    { id: "friend-borrowed-money", lang: "zh", line: "我现在不能再借钱，也不能无限期等下去。你目前能做到哪一步？我们先把各自的困难说清楚。" },
    { id: "parent-career-choice", lang: "zh", line: "我听得出你担心我失去稳定收入，但我还没有决定辞职。你最担心的是哪一种风险？我想先弄清楚。" },
    { id: "restaurant-wrong-order", lang: "en", line: "I cannot wait for a replacement. I want to discuss cancelling this dish instead. What options do you have?" },
  ];
  for (let i = 0; i < samples.length; i += 2) {
    const results = await Promise.allSettled(samples.slice(i, i + 2).map(async (sample) => {
      const scenario = scenarioById(sample.id)!;
      const learnerCharacterId = scenario.characters.find((c) => c.playable)!.id;
      const messages: ChatMessage[] = [
        { id: "opening", role: "npc", characterId: scenario.opening.characterId, text: scenario.opening.text[sample.lang], ts: 1 },
        { id: "learner", role: "learner", text: sample.line, ts: 2 },
      ];
      const raw = await runRoleplay({ scenario, learnerCharacterId, messages, lang: sample.lang }, serverLLM, FAST_MODEL);
      const parsed = parseRoleplay(raw, scenario.characters.filter((c) => c.id !== learnerCharacterId).map((c) => c.id));
      console.log(JSON.stringify({ case: sample.id, meta: parsed.meta, npc: parsed.utterances }));
      assert.ok(parsed.meta, `${sample.id}: missing meta`);
      assert.ok(parsed.utterances.length, `${sample.id}: missing dialogue`);
      assert.equal(parsed.meta.ended, false, `${sample.id}: an open question must get a chance to continue`);
      assert.equal(supportedClosure(parsed.meta, messages, parsed.utterances.map((u) => u.text)), undefined);
    }));
    for (const r of results) if (r.status === "rejected") throw r.reason;
  }
  const profile: Profile = { name: "Synthetic", bio: "我是一名独立译者，没有员工，没有管理下属的权限。我希望练习提出异议和处理分歧。", goals: ["communication", "resolving-conflicts"], contexts: ["workplace"], lang: "zh", createdAt: 1 };
  const fit = await fitRoles([scenarioById("giving-hard-feedback")!, scenarioById("meeting-tension")!, scenarioById("restaurant-wrong-order")!], profile, "zh", serverLLM, FAST_MODEL);
  console.log(JSON.stringify({ case: "role-fit", fits: fit }));
  assert.equal(fit.find((f) => f.scenarioId === "giving-hard-feedback")?.fit, "conflict");
  assert.notEqual(fit.find((f) => f.scenarioId === "restaurant-wrong-order")?.fit, "conflict");

  const scenario = scenarioById("declining-extra-hours")!;
  const line = "我知道你担心明早交付。我今晚要照顾家人，不能留下加班，也不能承诺做不完的东西。现在交接已有材料可以，但今晚继续制作不行。";
  const messages: ChatMessage[] = [
    { id: "o", role: "npc", characterId: scenario.opening.characterId, text: scenario.opening.text.zh, ts: 1 },
    { id: "l", role: "learner", text: line, ts: 2 },
    { id: "n", role: "npc", characterId: scenario.opening.characterId, text: "我还是不能接受这个安排，但我现在得去找别人了，今天先这样。", ts: 3 },
  ];
  const report = await runAssess({ scenario, learnerCharacterId: "you", messages, lang: "zh", goals: ["communication"], objectiveDone: scenario.objectives.map(() => false), outcome: "failure" }, serverLLM, SMART_MODEL);
  console.log(JSON.stringify({ case: "quality-despite-refusal", stars: report.stars, outcome: report.outcome, ratings: report.ratings, verdict: report.verdict, weaknesses: report.weaknesses }));
  assert.ok(report.ratings?.length, "Evidence-backed ratings missing");
  assert.ok(report.stars >= 2, "A clear evidenced boundary must not be scored as a skill failure just because the NPC refused");
  await checkWithdrawal();
  console.log("live practice sample: 7 checks passed");
}
void main();
