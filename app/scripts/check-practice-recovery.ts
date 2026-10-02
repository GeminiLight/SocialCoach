/** Browser error/refresh regressions. Run against localhost: UX_BASE_URL=... npx tsx scripts/check-practice-recovery.ts */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scenarioById } from "../src/data/corpus";
import { buildSession } from "../src/lib/session-utils";
import type { ChatMessage, Session } from "../src/lib/types";

const base = process.env.UX_BASE_URL ?? "http://localhost:3101";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const session = `socialcoach-recovery-${process.pid}`;
const artifacts = process.env.UX_ARTIFACTS ?? join(tmpdir(), session);
mkdirSync(artifacts, { recursive: true });
function browser(args: string[], input?: string) {
  const result = JSON.parse(execFileSync("agent-browser", ["--session", session, "--json", ...args], { input, encoding: "utf8", timeout: 45000 }));
  assert(result.success, JSON.stringify(result.error));
  return result.data;
}
const evaluate = (code: string) => browser(["eval", "--stdin"], code).result;
const wait = (code: string) => browser(["wait", "--fn", code]);
const screenshot = (name: string) => {
  wait("!document.getAnimations().some(a=>a.playState==='running' && a.effect.getTiming().iterations!==Infinity)");
  browser(["screenshot", join(artifacts, name)]);
};
const saved = () => JSON.parse(evaluate("localStorage.getItem('socialcoach.v1')")).state;
let failures = 0;
function check(name: string, condition: unknown) {
  if (condition) console.log(`PASS ${name}`);
  else { failures++; console.error(`FAIL ${name}`); }
}
function open(path: string) {
  browser(["open", base + path]);
  wait("document.querySelector('h1') !== null");
}
const sc = scenarioById("declining-extra-hours")!;
const prepared = buildSession(sc, "arena", "zh");
const opening: ChatMessage = { id: "opening", role: "npc", characterId: sc.opening.characterId, text: sc.opening.text.zh, ts: 1 };
const active: Session = { ...prepared, id: "recovery-chat", status: "active", timed: false,
  adaptation: { learnerCharacterId: "you", briefing: sc.background.zh, objectives: sc.objectives.map(o => o.zh), focus: "", why: "" }, messages: [opening] };
const brief = { ...prepared, id: "recovery-briefing" };
const state = { profile: { name: "Recovery Fixture", bio: "无管理权限", goals: ["communication"], contexts: [], lang: "zh", createdAt: 1 },
  sessions: [brief, active], proficiency: { communication: 2 }, customScenarios: [], bookmarks: [], practiceDays: [], todaySessionId: null,
  todayDate: null, patternInsight: null, settings: { theme: "light", tts: false, telemetry: false } };
