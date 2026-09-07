/** Run from app/: npx tsx scripts/check-pattern-guard.ts
 *
 * The cross-session pattern is the most convincing thing the app says, which
 * makes a fabricated quote inside it the most damaging. Two guards live in code
 * rather than in the prompt, and this asserts both of them hold when the model
 * misbehaves in the two ways that matter.
 */
import assert from "node:assert/strict";
import { runPattern } from "../src/lib/tasks/pattern";
import type { LLM } from "../src/lib/llm-core";
import type { PatternInput } from "../src/lib/tasks/types";

const input: PatternInput = {
  lang: "zh",
  goals: ["standing-up"],
  sessions: [
    {
      title: "和老板谈加薪", at: 1, outcome: "partial", verdict: "", gaveGroundOn: [2], turns: 3,
      weaknesses: [{ behavior: "替对方做了拒绝", evidence: "算了算了，我知道预算紧，你别为难。", skill: "standing-up", deficit: "performance" }],
    },
    {
      title: "室友的深夜噪音", at: 2, outcome: "partial", verdict: "", gaveGroundOn: [2], turns: 2,
      weaknesses: [{ behavior: "立刻收回请求", evidence: "行吧行吧，不然就算了，我戴个耳塞也一样。", skill: "standing-up", deficit: "performance" }],
    },
  ],
};

/** An LLM that returns whatever JSON we hand it, ignoring the prompt. */
const stub = (payload: unknown): LLM => ({
  chatText: async () => JSON.stringify(payload),
  chatStream: () => {
    throw new Error("not used");
  },
});

async function main() {
  // 1. Both quotes real and from two sessions → accepted.
  const good = await runPattern(input, stub({
    found: true, pattern: "对方一叹气你就撤回诉求。", why: "…", skill: "standing-up", nextStep: "停三秒，重复原话。",
    evidence: [
      { title: "和老板谈加薪", quote: "算了算了，我知道预算紧，你别为难。" },
      { title: "室友的深夜噪音", quote: "行吧行吧，不然就算了，我戴个耳塞也一样。" },
    ],
  }), "m");
  assert.equal(good.found, true, "real quotes from two sessions should be accepted");
  assert.equal(good.evidence.length, 2);

  // 2. A quote nobody ever said → dropped, and with it the whole finding.
  const fabricated = await runPattern(input, stub({
    found: true, pattern: "你总是先道歉。", why: "…",
    evidence: [
      { title: "和老板谈加薪", quote: "算了算了，我知道预算紧，你别为难。" },
      { title: "室友的深夜噪音", quote: "对不起，是我太敏感了，你继续吧。" }, // never said
    ],
  }), "m");
  assert.equal(fabricated.found, false, "a fabricated quote must sink the finding");

  // 3. Two real quotes, but both from one session → not a pattern.
  const oneSession = await runPattern(input, stub({
    found: true, pattern: "你在加薪场景里反复退让。", why: "…",
    evidence: [
      { title: "和老板谈加薪", quote: "算了算了，我知道预算紧，你别为难。" },
      { title: "和老板谈加薪", quote: "算了算了，我知道预算紧" },
    ],
  }), "m");
  assert.equal(oneSession.found, false, "one session is an instance, not a pattern");

  // 4. Requoted with different punctuation and spacing → still accepted; models
  //    re-punctuate even when told not to, and dropping those would be a false alarm.
  const repunctuated = await runPattern(input, stub({
    found: true, pattern: "对方一叹气你就撤回诉求。", why: "…", nextStep: "…",
    evidence: [
      { title: "和老板谈加薪", quote: "算了算了 我知道预算紧 你别为难" },
      { title: "室友的深夜噪音", quote: "行吧行吧，不然就算了，我戴个耳塞也一样" },
    ],
  }), "m");
  assert.equal(repunctuated.found, true, "punctuation drift must not be treated as fabrication");

  // 5. Fewer than two sessions of history → never even asks the model.
  const thin = await runPattern({ ...input, sessions: input.sessions.slice(0, 1) }, stub({ found: true, pattern: "x", evidence: [] }), "m");
  assert.equal(thin.found, false, "one session of history returns nothing");

  console.log("pattern guard: 5/5 passed");
}

void main();
