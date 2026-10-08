import type { Scenario } from "@/data/corpus/types";
import type { Lang } from "@/data/taxonomy";
import type { Adaptation, Prescription, Profile, Report, RetrievalTrace, RoleplayMeta } from "./types";
import { parsePartialJSON } from "./partial-json";
import { byokConfig } from "./byok";
import { withModelAccess } from "./model-access";
import { readModelFailure, type ModelIssue } from "./model-status";
import { makeByokLLM } from "./llm-client";
import {taskLLM} from "./task-runtime";
import {taskInput,TaskInputSchemas} from "./task-input";
import type { LLM } from "./llm-core";
import { runSchedule } from "./tasks/schedule";
import { runRehearse } from "./tasks/rehearse";
import { runHint } from "./tasks/hint";
import { runRoleplay } from "./tasks/roleplay";
import { runReflect } from "./tasks/reflect";
import { runDebriefChat } from "./tasks/debrief-chat";
import type { DebriefChatInput } from "./debrief-chat";
import type { DebriefReply } from "./types";
import { runAssess } from "./tasks/assess";
import { runPattern } from "./tasks/pattern";
import type { AssessInput, PatternInput, PatternResult, ReflectInput, ScheduleInput, TurnInput } from "./tasks/types";
import { track } from "./analytics/track";
import type { TrackEvent } from "./analytics/schema";

/**
 * The one place that decides where a model call goes.
 *
 * With the learner's own credentials configured, the task runs here in the
 * browser and talks to their endpoint directly — their key never reaches our
 * server. Otherwise it goes to `/api/*` and the deployment's key.
 *
 * There is deliberately no fallback between the two: if the learner's own
 * endpoint fails, that error surfaces. Quietly retrying on our key would spend
 * someone else's money while the learner believed they were on their own quota.
 */
function own(): { llm: LLM; fast: string; smart: string } | null {
  const c = byokConfig();
  return c ? { llm: makeByokLLM(c), fast: c.fastModel.trim(), smart: c.smartModel.trim() } : null;
}

type Task = Extract<TrackEvent, { name: "api_error" }>["task"];

/** A failed call, with the number analytics needs and the message the learner sees. */
export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly kind: "http" | "network" | "stream", public readonly modelIssue?: ModelIssue | null,public readonly retryAt?:number) {
    super(message);
  }
}

/**
 * Report a failure as the learner saw it: task, kind and status code only.
 * A learner's own endpoint failing is theirs, but it still explains a bad
 * session, so it is recorded with `byok` set rather than dropped.
 */
function reportFailure(task: Task, e: unknown, byok: boolean) {
  if (e instanceof DOMException && e.name === "AbortError") return;
  const status = e instanceof ApiError ? e.status : typeof (e as { status?: unknown })?.status === "number" ? (e as { status: number }).status : 0;
  const transport = (e as { kind?: string })?.kind;
  const kind = transport === "http" || transport === "network" || transport === "stream" ? transport : status ? "http" : "network";
  track({ name: "api_error", ts: Date.now(), task, kind, status: Math.max(0, Math.min(999, status)), byok });
}

/** Run a task and record its failure before rethrowing it unchanged. */
export async function watched<T>(task: Task, byok: boolean, lang: Lang, run: () => Promise<T>): Promise<T> {
  try {
    return await withModelAccess(lang, run);
  } catch (e) {
    reportFailure(task, e, byok);
    throw e;
  }
}

const OFFLINE_MSG = { zh: "看起来断网了，连上网络后再试。", en: "You seem to be offline. Reconnect and try again." };
function offlineError(lang?: Lang) {
  return new ApiError(OFFLINE_MSG[lang === "en" ? "en" : "zh"], 0, "network");
}
async function safeFetch(url: string, init: RequestInit, lang?: Lang) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw offlineError(lang);
  try {
    return await fetch(url, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw offlineError(lang);
  }
}

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await safeFetch(url, { method: "POST", headers: { "Content-Type": "application/json","Accept-Language":(body as {lang?:Lang})?.lang??"zh" }, body: JSON.stringify(body), signal }, (body as { lang?: Lang })?.lang);
  if (!res.ok) {
    let msg = res.statusText;
    let issue: ModelIssue | null | undefined;
    let retryAt:number|undefined;
    try {
      const failure = readModelFailure(JSON.stringify(await res.json()));
      msg = failure.error || msg;
      issue = failure.modelIssue;retryAt=failure.retryAt;
    } catch {}
    throw new ApiError(msg, res.status, "http", issue,retryAt);
  }
  return (await res.json()) as T;
}

export interface ScheduleResult {
  scenario: Scenario;
  prescription?: Prescription;
  adaptation: Adaptation;
  retrieval?: RetrievalTrace;
}

