/** Run from app/: npx tsx scripts/check-practice-policy.ts */
import assert from "node:assert/strict";
import { SCENARIOS } from "../src/data/corpus";
import { parseRoleplay } from "../src/lib/client-api";
import { goalOutcome, hasQuote, supportedClosure } from "../src/lib/practice-policy";
import { retrieveScenario } from "../src/lib/retrieval";
import { sanitizeReport, runAssess } from "../src/lib/tasks/assess";
import { fitRoles } from "../src/lib/tasks/role-fit";
import { runSchedule } from "../src/lib/tasks/schedule";
import { historyFor } from "../src/lib/session-utils";
import { assessSystem, hintSystem, roleplaySystem, scenarioBlock } from "../src/lib/prompts";
import type { LLM } from "../src/lib/llm-core";
import type { ChatMessage, Profile, Report, RoleplayMeta, Session } from "../src/lib/types";

let checks = 0;
function check(name: string, fn: () => void) { fn(); checks++; console.log(`PASS ${name}`); }
const base = SCENARIOS[0];
const role = base.characters.find((c) => c.playable)!.id;
const learner: ChatMessage = { id: "l1", role: "learner", text: "我现在不能答应，需要先了解这个安排会影响谁。", ts: 1 };
const npc: ChatMessage = { id: "n1", role: "npc", text: "可以，那我们先不作决定，等你确认后再谈。", ts: 2 };
const profile: Profile = { name: "Test", bio: "我没有管理权限，也不想扮演管理下属的角色。", goals: [base.skills[0]], contexts: [base.context], lang: "zh", createdAt: 1 };
const stub = (payload: unknown): LLM => ({ chatText: async () => JSON.stringify(payload), chatStream: () => { throw new Error("unused"); } });