const seed = (data = state) => evaluate(`localStorage.setItem('socialcoach.v1', ${JSON.stringify(JSON.stringify({ state: data, version: 0 }))}); true`);
const partial = `@@meta\n${JSON.stringify({ objectives: sc.objectives.map(() => false), stance: 30, ended: false })}\n@@${sc.opening.characterId}\nHALF_REPLY_MUST_NOT_BECOME_EVIDENCE\n@@error\nSynthetic stream interrupted`;
try {
  browser(["open", "about:blank"]);
  browser(["network", "route", "**/api/track", "--body", "{}"]);
  browser(["network", "route", "**/api/feedback", "--body", '{"available":false}']);
  browser(["network", "route", "**/api/assess", "--abort"]);
  browser(["network", "route", "**/api/schedule", "--abort"]);
  browser(["network", "route", "**/api/roleplay", "--body", partial]);
  open("/onboarding");
  seed();
  if (process.env.RECOVERY_RECORD === "1") browser(["record", "start", join(artifacts, "recovery-flow.webm")]);
  open("/practice/recovery-briefing");
  wait("document.querySelector('[role=alert]') !== null");
  screenshot("preparation-failure.png");
  check("failed role adaptation keeps the start button disabled", evaluate("(() => { const buttons=Array.from(document.querySelectorAll('button')).filter(e => e.textContent.includes('进入对话')); return buttons.length > 0 && buttons.every(e=>e.disabled); })()"));

  open("/practice/recovery-chat");
  browser(["fill", "textarea", "我今晚不能留下，需要先说清现有安排。"]);
  browser(["click", "button[aria-label=发送]"]);
  wait("document.querySelector('[role=alert]') !== null");
  screenshot("stream-failure.png");
  check("an interrupted reply is absent from the durable transcript", !saved().sessions.find((s: { id: string }) => s.id === active.id).messages.some((m: { text: string }) => m.text.includes("HALF_REPLY")));
  browser(["find", "role", "button", "click", "--name", "重试", "--exact"]);
  wait("document.querySelector('textarea').value.includes('我今晚不能留下')");
  check("retry restores the learner's words and leaves no incomplete NPC answer", !saved().sessions.find((s: { id: string }) => s.id === active.id).messages.some((m: { text: string }) => m.text.includes("HALF_REPLY")));

  // Simulate a refresh after sending, before receiving any complete response.
  const unanswered: Session = { ...active, messages: [opening, { id: "unanswered", role: "learner", text: "刷新时还没收到完整回复。", ts: 2 }] };
  seed({ ...state, sessions: [brief, unanswered] });
  open("/practice/recovery-chat");
  screenshot("refresh-unanswered.png");
  check("refresh offers recovery for a learner message with no reply", evaluate("document.querySelector('[role=alert]')?.textContent.includes('重试') === true"));
  check("a pending unanswered turn cannot accept another learner message", evaluate("document.querySelector('textarea')?.disabled === true && document.querySelector('button[aria-label=发送]')?.disabled === true"));

  const silence: ChatMessage = { id: "unanswered-silence", role: "event", kind: "silence", text: "沉默了 15 秒", ts: 3 };
  seed({ ...state, sessions: [brief, { ...active, messages: [opening, silence] }] });
  open("/practice/recovery-chat");
  check("refresh after an unanswered silence explains its own recovery", evaluate("document.querySelector('[role=alert]')?.textContent.includes('沉默') === true && document.querySelector('textarea')?.disabled === true"));
  browser(["find", "role", "button", "click", "--name", "继续对话", "--exact"]);
  check("silence recovery removes the unanswered event and unlocks input", evaluate("document.querySelector('textarea')?.disabled === false && !document.querySelector('[role=alert]')") && !saved().sessions.find((s: { id: string }) => s.id === active.id).messages.some((m: { id: string }) => m.id === silence.id));

  const capped = { ...active, scenario: { ...sc, maxTurns: 1 } };
  seed({ ...state, sessions: [brief, capped] });
  open("/practice/recovery-chat");
  browser(["network", "unroute", "**/api/roleplay"]);
  browser(["network", "route", "**/api/roleplay", "--body", `@@meta\n${JSON.stringify({ objectives: sc.objectives.map(() => false), stance: 30, ended: false })}\n@@${sc.opening.characterId}\nCOMPLETE_FINAL_REPLY`]);
  browser(["fill", "textarea", "这是最后一个回合。"]);
  browser(["click", "button[aria-label=发送]"]);
  wait("document.querySelector('.chat-transcript')?.textContent.includes('COMPLETE_FINAL_REPLY') === true");
  check("the final-turn pause prevents extra input", evaluate("document.querySelector('textarea')?.disabled === true && document.querySelector('button[aria-label=发送]')?.disabled === true"));
  screenshot("final-turn.png");
  open("/practice/recovery-chat");
  wait("document.querySelector('.chat-transcript') === null");
  check("refresh during the final pause does not reopen the scene", saved().sessions.find((s: { id: string }) => s.id === active.id).status === "ended");

  seed();
  open("/practice/recovery-chat");
  evaluate(`(() => {
    const original = window.fetch;
    window.fetch = (url, options) => String(url).endsWith('/api/roleplay') ? Promise.resolve(new Response(new ReadableStream({ start(controller) { window.__recoveryStream = controller; options.signal.addEventListener('abort', () => { window.__recoveryAborted = true; }); } }))) : original(url, options);
    return true;
  })()`);
  browser(["fill", "textarea", "我先说清自己的安排。"]);
  browser(["click", "button[aria-label=发送]"]);
  wait("!!window.__recoveryStream");
  evaluate(`window.__recoveryStream.enqueue(new TextEncoder().encode(${JSON.stringify(`@@${sc.opening.characterId}\nSTREAM_PREVIEW_ONLY`)})); true`);
  wait("document.body.innerText.includes('STREAM_PREVIEW_ONLY')");
  check("streaming text stays visible without becoming durable evidence", !saved().sessions.find((s: { id: string }) => s.id === active.id).messages.some((m: { text: string }) => m.text.includes("STREAM_PREVIEW")));
  browser(["click", "button[aria-label='暂停或结束练习']"]);
  browser(["find", "role", "button", "click", "--name", "保存进度，稍后继续", "--exact"]);
  wait("location.pathname === '/' && window.__recoveryAborted === true");
  evaluate(`window.__recoveryStream.enqueue(new TextEncoder().encode(${JSON.stringify("\nLATE_REPLY_AFTER_LEAVING")})); window.__recoveryStream.close(); true`);
  screenshot("paused-stream.png");
  check("leaving aborts the reply and late chunks cannot enter the transcript", !saved().sessions.find((s: { id: string }) => s.id === active.id).messages.some((m: { text: string }) => m.text.includes("STREAM_PREVIEW") || m.text.includes("LATE_REPLY")));
  open("/practice/recovery-chat");
  check("a paused unfinished reply offers recovery on return", evaluate("document.querySelector('[role=alert]')?.textContent.includes('重试') === true"));
  if (process.env.RECOVERY_RECORD === "1") browser(["record", "stop"]);
  process.exitCode = failures ? 1 : 0;
  console.log(`Artifacts: ${artifacts}`);
} finally {
  browser(["close"]);
}
