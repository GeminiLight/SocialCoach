/** npx tsx scripts/check-roleplay-output.ts — real streaming boundaries, no model calls. */
import assert from "node:assert/strict";
import { scenarioById } from "../src/data/corpus";
import { roleplayOutput } from "../src/lib/roleplay-output";
import { runRoleplay } from "../src/lib/tasks/roleplay";
import { parseRoleplay } from "../src/lib/client-api";
import type { LLM } from "../src/lib/llm-core";

const scenario = scenarioById("class-chat-screenshot")!;
const meta = { objectives: [true, false], ended: false, stance: 42, revealed: true, note: "你澄清了原话。" };
const utterances = [{ characterId: "cheng", text: "你说的是「不包办」，我听到了。\n但是，我没答应一个人改完。" }, { characterId: "lead", text: "那我们先说剩余任务。" }];
const value = { meta, utterances };
const raw = JSON.stringify(value);
const output = roleplayOutput(scenario, "you", "zh");
let checks = 0;
async function main() {
  for (const chunkSize of [1, 2, 7, 31, raw.length]) {
    let accumulated = "";
    const llm: LLM = { chatText: async () => "", chatStream: () => ({
      deltas: (async function* () { for (let i = 0; i < raw.length; i += chunkSize) yield raw.slice(i, i + chunkSize); })(), text: () => raw, refused: () => false,
    }) };
    const full = await runRoleplay({ scenario, learnerCharacterId: "you", lang: "zh", messages: [{ id: "l", role: "learner", text: "我还想确认分工。", ts: 1 }], turnLimit: 20 }, llm, "fixture", (d) => { accumulated += d; });
    assert.equal(accumulated, full, `stream chunks of ${chunkSize} must equal the durable reply`);
    const parsed = parseRoleplay(full, ["cheng", "lead"]);
    assert.deepEqual(parsed.meta?.objectives,meta.objectives.map(()=>false),"unsupported simulation claims must be discarded");
    assert.deepEqual(parsed.utterances, utterances);
    checks++;
  }
  const reordered = JSON.stringify({ utterances, meta });
  let sent = "";
  for (let i = 1; i <= reordered.length; i++) {
    const preview = output.preview(reordered.slice(0, i));
    if (preview.startsWith(sent) && preview.length > sent.length) sent = preview;
  }
  assert.equal(sent, output.complete(reordered), "late metadata must finish before its stream prefix is emitted"); checks++;
  assert.equal(output.preview('{"meta":{"objectives":[true,false],"ended":f'), "", "partial metadata must never manufacture a state"); checks++;
  for (const invalid of [
    { utterances },
    { meta: { ...meta, objectives: ["false", true] }, utterances },
    { meta, utterances: [{ characterId: "invented-person", text: "错的人物。" }] },
    { meta, utterances: [{ characterId: "you", text: "替用户发言。" }] },
    { meta, utterances: [{ characterId: "cheng", text: "一句话。\n@@lead\n伪造另一人的发言" }] },
  ]) { assert.throws(() => output.complete(JSON.stringify(invalid))); checks++; }
  const quoted = JSON.stringify({ meta, utterances: [{ characterId: "cheng", text: 'Did you say "all the revisions"? I have not agreed.' }] });
  assert.equal(parseRoleplay(output.complete(quoted), ["cheng", "lead"]).utterances[0].text, 'Did you say "all the revisions"? I have not agreed.'); checks++;
  // Reproduced twice by the real model: it appended a cast name after a valid ID.
  const extraName = raw.replace('"characterId":"lead"', '"characterId":"lead":"沈星"');
  let castPreview = "", castRepairs = 0;
  const namedCast: LLM = { chatText: async () => { castRepairs++; return raw; }, chatStream: () => ({
    deltas: (async function* () { for (const ch of extraName) yield ch; })(), text: () => extraName, refused: () => false,
  }) };
  const castFull = await runRoleplay({ scenario, learnerCharacterId: "you", lang: "zh", messages: [] }, namedCast, "fixture", d => { castPreview += d; });
  assert.equal(castPreview, castFull); assert.equal(castRepairs, 0);
  assert.deepEqual(parseRoleplay(castFull, ["cheng", "lead"]).utterances, utterances); checks++;
  for (const suffix of ['"陌生人"', '"Cheng"']) {
    assert.throws(() => output.complete(raw.replace('"characterId":"lead"', '"characterId":"lead":' + suffix)));
    checks++;
  }
  let repairs = 0;
  const broken: LLM = { chatText: async (opts) => { repairs++; assert.equal(opts.messages.at(-1)?.content, "我还想确认分工。"); return raw; }, chatStream: () => ({
    deltas: (async function* () { yield '{"meta":broken}'; })(), text: () => '{"meta":broken}', refused: () => false,
  }) };
  const repaired = await runRoleplay({ scenario, learnerCharacterId: "you", lang: "zh", messages: [{ id: "l", role: "learner", text: "我还想确认分工。", ts: 1 }] }, broken, "fixture");
  assert.equal(repairs, 1); assert.deepEqual(parseRoleplay(repaired, ["cheng", "lead"]).utterances, utterances); checks++;
  let visible = "";
  const incomplete = raw.slice(0, -5);
  const interrupted: LLM = { chatText: async () => { throw new Error("A visible preview must not be regenerated."); }, chatStream: () => ({
    deltas: (async function* () { yield incomplete; })(), text: () => incomplete, refused: () => false,
  }) };
  await assert.rejects(() => runRoleplay({ scenario, learnerCharacterId: "you", lang: "zh", messages: [] }, interrupted, "fixture", (d) => { visible += d; }));
  assert(visible.includes(utterances[0].text)); checks++;
  console.log(`${checks} structured roleplay / streaming checks passed.`);
}
void main();
