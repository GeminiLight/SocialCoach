/** Synthetic live eval; npx tsx --env-file=.env.local scripts/eval-practice-continuation.ts [--baseline=/tmp/old-prompts.ts]
 * Every reply is recorded for semantic review; no real user data is used. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { scenarioById } from "../src/data/corpus";
import { SCENARIOS_D } from "../src/data/corpus/scenarios-d";
import { runRoleplay } from "../src/lib/tasks/roleplay";
import { parseRoleplay } from "../src/lib/client-api";
import { FAST_MODEL, hasServerCredential, serverLLM } from "../src/lib/llm";
import type { ChatMessage } from "../src/lib/types";
import type { Lang } from "../src/data/taxonomy";
import type { LLM } from "../src/lib/llm-core";

const root = resolve("../docs/reviews/text-practice-2026-10-03");
const records: unknown[] = [];
const issues: string[] = [];
const warnings: string[] = [];
const longRuns: { id: string; lang: Lang; lines: string[] }[] = [
  { id: "office-quick-favor", lang: "zh", lines: [
    "先别把电脑推过来。我自己的报告16:30要交。你说的修改具体是内容还是排版？",
    "如果内容还没定，我不能接全部六页。你能给我看一下老板原来的反馈吗？",
    "我最多帮你看一页的逻辑，不替你重做。你最需要讨论的是哪一页？",
    "先别把只看一页变成改完六页。剩余内容你准备找谁确认？",
    "我还没有说一定能替你找人。你现在最担心的是交不上，还是方向不对？",
    "我想先理解这点，不急着结束。老板到底希望这份材料证明什么？",
    "如果现在没有明确反馈，就保留待确认。你愿意先整理现有问题吗？",
    "我刚才语气急了，抱歉。不过16:30的报告和只看一页的范围不变。你听到的承诺是什么？",
    "如果一页也讨论不完，我们应该怎样告诉负责人剩余问题？",
    "我不想现在再承诺今晚继续改。我能提供的只是眼下有限讨论，你还希望澄清什么？",
    "我改变一下安排，只帮你列出问题，不直接改稿。你觉得会有哪些实际影响？",
    "这不是要结束，我还有疑问：你准备怎样解释内容尚未确认，而不是说我没帮忙？",
    "我们已经谈了不少，但我还想确认：哪些是你自己决定的，哪些必须问老板？",
    "最后再核实一项，前面说的16:30和不接六页有没有被误解？",
  ] },
  { id: "class-chat-screenshot", lang: "zh", lines: [
    "我说的是不包办最后修改，不是不合作。你能把原话和群里的解释放在一起再看一下吗？",
    "删不删是另一件事。你为什么把私聊发进班群，还加上不愿配合的解释？",
    "我不会拿接下全部修改来换删帖。你愿意先更正那句话吗？",
    "沈星，我不是让你只判谁对谁错。公开误解和任务分工是两件事，你先想处理哪一个？",
    "如果更正文字需要商量，先明确哪些是我的原话，哪些是程凡自己的判断，行吗？",
    "程凡，你自己对最后修改有什么担心？我还想听具体的，不急着收尾。",
    "我现在没有说老师看到了，别替我确认外传。你知道截图还发给过谁吗？",
    "不知道就保留未知。沈星，现在有哪些工作还没人承担？",
    "我愿意讨论分工，但没有答应包办。你能把需要做的部分先说明白吗？",
    "我刚才只顾着反驳了，语气可以缓一点。私聊转发的边界不变，你以后准备如何确认？",
    "即使帖子删除了，已被别人看到还是事实。你觉得怎样更正才不会继续被误解？",
    "我还没说结束：原任务和最后修改分别是谁负责，这两件事现在真的确认了吗？",
    "如果有人不同意，我们先列出仍有分歧的事项，你会怎样表述我的意思？",
    "再确认一个问题，我们谈妥的部分有哪些，哪些还要其他组员同意？",
  ] },
  { id: "partner-location-pressure", lang: "en", lines: [
    "I replied thirty minutes late. I haven't agreed to tracking. What exactly did you fear had happened?",
    "I can listen to the worry without agreeing to constant location sharing. What situation makes it hardest for you?",
    "Please don't treat a late reply as proof I'm hiding something. What do you actually know about this evening?",
    "For an agreed meeting, I could message if I'm delayed. That isn't a promise to report every movement. How would that work for you?",
    "You can disagree with that limit. What would be left unresolved for you?",
    "I'm not trying to finish yet. I want to understand why knowing my location seems necessary to you.",
    "If you don't know the answer, say that. I don't want either of us to invent a past betrayal. What happened today?",
    "I sounded impatient earlier; I'm sorry for that tone. My privacy limit remains. What do you hear me actually offering?",
    "I could tell you about a delay to a plan we've made together, but not give constant updates. What concern would that address?",
    "I don't want to promise an exact reply time whenever I'm busy. How can we handle an ordinary gap without accusations?",
    "Let me change my proposal: first let's clarify which meetings need an update. What would count as an agreed plan?",
    "I'm still asking a question, not saying goodbye: which parts of this have we accepted, and which do you reject?",
    "If I decline location sharing, can you say what choice you would make without assuming I've done something wrong?",
    "One more thing before I decide whether to stop: is there an unanswered concern you want to state plainly?",
  ] },
];

async function reply(id: string, lang: Lang, messages: ChatMessage[], turnLimit: number, llm = serverLLM, label = "current", runner = runRoleplay) {
  const scenario = scenarioById(id)!;
  const start = Date.now();
  let modelRaw = "";
  const recordingLLM: LLM = { ...llm, chatStream: (opts) => {
    const run = llm.chatStream(opts);
    return { ...run, deltas: (async function* () { for await (const delta of run.deltas) { modelRaw += delta; yield delta; } })() };
  } };
  let raw: string;
  let preview = "";
  try { raw = await runner({ scenario, learnerCharacterId: "you", lang, messages, turnLimit }, recordingLLM, FAST_MODEL, (d) => { preview += d; }); }
  catch (error) {
    records.push({ id, lang, label, turn: messages.filter((m) => m.role === "learner").length, error: String(error), modelRaw, preview });
    throw error;
  }
  if (preview !== raw) issues.push(`${id}:${lang}: streamed preview differs from durable reply`);
  const parsed = parseRoleplay(raw, scenario.characters.filter((c) => c.id !== "you").map((c) => c.id));
  records.push({ id, lang, label, turn: messages.filter((m) => m.role === "learner").length, turnLimit, ms: Date.now() - start, learner: messages.at(-1)?.text, meta: parsed.meta, npc: parsed.utterances, raw });
  if (!parsed.meta || !parsed.utterances.length) issues.push(`${label}:${id}: missing meta/dialogue`);
  if (label === "current" && parsed.meta?.ended) warnings.push(`${id}:${lang}:${messages.filter((m) => m.role === "learner").length}: model suggests wrapping up; learner remains in control`);
  for (const [i, u] of parsed.utterances.entries()) messages.push({ id: `${messages.length}`, role: "npc", characterId: u.characterId, text: u.text, ts: Date.now(), ...(i === parsed.utterances.length - 1 && parsed.meta ? { meta: parsed.meta } : {}) });
  console.log(`${label} ${id} ${lang} turn=${messages.filter((m) => m.role === "learner").length} ended=${parsed.meta?.ended} ${Date.now() - start}ms`);
}
async function main() {
  assert(hasServerCredential()); await mkdir(root, { recursive: true });
  const opening = (id: string, lang: Lang): ChatMessage[] => {
    const s = scenarioById(id)!;
    return [{ id: "opening", role: "npc", characterId: s.opening.characterId, text: s.opening.text[lang], ts: 0 }];
  };
  // Independent paths run together, but each path consumes its own real replies sequentially.
  const results = await Promise.allSettled(longRuns.map(async (test) => {
    const messages = opening(test.id, test.lang);
    for (let i = 0; i < test.lines.length; i++) {
      messages.push({ id: `learner-${i}`, role: "learner", text: test.lines[i], ts: Date.now() });
      await reply(test.id, test.lang, messages, i >= 12 ? 20 : 12);
    }
    await writeFile(resolve(root, `${test.id}-${test.lang}.json`), JSON.stringify(messages, null, 2));
  }));
  for (const result of results) if (result.status === "rejected") issues.push(String(result.reason));
  for (let i = 0; i < SCENARIOS_D.length; i += 2) {
    const result = await Promise.allSettled(SCENARIOS_D.slice(i, i + 2).map(async (s, offset) => {
      const lang: Lang = (i + offset) % 2 ? "en" : "zh";
      const messages = opening(s.id, lang);
      messages.push({ id: "learner", role: "learner", text: lang === "zh" ? "我还没有答应这个安排。你最想解决的具体问题是什么？我想先问清楚。" : "I haven't agreed to this arrangement. What specific problem are you trying to solve? I want to understand first.", ts: 1 });
      await reply(s.id, lang, messages, 12);
    }));
    for (const item of result) if (item.status === "rejected") issues.push(String(item.reason));
  }
  const baselinePath = process.argv.find((a) => a.startsWith("--baseline="))?.slice(11);
  if (baselinePath) {
    const old = await import(pathToFileURL(resolve(baselinePath)).href);
    const oldRunner = await import(pathToFileURL(resolve(baselinePath.replace("prompts", "roleplay"))).href);
    const s = scenarioById("declining-extra-hours")!;
    const messages = opening(s.id, "zh");
    for (let i = 0; i < s.maxTurns - 1; i++) messages.push(
      { id: `l${i}`, role: "learner", text: "今晚不能留下，但现有材料可以先交接。", ts: i + 1 },
      { id: `n${i}`, role: "npc", characterId: s.opening.characterId, text: "我仍然担心明早交付，材料有哪些？", ts: i + 2 },
    );
    messages.push({ id: "final", role: "learner", text: "我还想继续确认，没有说结束。现有材料交接后，你认为最大的剩余风险是什么？", ts: 30 });
    const oldLLM: LLM = { ...serverLLM, chatStream: (opts) => serverLLM.chatStream({ ...opts, system: [
      { text: old.roleplaySystem(s, "you", "zh", "You") },
      { text: `Learner turns used: ${s.maxTurns}/${s.maxTurns} (0 remaining — this is the final exchange, close the scene).` },
    ] }) };
    await reply(s.id, "zh", [...messages], 12, oldLLM, "baseline", oldRunner.runRoleplay);
    await reply(s.id, "zh", [...messages], 12);
  }
  await writeFile(resolve(root, "live-eval.json"), JSON.stringify({ at: new Date().toISOString(), model: FAST_MODEL, samples: records.length, issues, warnings, records }, null, 2));
  console.log(JSON.stringify({ samples: records.length, issues, warnings }));
  process.exitCode = issues.length ? 1 : 0;
}
void main();
