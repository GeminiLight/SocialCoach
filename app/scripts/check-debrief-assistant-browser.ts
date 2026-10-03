/** Local-only UI regression: UX_BASE_URL=http://localhost:3101 npx tsx scripts/check-debrief-assistant-browser.ts */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fixtureReply, fixtureSession } from "./check-debrief-assistant";

const base = process.env.UX_BASE_URL ?? "http://localhost:3101";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const session = `socialcoach-debrief-test-${process.pid}`;
const artifacts = process.env.UX_ARTIFACTS ?? join(tmpdir(), session);
mkdirSync(artifacts, { recursive: true });
function browser(args: string[], input?: string) {
  const data = JSON.parse(execFileSync("agent-browser", ["--session", session, "--json", ...args], { input, encoding: "utf8", timeout: 60000 }));
  assert(data.success, JSON.stringify(data.error)); return data.data;
}
const evaluate = (code: string) => browser(["eval", "--stdin"], code).result;
const wait = (code: string) => browser(["wait", "--fn", code]);
const button = (name: string) => browser(["find", "role", "button", "click", "--name", name, "--exact"]);
const fill = (text: string) => browser(["fill", "#debrief-question", text]);
let count = 0;
function check(name: string, condition: unknown) { assert(condition, name); count++; console.log(`PASS ${name}`); }
const fixture = fixtureSession();
const state = { profile: { name: "Assistant Test", bio: "", goals: ["building-relationships"], contexts: ["intimate"], lang: "zh", createdAt: 1 }, sessions: [fixture], settings: { theme: "light", telemetry: false, tts: false }, proficiency: { "building-relationships": 2 }, practiceDays: [], customScenarios: [], bookmarks: [], todaySessionId: null, todayDate: null, patternInsight: null };
const saved = () => JSON.parse(evaluate("localStorage.getItem('socialcoach.v1')")).state;
const installMock = () => evaluate(`window.__questions=[]; window.__mode='ok'; window.__originalFetch ??= window.fetch; window.fetch=async (url, init)=>{
 if(String(url)!=='/api/debrief-chat') return window.__originalFetch(url,init);
 window.__questions.push(JSON.parse(init.body));
 if(window.__mode==='fail') return Response.json({error:'Fixture network failure'},{status:503});
 if(window.__mode==='slow') return new Promise(resolve=>window.__resolve=()=>resolve(Response.json(${JSON.stringify(fixtureReply)})));
 return Response.json(${JSON.stringify(fixtureReply)});
}; true`);
function open() {
  browser(["open", `${base}/practice/${fixture.id}`]); wait("document.querySelector('#review-assistant') !== null");
  wait("Array.from(document.querySelectorAll('[style]')).filter(e => e.style.opacity && e.style.transform && e.getClientRects().length).every(e => Number(getComputedStyle(e).opacity) >= 0.999)");
  installMock();
}