export async function debriefChat(body: DebriefChatInput, signal?: AbortSignal): Promise<DebriefReply> {
  const o = own();
  return watched("debrief-chat", !!o, body.lang, async () => {
    signal?.throwIfAborted();
    const reply = o ? await runDebriefChat(body,taskLLM(o.llm,"debrief-chat",signal,undefined,body.lang),o.fast,signal) : await post<DebriefReply>("/api/debrief-chat", body, signal);
    signal?.throwIfAborted();
    return reply;
  });
}

export function schedule(body:ScheduleInput, signal?:AbortSignal) {
  const o = own();
  return watched("schedule", !!o, body.lang, () => (o ? runSchedule(taskInput(TaskInputSchemas.schedule,body),taskLLM(o.llm,"schedule",signal,undefined,body.lang), o.fast) : post<ScheduleResult>("/api/schedule", body, signal)));
}

/**
 * Stream the assessment. onPartial receives a best-effort parse of the report so far;
 * resolves with the server-sanitized final report.
 */
export async function assessStream(
  body: AssessInput,
  onPartial: (p: Partial<Report>) => void,
  signal?:AbortSignal,
): Promise<Report> {
  const o = own();
  return watched("assess", !!o, body.lang, async () => {
    signal?.throwIfAborted();
    if (o) {
      let acc = "";
      return runAssess(taskInput(TaskInputSchemas["assess"],body), taskLLM(o.llm,"assess",signal,undefined,body.lang), o.smart, (d) => {
        signal?.throwIfAborted();
        acc += d;
        const p = parsePartialJSON<Report>(acc);
        if (p) onPartial(p);
      },signal);
    }
    const full = await streamText("/api/assess", body, (acc) => {
      const cut = acc.indexOf("\n@@");
      const head = cut === -1 ? acc : acc.slice(0, cut);
      const p = parsePartialJSON<Report>(head);
      if (p) onPartial(p);
    },signal);
    const FIN = "\n@@final\n";
    const err = full.indexOf(ERR);
    if (err !== -1) throw streamFailure(full.slice(err + ERR.length).trim());
    const fin = full.indexOf(FIN);
    if (fin === -1) throw new ApiError("Assessment ended unexpectedly.", 200, "stream");
    signal?.throwIfAborted();
    return JSON.parse(full.slice(fin + FIN.length)) as Report;
  });
}

export function hint(body: TurnInput) {
  const o = own();
  return watched("hint", !!o, body.lang, () => (o ? runHint(taskInput(TaskInputSchemas["hint"],body), taskLLM(o.llm,"hint",undefined,undefined,body.lang), o.fast) : post<{ hint: string }>("/api/hint", body)));
}

export function rehearse(body: { description: string; lang: Lang; profile?: Partial<Profile> }) {
  const o = own();
  return watched("rehearse", !!o, body.lang, () => (o ? runRehearse(taskInput(TaskInputSchemas["rehearse"],body), taskLLM(o.llm,"rehearse",undefined,undefined,body.lang), o.fast) : post<{ scenario: Scenario }>("/api/rehearse", body)));
}

/** The habit across several sessions. Uses the smart model: it reads more and matters more. */
export function pattern(body: PatternInput) {
  const o = own();
  return watched("pattern", !!o, body.lang, () => (o ? runPattern(taskInput(TaskInputSchemas["pattern"],body), taskLLM(o.llm,"pattern",undefined,undefined,body.lang), o.smart) : post<PatternResult>("/api/pattern", body)));
}

const ERR = "\n@@error\n";
function streamFailure(raw: string) {
  const failure = readModelFailure(raw);
  return new ApiError(failure.error, failure.status, "stream", failure.modelIssue,failure.retryAt);
}

/**
 * One exchange of the simulation. `onText` receives the accumulated protocol
 * text; the caller parses it with `parseRoleplay`, which also surfaces an
 * in-stream `@@error`.
 */
export async function roleplayStream(body: TurnInput, onText: (full: string) => void, signal?: AbortSignal): Promise<string> {
  const o = own();
  return watched("roleplay", !!o, body.lang, async () => {
    if (o) {
      let acc = "";
      return runRoleplay(taskInput(TaskInputSchemas["roleplay"],body), taskLLM(o.llm,"roleplay",signal,undefined,body.lang), o.fast, (d) => {
        acc += d;
        onText(acc);
      });
    }
    const full = await streamText("/api/roleplay", body, onText, signal);
    // Read errors before reporting success, including HTTP 200 streams.
    if (full.includes(ERR)) throw streamFailure(full.slice(full.indexOf(ERR) + ERR.length).trim());
    return full;
  });
}

/** Delivers only a verified reflection. JSON transport keeps literal protocol
 * markers in a learner quotation from being mistaken for stream errors. */
