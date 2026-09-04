import type { Scenario } from "@/data/corpus/types";
import type { Lang, SkillId } from "@/data/taxonomy";
import type { Adaptation, ChatMessage, Prescription, Profile, Proficiency, Report, RetrievalTrace, RoleplayMeta } from "./types";
import { parsePartialJSON } from "./partial-json";
import { byokConfig } from "./byok";
import { makeByokLLM } from "./llm-client";
import type { LLM } from "./llm-core";
import { runSchedule } from "./tasks/schedule";
import { runRehearse } from "./tasks/rehearse";
import { runHint } from "./tasks/hint";
import { runRoleplay } from "./tasks/roleplay";
import { runReflect } from "./tasks/reflect";
import { runAssess } from "./tasks/assess";
import type { AssessInput, ReflectInput, ScheduleInput, TurnInput } from "./tasks/types";

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

const OFFLINE_MSG = { zh: "看起来断网了，连上网络后再试。", en: "You seem to be offline. Reconnect and try again." };
function offlineError(lang?: Lang) {
  return new Error(OFFLINE_MSG[lang === "en" ? "en" : "zh"]);
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
  const res = await safeFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }, (body as { lang?: Lang })?.lang);
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = ((await res.json()) as { error?: string }).error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export interface ScheduleResult {
  scenario: Scenario;
  prescription?: Prescription;
  adaptation: Adaptation;
  retrieval?: RetrievalTrace;
}

export function schedule(body: {
  profile: Profile;
  proficiency: Proficiency;
  history: { scenarioId: string; title: string; skills: string[]; context: string; outcome?: string; stars?: number; at: number }[];
  lang: Lang;
  scenarioId?: string;
  scenario?: Scenario;
}, signal?: AbortSignal) {
  const o = own();
  if (o) return runSchedule(body as ScheduleInput, o.llm, o.fast);
  return post<ScheduleResult>("/api/schedule", body, signal);
}

/**
 * Stream the assessment. onPartial receives a best-effort parse of the report so far;
 * resolves with the server-sanitized final report.
 */
export async function assessStream(
  body: { scenario: Scenario; learnerCharacterId: string; messages: ChatMessage[]; lang: Lang; goals: SkillId[]; learnerName?: string; objectiveDone?: boolean[]; outcome?: string },
  onPartial: (p: Partial<Report>) => void,
): Promise<Report> {
  const o = own();
  if (o) {
    let acc = "";
    return runAssess(body as AssessInput, o.llm, o.smart, (d) => {
      acc += d;
      const p = parsePartialJSON<Report>(acc);
      if (p) onPartial(p);
    });
  }
  const full = await streamText("/api/assess", body, (acc) => {
    const cut = acc.indexOf("\n@@");
    const head = cut === -1 ? acc : acc.slice(0, cut);
    const p = parsePartialJSON<Report>(head);
    if (p) onPartial(p);
  });
  const FIN = "\n@@final\n";
  const err = full.indexOf(ERR);
  if (err !== -1) throw new Error(full.slice(err + ERR.length).trim());
  const fin = full.indexOf(FIN);
  if (fin === -1) throw new Error("Assessment ended unexpectedly.");
  return JSON.parse(full.slice(fin + FIN.length)) as Report;
}

export function hint(body: TurnInput) {
  const o = own();
  if (o) return runHint(body, o.llm, o.fast);
  return post<{ hint: string }>("/api/hint", body);
}

export function rehearse(body: { description: string; lang: Lang; profile?: Partial<Profile> }) {
  const o = own();
  if (o) return runRehearse(body, o.llm, o.fast);
  return post<{ scenario: Scenario }>("/api/rehearse", body);
}

const ERR = "\n@@error\n";

/**
 * One exchange of the simulation. `onText` receives the accumulated protocol
 * text; the caller parses it with `parseRoleplay`, which also surfaces an
 * in-stream `@@error`.
 */
export async function roleplayStream(body: TurnInput, onText: (full: string) => void, signal?: AbortSignal): Promise<string> {
  const o = own();
  if (o) {
    let acc = "";
    return runRoleplay(body, o.llm, o.fast, (d) => {
      acc += d;
      onText(acc);
    });
  }
  return streamText("/api/roleplay", body, onText, signal);
}

/** The coach's reply to a reflection answer. */
export async function reflectStream(body: ReflectInput, onText: (full: string) => void): Promise<string> {
  const o = own();
  if (o) {
    let acc = "";
    return runReflect(body, o.llm, o.fast, (d) => {
      acc += d;
      onText(acc);
    });
  }
  const full = await streamText("/api/reflect", body, onText);
  const err = full.indexOf(ERR);
  if (err !== -1) throw new Error(full.slice(err + ERR.length).trim());
  return full;
}

/** Stream plain text from an endpoint; calls onText with the accumulated text. */
export async function streamText(url: string, body: unknown, onText: (full: string) => void, signal?: AbortSignal): Promise<string> {
  const res = await safeFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal }, (body as { lang?: Lang })?.lang);
  if (!res.ok || !res.body) {
    let msg = res.statusText;
    try {
      msg = ((await res.json()) as { error?: string }).error ?? msg;
    } catch {}
    throw new Error(msg);
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
    if (metaBuf) {
      metaBuf.push(line);
      continue;
    }
    const m = line.match(/^@@\s*([\w-]+)\s*$/);
    if (m) {
      flush();
      const id = m[1].toLowerCase();
      if (id === "meta") metaBuf = [];
      else if (id === "error") errBuf = [];
      else {
        const match = validIds.find((v) => v.toLowerCase() === id) ?? validIds[0];
        cur = { characterId: match, text: "" };
      }
      continue;
    }
    if (!cur) {
      // text before any marker: attribute to the first NPC
      if (line.trim()) cur = { characterId: validIds[0], text: line + "\n" };
      continue;
    }
    cur.text += line + "\n";
  }
  flush();
  if (errBuf) out.error = errBuf.join("\n").trim();
  if (metaBuf) {
    const txt = metaBuf.join("\n").trim();
    try {
      const j = JSON.parse(txt) as RoleplayMeta;
      out.meta = { objectives: Array.isArray(j.objectives) ? j.objectives.map(Boolean) : [], ended: !!j.ended, outcome: j.outcome ?? null, note: j.note };
    } catch {
      out.meta = null; // still streaming
    }
  }
  return out;
}