async function main() {
  check("private NPC information is isolated from briefings, hints and assessments", () => {
    const hidden = "PRIVATE_FACT_ONLY_FOR_SIMULATION";
    const s = { ...base, characters: base.characters.map((c) => c.playable ? c : { ...c, hidden: { zh: hidden, en: hidden } }) };
    for (const lang of ["zh", "en"] as const) {
      assert.ok(roleplaySystem(s, role, lang, "Test").includes(hidden));
      assert.ok(!scenarioBlock(s, lang, role, "learner").includes(hidden));
      assert.ok(!assessSystem(s, role, lang, [], [], s.skills).includes(hidden));
      assert.ok(!hintSystem(s, role, lang).includes(hidden));
    }
  });
  check("every corpus scene preserves core skills/context even with repeats", () => {
    for (const s of SCENARIOS) {
      const p = { query: "", core_constraints: { target_skills: [s.skills[0]], contexts: [s.context] }, rationale: "" };
      const r = retrieveScenario(p, new Set(SCENARIOS.map((x) => x.id)));
      assert.ok(r.scenario);
      assert.equal(r.scenario.context, s.context);
      assert.ok(r.scenario.skills.includes(s.skills[0]) || r.scenario.relatedSkills?.includes(s.skills[0]));
    }
  });
  check("no lexical matches or empty goal list cannot manufacture success", () => {
    assert.equal(goalOutcome([]), "failure");
    assert.equal(hasQuote("我愿意无条件加班", [learner.text]), false);
    assert.equal(hasQuote("不能答应", [learner.text]), true);
  });
  const open: RoleplayMeta = { objectives: [false, false, false], ended: true, outcome: "failure" };
  check("bare failure / success / ended flags cannot terminate a conversation", () => {
    assert.equal(supportedClosure(open, [learner], [npc.text]), undefined);
    assert.equal(supportedClosure({ ...open, objectives: [true, true, true], outcome: "success" }, [learner], [npc.text]), undefined);
  });
  const closed: RoleplayMeta = { ...open, closure: { kind: "deferred", learnerQuote: learner.text, npcQuote: npc.text } };
  check("mutual deferral can close with no original goals achieved", () => {
    assert.equal(supportedClosure(closed, [learner], [npc.text])?.kind, "deferred");
    assert.equal(goalOutcome(closed.objectives), "failure");
  });
  check("fabricated, stale, missing, and wrong-speaker closure quotes are rejected", () => {
    assert.equal(supportedClosure(closed, [learner], ["你是什么意思？"]), undefined);
    assert.equal(supportedClosure(closed, [learner, { ...learner, text: "我改变想法了，继续谈。" }], [npc.text]), undefined);
    assert.equal(supportedClosure(closed, [{ ...learner, role: "coach" }], [npc.text]), undefined);
    assert.equal(supportedClosure({ ...closed, closure: { kind: "agreement", npcQuote: npc.text } }, [learner], [npc.text]), undefined);
  });
  check("an NPC may explicitly withdraw without learner agreement", () => {
    const line = "我不愿意再谈下去了，今天就到这里。";
    assert.equal(supportedClosure({ ...open, closure: { kind: "withdrawal", npcQuote: line } }, [learner], [line])?.kind, "withdrawal");
  });
  check("protocol requires actual booleans and preserves closure", () => {
    const parsed = parseRoleplay(`@@meta\n${JSON.stringify({ ...closed, objectives: ["false", true], ended: "false" })}\n@@npc\n${npc.text}`, ["npc"]);
    assert.deepEqual(parsed.meta?.objectives, [false, true]);
    assert.equal(parsed.meta?.ended, false);
    assert.deepEqual(parsed.meta?.closure, closed.closure);
  });
  const skill = base.skills[0];
  const raw: Partial<Report> = {
    stars: 0, outcome: "failure", verdictEvidence: learner.text, verdict: "你保留了判断空间。", summary: "有待确认的信息。",
    ratings: [{ skill, level: 3, evidence: learner.text, reason: "说明限制并先核实影响。" }],
    strengths: [{ skill, evidence: learner.text, behavior: "先核实再承诺" }, { skill, evidence: "根本没说过", behavior: "捏造" }],
    weaknesses: [{ skill, evidence: npc.text, behavior: "错把NPC当用户", deficit: "performance", whyItMatters: "错误" }],
    alternatives: [{ original: learner.text, better: "我需要先确认影响再回复。", why: "简洁" }, { original: npc.text, better: "捏造", why: "错误" }],
    deltas: { [skill]: 9 },
  };
  check("good communication can earn three stars despite zero goal attainment", () => {
    const r = sanitizeReport(raw, base, [], [], [learner, npc], [skill]);
    assert.equal(r.stars, 3); assert.equal(r.outcome, "failure");
    assert.equal(r.strengths.length, 1); assert.equal(r.weaknesses.length, 0); assert.equal(r.alternatives.length, 1);
    assert.equal(r.deltas[skill], 0.5);
  });
  check("getting all goals does not rescue poor communication", () => {
    const r = sanitizeReport({ ...raw, stars: 3, outcome: "success", ratings: [{ ...raw.ratings![0], level: 0 }] }, base, [], [], [learner], [skill]);
    assert.equal(r.stars, 0); assert.equal(r.outcome, "success"); assert.deepEqual(r.deltas, {});
  });
  check("invented evidence, duplicate ratings, and unpracticed skills cannot inflate scores", () => {
    const r = sanitizeReport({ ...raw, ratings: [raw.ratings![0], { ...raw.ratings![0], level: 0 }, { ...raw.ratings![0], evidence: "捏造", level: 3 }] }, base, [], [], [learner], [skill]);
    assert.equal(r.ratings?.length, 1);
    const empty = sanitizeReport(raw, base, [], [], [], [skill]);
    assert.equal(empty.ratings?.length, 0); assert.deepEqual(empty.deltas, {}); assert.equal(empty.summary, "");
  });
  check("outcome fallback is independent of quality; legacy stars are marked in history", () => {
    const r = sanitizeReport({ ...raw, outcome: undefined }, base, [], [], [learner], [skill], "zh", [false, false]);
    assert.equal(r.outcome, "failure"); assert.equal(r.stars, 3);
    const old = { id: "old", scenario: base, status: "assessed", startedAt: 1, report: { stars: 3 } } as Session;
    assert.equal(historyFor([old], "zh")[0].scoringVersion, undefined);
  });
  const fits = await fitRoles([base], { ...profile, bio: "" }, "zh", stub(null), "test");
  assert.equal(fits[0].fit, "uncertain"); checks++;
  await assert.rejects(() => fitRoles([base], profile, "zh", stub({ fits: [{ scenarioId: base.id, characterId: role, fit: "conflict", evidence: "我不喜欢这个", reason: "捏造" }] }), "test")); checks++;
  await assert.rejects(() => fitRoles([base], profile, "zh", stub({ fits: [] }), "test")); checks++;
  // Full scheduler: explicit profile contexts survive a contradictory model prescription.
  let call = 0;
  const llm: LLM = {
    chatText: async (o) => {
      call++;
      if (call === 1) return JSON.stringify({ query: "", core_constraints: { target_skills: [skill, "invented"], contexts: ["invented"] }, rationale: "test" });
      if (call === 2) {
        const request = JSON.parse(o.messages[0].content) as { scenarios: { id: string; roles: { id: string }[] }[] };
        return JSON.stringify({ fits: request.scenarios.map((s, i) => ({ scenarioId: s.id, characterId: s.roles[0].id, fit: i === 0 ? "compatible" : "conflict", evidence: profile.bio, reason: "test" })) });
      }
      return JSON.stringify({ learnerCharacterId: "invented", objectives: [], briefing: "test", focus: "test" });
    }, chatStream: () => { throw new Error("unused"); },
  };
  const scheduled = await runSchedule({ profile, proficiency: {}, history: [], lang: "zh" }, llm, "test");
  assert.equal(scheduled.scenario.context, profile.contexts[0]);
  assert.equal(scheduled.adaptation.learnerCharacterId, scheduled.retrieval?.roleFit?.characterId);
  assert.equal(scheduled.adaptation.objectives.length, scheduled.scenario.objectives.length); checks++;
  // A wholly incompatible pool fails visibly, never falls back at random.
  const blocked: LLM = { ...llm, chatText: async (o) => {
    if (o.messages[0].content.startsWith("{")) {
      const req = JSON.parse(o.messages[0].content) as { scenarios: { id: string; roles: { id: string }[] }[] };
      return JSON.stringify({ fits: req.scenarios.map((s) => ({ scenarioId: s.id, characterId: s.roles[0].id, fit: "conflict", evidence: profile.bio, reason: "explicit mismatch" })) });
    }
    return JSON.stringify({ core_constraints: { target_skills: [skill] }, query: "", rationale: "" });
  } };
  await assert.rejects(() => runSchedule({ profile, proficiency: {}, history: [], lang: "zh" }, blocked, "test"), /暂时没有/); checks++;
  // The same shared task powers hosted and BYOK: raw invented evidence never streams out.
  const streamed: string[] = [];
  const mockStream: LLM = { ...stub(null), chatStream: () => ({
    deltas: (async function* () { yield JSON.stringify(raw); })(), text: () => JSON.stringify(raw), refused: () => false,
  }) };
  const report = await runAssess({ scenario: base, learnerCharacterId: role, messages: [learner, npc], lang: "zh", goals: [skill] }, mockStream, "test", (d) => streamed.push(d));
  assert.equal(streamed.length, 1); assert.equal(streamed[0], JSON.stringify(report)); assert.ok(!streamed[0].includes("根本没说过")); checks++;
  console.log(`practice policy: ${checks} checks passed, including all ${SCENARIOS.length} corpus scenes`);
}
void main();