export async function reflectStream(body:ReflectInput,onText:(full:string)=>void,signal?:AbortSignal):Promise<string>{
 const o=own();
 return watched('reflect',!!o,body.lang,async()=>{
  const reply=o?await runReflect(taskInput(TaskInputSchemas.reflect,body),taskLLM(o.llm,'reflect',signal,undefined,body.lang),o.fast,undefined,signal):(await post<{reply:string}>('/api/reflect',{...body,responseFormat:'json'},signal)).reply;
  signal?.throwIfAborted();if(typeof reply!=='string')throw new ApiError('Invalid reflection reply',502,'http');onText(reply);return reply;
 });
}

/** Stream plain text from an endpoint; calls onText with the accumulated text. */
export async function streamText(url: string, body: unknown, onText: (full: string) => void, signal?: AbortSignal): Promise<string> {
  const res = await safeFetch(url, { method: "POST", headers: { "Content-Type": "application/json","Accept-Language":(body as {lang?:Lang})?.lang??"zh" }, body: JSON.stringify(body), signal }, (body as { lang?: Lang })?.lang);
  if (!res.ok || !res.body) {
    let msg = res.statusText;
    let issue: ModelIssue | null | undefined;
    let retryAt:number|undefined;
    try {
      const failure = readModelFailure(JSON.stringify(await res.json()));
      msg = failure.error || msg;
      issue = failure.modelIssue;retryAt=failure.retryAt;
    } catch {}
    throw new ApiError(msg, res.status, "http", issue,retryAt);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    full += dec.decode(value, { stream: true });
    onText(full);
  }
  return full;
}

/**
 * Parse the role-play protocol:
 *   @@<characterId>\n<utterance>\n@@<characterId>\n<utterance>\n@@meta\n{json}
 * Works on partial text so the UI can render utterances as they stream.
 */
export interface ParsedTurn {
  utterances: { characterId: string; text: string }[];
  meta: RoleplayMeta | null;
  error: string | null;
}

export function parseRoleplay(raw: string, validIds: string[]): ParsedTurn {
  const out: ParsedTurn = { utterances: [], meta: null, error: null };
  const lines = raw.split("\n");
  let cur: { characterId: string; text: string } | null = null;
  let metaBuf: string[] | null = null;
  /** Whether lines are still flowing into the meta block. Its buffer staying
   *  non-null is not the same question: meta leads the turn, so the buffer
   *  outlives the block and must not keep swallowing the dialogue after it. */
  let inMeta = false;
  let errBuf: string[] | null = null;
  const flush = () => {
    if (cur) {
      cur.text = cur.text.trim();
      if (cur.text) out.utterances.push(cur);
    }
    cur = null;
  };
  for (const line of lines) {
    if (errBuf) {
      errBuf.push(line);
      continue;
    }
    const m = line.match(/^@@\s*([\w-]+)\s*$/);
    if (inMeta && !m) {
      metaBuf!.push(line);
      continue;
    }
    if (m) {
      flush();
      const id = m[1].toLowerCase();
      inMeta = false;
      if (id === "meta") {
        metaBuf = metaBuf ?? [];
        inMeta = true;
      } else if (id === "error") errBuf = [];
      else {
        const match = validIds.find((v) => v.toLowerCase() === id) ?? validIds[0];
        cur = { characterId: match, text: "" };
      }
      continue;
    }
    if (!cur) {
      // Text before any marker is dialogue the model forgot to label — except a
      // bare meta object, which must never be spoken aloud as a line.
      const t2 = line.trim();
      if (t2.startsWith("{") || t2.startsWith("```")) {
        if (!metaBuf) {
          metaBuf = [line];
          inMeta = true;
        }
        continue;
      }
      if (t2) cur = { characterId: validIds[0], text: line + "\n" };
      continue;
    }
    cur.text += line + "\n";
  }
  flush();
  if (errBuf) out.error = readModelFailure(errBuf.join("\n").trim()).error;
  if (metaBuf) {
    const raw2 = metaBuf.join("\n").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
    const a = raw2.indexOf("{");
    const b = raw2.lastIndexOf("}");
    const txt = a !== -1 && b > a ? raw2.slice(a, b + 1) : raw2;
    try {
      const j = JSON.parse(txt) as RoleplayMeta;
      const st = typeof j.stance === "number" ? j.stance : NaN;
      out.meta = {
        objectives: Array.isArray(j.objectives) ? j.objectives.map((v) => v === true) : [],
        objectiveEvidence:j.objectiveEvidence,
        ended: j.ended === true,
        closure: j.closure,
        outcome: j.outcome === "success" || j.outcome === "partial" || j.outcome === "failure" ? j.outcome : null,
        // A model that omits the field, or answers with prose, must not move the meter.
        stance: Number.isFinite(st) ? Math.max(0, Math.min(100, Math.round(st))) : undefined,
        revealed: j.revealed === true,
        disclosures:Array.isArray(j.disclosures)?j.disclosures.filter(d=>d&&typeof d.characterId==="string"&&typeof d.quote==="string"):[],
      };
    } catch {
      out.meta = null; // still streaming
    }
  }
  return out;
}