try {
  browser(["open", "about:blank"]);
  browser(["network", "route", "**/api/health*", "--body", '{"state":"available","serverKey":true,"requireByok":false}']);
  browser(["network", "route", "**/api/track", "--body", "{}"]);
  browser(["network", "route", "**/api/feedback", "--body", '{"available":false}']);
  browser(["open", base + "/onboarding"]);
  evaluate(`localStorage.setItem('socialcoach.v1', ${JSON.stringify(JSON.stringify({ state, version: 0 }))}); true`);
  open();
  button("复盘助手");
  check("reading guide brings focus to the assistant input", evaluate("document.activeElement.id === 'debrief-question'"));
  evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('对等的自我暴露建立亲密')).scrollIntoView({block:'center',behavior:'instant'}); true");
  browser(["find", "role", "button", "click", "--name", "对等的自我暴露建立亲密"]);
  wait("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('对等的自我暴露建立亲密') && b.getAttribute('aria-expanded')==='true')");
  wait("!document.getAnimations().some(a => a.playState === 'running' && a.effect.getTiming().iterations !== Infinity)");
  button("问问如何用");
  check("knowledge card prefills a specific question without spending model quota", evaluate("document.querySelector('#debrief-question').value.includes('对等的自我暴露建立亲密') && window.__questions.length === 0"));
  button("发送问题");
  wait("document.querySelector('[role=log]')?.textContent.includes('自我暴露是分享') && document.querySelector('#debrief-question').value === ''");
  check("assistant renders actual evidence before explanation and clearly labels suggestions", evaluate("document.querySelector('[role=log]').textContent.indexOf('证据') >= 0 && document.querySelector('[role=log]').textContent.indexOf('证据') < document.querySelector('[role=log]').textContent.indexOf('自我暴露是分享') && document.querySelector('[role=log]').textContent.includes('示范说法')"));
  check("bibliography names the actual author and source", evaluate("document.querySelector('[role=log]').textContent.includes('Arthur Aron')"));
  fill("如果对方只回答一个词，怎么办？"); button("发送问题"); wait("window.__questions.length === 2 && document.querySelector('#debrief-question').value === ''");
  check("follow-up carries this practice and the prior Q&A", evaluate("window.__questions[1].history.length === 1 && window.__questions[1].transcript.length === 2 && !JSON.stringify(window.__questions).includes('PRIVATE_')"));
  check("two replies persist separately without changing transcript, report or proficiency", saved().sessions[0].debriefChat.length === 2 && JSON.stringify(saved().sessions[0].report) === JSON.stringify(fixture.report) && saved().sessions[0].messages.length === fixture.messages.length && saved().proficiency["building-relationships"] === 2 && saved().practiceDays.length === 0);
  fill("还没发出的追问"); open();
  check("refresh restores completed history and unsent draft", saved().sessions[0].debriefChat.length === 2 && evaluate("document.querySelector('#debrief-question').value === '还没发出的追问'"));
  evaluate("window.__mode='fail'; true"); button("发送问题"); wait("document.querySelector('#review-assistant [role=alert]') !== null");
  check("failed request preserves input and adds no unfinished Q&A", evaluate("document.querySelector('#debrief-question').value === '还没发出的追问'") && saved().sessions[0].debriefChat.length === 2);
  wait("document.querySelector('#model-key') !== null"); browser(["press", "Escape"]); wait("!document.querySelector('dialog[open]')");
  evaluate("window.__mode='ok'; true"); button("重新检查"); wait("!Array.from(document.querySelectorAll('#review-assistant button')).find(b=>b.textContent.includes('重试这个问题')).disabled"); button("重试这个问题"); wait("document.querySelector('#debrief-question').value === ''");
  check("retry stores exactly one completed exchange", saved().sessions[0].debriefChat.length === 3);
  fill("请再举个例子"); evaluate("window.__mode='slow'; true"); button("发送问题"); wait("document.querySelector('#review-assistant [role=status]') !== null");
  check("busy state shows honest progress and prevents duplicate submissions", evaluate("document.querySelector('#debrief-question').disabled"));
  button("停止回答");
  wait("!document.querySelector('#debrief-question').disabled");
  evaluate("window.__resolve(); true");
  check("stopping rejects late results and keeps the question", saved().sessions[0].debriefChat.length === 3 && evaluate("document.querySelector('#debrief-question').value === '请再举个例子'"));
  evaluate("window.__mode='ok'; true"); browser(["click", "#debrief-question"]); browser(["press", "Control+Enter"]); wait("document.querySelector('#debrief-question').value === ''");
  check("stopped question can be sent successfully with the keyboard shortcut", saved().sessions[0].debriefChat.length === 4);
  const scans: unknown[] = [];
  for (const lang of ["zh", "en"] as const) for (const theme of ["light", "dark"]) for (const width of [360, 1440]) {
    const data = saved(); data.profile.lang = lang; data.settings.theme = theme;
    evaluate(`localStorage.setItem('socialcoach.v1', ${JSON.stringify(JSON.stringify({ state: data, version: 0 }))}); true`);
    browser(["set", "viewport", String(width), "900"]); open();
    button(lang === "zh" ? "复盘助手" : "Debrief assistant");
    wait("!document.getAnimations().some(a => a.playState === 'running' && a.effect.getTiming().iterations !== Infinity)");
    check(`${lang}/${theme}/${width}: no horizontal overflow`, evaluate("document.documentElement.scrollWidth <= innerWidth && document.querySelector('#review-assistant').scrollWidth <= document.querySelector('#review-assistant').clientWidth"));
    check(`${lang}/${theme}/${width}: touch targets and accessible input`, evaluate("Array.from(document.querySelectorAll('#review-assistant button')).every(b=>b.getBoundingClientRect().height>=44) && document.querySelector('label[for=debrief-question]') !== null"));
    browser(["screenshot", join(artifacts, `assistant-${lang}-${theme}-${width}.png`)]);
    const scan = browser(["a11y", "--tags", "wcag2a,wcag2aa", "--selector", "#review-assistant"]);
    scans.push({ lang, theme, width, ...scan });
    check(`${lang}/${theme}/${width}: no automatic accessibility violations`, scan.counts.violations === 0);
  }
  writeFileSync(join(artifacts, "accessibility.json"), JSON.stringify(scans, null, 2));
  fill("Unfinished question when leaving"); evaluate("window.__mode='slow'; true"); button("Send question");
  wait("document.querySelector('#debrief-question').disabled");
  button("Back to today"); wait("location.pathname === '/' && document.querySelector('#review-assistant') === null");
  evaluate("window.__resolve(); true");
  check("leaving the report prevents late replies from altering its history", saved().sessions[0].debriefChat.length === 4);
  browser(["open", base + "/settings"]); wait("document.querySelector('h1') !== null");
  evaluate("URL.createObjectURL=blob=>{window.__exportBlob=blob;return 'blob:fixture-export'}; true");
  browser(["find", "role", "button", "click", "--name", "Export all data (JSON)"]);
  check("export includes the assistant history with the original practice", evaluate("window.__exportBlob.text().then(text=>{const data=JSON.parse(text); return data.sessions[0].debriefChat.length===4 && data.sessions[0].messages.length===3;})"));
  console.log(`debrief assistant UI: ${count} checks passed; evidence: ${artifacts}`);
} finally { browser(["close"]); }
