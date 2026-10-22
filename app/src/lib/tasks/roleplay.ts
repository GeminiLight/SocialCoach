import type { ChatOpts, LLM } from "@/lib/llm-core";
import { pick, roleplaySystem } from "@/lib/prompts";
import { lastSpoken, silenceStreak } from "@/lib/session-utils";
import { practiceTurnLimit } from "@/lib/practice-policy";
import { roleplayOutput, RoleplayFactError } from "@/lib/roleplay-output";
import { officeFeedbackRequested,roleplaySpeechGuard } from '@/lib/roleplay-facts';
import { LLMError } from "@/lib/llm-core";
import type { TurnInput } from "./types";
import type { RoleplayMeta } from "@/lib/types";

/** A short checkpoint needs precise commitments more than the fastest reply. */
export const roleplayModel=(input:TurnInput,fast:string,smart:string)=>input.practiceMode==='key-turn'?smart:fast;

/**
 * One exchange of the simulation. Streams the role-play protocol
 * (`@@<characterId>` blocks preceded by `@@meta`) and resolves with the
 * full text; the caller parses it with `parseRoleplay`.
 */
export async function runRoleplay(input: TurnInput, llm: LLM, fastModel: string, onDelta?: (d: string) => void): Promise<string> {
  const { scenario, learnerCharacterId, messages, lang } = input;
  const learnerName = input.learnerName || pick(scenario.characters.find((c) => c.id === learnerCharacterId)!.name, lang);

  // Keep complete exchange metadata beside its actual dialogue so a long
  // assistant history reinforces, rather than erodes, the JSON contract.
  const turns: { role: "user" | "assistant"; content: string }[] = [];
  let learnerTurns = 0;
  const npcBuf: { characterId: string | undefined; text: string }[] = [];
  let npcMeta: RoleplayMeta | undefined;
  const flushNpc = () => {
    if (npcBuf.length) {
      turns.push({ role: "assistant", content: JSON.stringify({ ...(npcMeta ? { meta: npcMeta } : {}), utterances: [...npcBuf] }) });
      npcBuf.length = 0;
      npcMeta = undefined;
    }
  };
  for (const m of messages) {
    if (m.role === "coach") continue;
    if (m.role === "npc") {
      npcBuf.push({ characterId: m.characterId, text: m.text });
      if (m.meta) npcMeta = m.meta;
    } else if (m.role === "event") {
      // A silence takes the learner's place in the exchange without spending
      // one of their turns: they did not speak, that is the point.
      flushNpc();
      turns.push({ role: "user", content: `(${learnerName} says nothing for ${m.seconds ?? 0} seconds.)` });
    } else {
      flushNpc();
      learnerTurns++;
      turns.push({ role: "user", content: m.text });
    }
  }
  flushNpc();
  // The opening line is an assistant turn before any user turn; the API requires the first message be from the user.
  if (turns[0]?.role === "assistant") turns.unshift({ role: "user", content: "(The scene begins.)" });
  if (turns[turns.length - 1]?.role !== "user") turns.push({ role: "user", content: "(…)" });

  const limit = input.practiceMode==='key-turn'?4:practiceTurnLimit(input);
  const remaining = Math.max(0, limit - learnerTurns);
  const last = lastSpoken(messages);
  const streak = last?.role === "event" && last.kind === "silence" ? silenceStreak(messages) : 0;
  const silenceNote =
    streak === 0
      ? ""
      : streak === 1
        ? ` The learner has just gone silent for ${last?.seconds ?? 0} seconds (first silence in a row). Fill it in character.`
        : ` The learner has gone silent again, ${last?.seconds ?? 0} seconds this time (silence #${streak} in a row). The character gives up on this conversation now: a believable exit line, "ended": true, this practice limit is not evidence of poor communication; original goal attainment and skill are separate.`;
  const options: ChatOpts = {
    model: fastModel,
    maxTokens: 1800,
    thinking: false,
    system: [
      { text: roleplaySystem({ ...scenario, maxTurns: limit }, learnerCharacterId, lang, learnerName), cache: true },
      ...(input.practiceMode==='key-turn'?[{text:'This is a short replay of the first response to the six-slide request. Only the supplied transcript has happened in this branch. Keep each reply concise and playable: one concrete reaction and at most one follow-up question. Respect the learner’s refusal, limited offer, joke, repair or question while keeping Tang’s interests and bargaining resistance. Do not assume a previous attempt, a later disclosure, a new deadline, source document or accepted commitment. Tang only said this afternoon: her exact deadline is UNKNOWN. The boss specifically identified faulty reasoning on page three; withholding that fact must not turn into claiming the boss never specified anything. A page-number question can be answered with page three without revealing its hidden reason. Listing questions never includes editing: you may ASK for a different offer once, but do not describe edits as owed, accepted or inevitable. After the learner repeats a boundary, change to the practical consequence: Tang must handle the remainder or ask someone else, while deciding whether the limited offer helps. A clear refusal of all help leaves Tang disappointed with responsibility for her task; do not endlessly relabel the same refused work. The learner chooses when to review; never force a concession or ending to fit the four-reply window.'}]:[]),
      ...(input.practiceMode==='key-turn'?[{text:officeFeedbackRequested(messages)?'The learner asked for the original boss feedback: you may reveal the reasoning issue, accurately.':'The learner has NOT asked for the boss’s original feedback. Keep the reasoning problem private, even when accepting limited help. Name page three without explaining the hidden reason. All six and this afternoon are YOUR wishes, not confirmed boss requirements.'}]:[]),
      { text: `Learner turns used in this practice: ${learnerTurns}; current segment boundary: ${limit} (${remaining} until the next optional checkpoint). ${remaining === 0 ? "This is a user-controlled checkpoint, not a forced ending. Answer the current move normally. Do not manufacture an exit, a concession or a goodbye." : "The learner can continue beyond this segment; do not rush toward an ending."}${silenceNote}
OUTPUT REMINDER: The opening and older stored assistant turns may contain only utterances. Their missing metadata is NOT the format to copy. Your new reply MUST be one JSON object with meta FIRST (${scenario.objectives.length} objective booleans, ended, stance, revealed) and utterances AFTER. Always include both, even late in a long conversation. Do not emit a free-form meta.note. Use only the named cast. characterId is a single ID string, never an ID followed by a person's name.
REALITY CHECK FOR THIS REPLY: Before saying anything was agreed or done, identify the actual transcript line establishing acceptance or performance. Offering to list questions, read a page or check a setting does not mean it was performed. Keep counteroffers explicitly proposed. When a name, gender, document detail, date or number is absent from the scenario/history, leave it unknown instead of inventing it for vividness. Each character earns their OWN private disclosure separately; a question to one person does not unlock another person's hidden fact. A settled refusal changes the problem to the remaining choices, rather than an endless disguised request for the same refused action.` },
    ],
    messages: turns,
  };
  const run = llm.chatStream(options);
  const output = roleplayOutput(scenario, learnerCharacterId, lang,roleplaySpeechGuard(scenario.id,messages,input.practiceMode==='key-turn'),messages);
  let raw = "";
  let sent = "";
  for await (const d of run.deltas) {
    raw += d;
    const preview = output.preview(raw);
    if (preview.startsWith(sent) && preview.length > sent.length) {
      onDelta?.(preview.slice(sent.length));
      sent = preview;
    }
  }
  if(run.refused())throw new LLMError(pick({zh:"模型未能回应这次请求，请调整说法或稍后重试。",en:"The model declined this request. Rephrase or retry later."},lang),422);
  let complete: string;
  try { complete = output.complete(run.text()); }
  catch (error) {
    // One bounded repair is safe only before any NPC line has been shown.
    // Once a line is visible, recovery must keep it out of durable evidence.
    if (sent || run.refused()) throw error;
    const repair = await llm.chatText({ ...options, system: [
      ...(Array.isArray(options.system) ? options.system : [{ text: options.system }]),
      { text: `${error instanceof RoleplayFactError?error.correction:'Your previous draft had invalid JSON or missing required fields.'} No reply was accepted. Repair this SAME exchange, using the same facts, history and latest learner words. Return ONLY valid JSON with meta and utterances, including every required field. Do not count this as a new turn or invent a transition.` },
    ] });
    complete = output.complete(repair);
  }
  // Never silently turn a visible partial line into different durable evidence.
  if (!complete.startsWith(sent)) throw new LLMError(lang === "zh" ? "回复中断了，你的话已保留，请重试。" : "The reply was interrupted. Your words are saved; please retry.", 502);
  onDelta?.(complete.slice(sent.length));
  return complete;
}
