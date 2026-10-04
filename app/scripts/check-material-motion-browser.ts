/** Local interaction checks: no model inference, no user profile changes. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fixtureSession } from "./check-debrief-assistant";

const base = process.env.UX_BASE_URL ?? "http://localhost:3101";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const session = `material-motion-${process.pid}`;
const artifacts = process.env.UX_ARTIFACTS ?? join(tmpdir(), session);
mkdirSync(artifacts, { recursive: true });
function browser(args: string[], input?: string) {
  const result = JSON.parse(execFileSync("agent-browser", ["--session", session, "--json", ...args], { input, encoding: "utf8", timeout: 60000 }));
  assert(result.success, JSON.stringify(result.error)); return result.data;
}
const evaluate = (code: string) => browser(["eval", "--stdin"], code).result;
const wait = (code: string) => browser(["wait", "--fn", code]);
let checks = 0;
function check(name: string, value: unknown) { assert(value, name); checks++; console.log(`PASS ${name}`); }
const report = fixtureSession();
const state = { profile: { name: "Motion fixture", bio: "", goals: ["communication"], contexts: ["workplace"], lang: "zh", createdAt: 1 }, sessions: [report], settings: { theme: "light", telemetry: false, tts: false }, proficiency: { communication: 2 }, practiceDays: [], customScenarios: [], bookmarks: [], todaySessionId: null, todayDate: null, patternInsight: null };
function open(path: string) {
  browser(["open", base + path]); wait("document.querySelector('h1')!==null");
  wait("document.fonts.status==='loaded' && getComputedStyle(document.querySelector('.app-page')).opacity==='1'");
  browser(["wait", "300"]);
}
const frameSample = `async (selector, action) => {
  const samples=[]; const started=performance.now(); action();
  while(performance.now()-started < 330) {
    await new Promise(requestAnimationFrame);
    const element=document.querySelector(selector); const rect=element?.getBoundingClientRect();
    samples.push({ms:performance.now()-started,opacity:element?Number(getComputedStyle(element).opacity):0,x:rect?.x,y:rect?.y,transform:element?getComputedStyle(element).transform:null});
  }
  return samples;
}`;
try {
  browser(["open", "about:blank"]);
  browser(["network", "route", "**/api/health*", "--body", '{"state":"available","serverKey":true,"requireByok":false}']);
  browser(["network", "route", "**/api/track", "--body", "{}"]);
  browser(["network", "route", "**/api/feedback", "--body", '{"available":false}']);
  for (const endpoint of ["schedule", "roleplay", "assess", "rehearse", "hint", "pattern", "reflect", "debrief-chat"])
    browser(["network", "route", `**/api/${endpoint}`, "--status", "503", "--body", '{"error":"Motion fixture: inference disabled"}']);
  browser(["open", base + "/onboarding"]);
  evaluate(`localStorage.setItem('socialcoach.v1',${JSON.stringify(JSON.stringify({ state, version: 0 }))});true`);
  browser(["set", "viewport", "390", "844"]); open("/arena");
  check("catalog, header and recommendations have no repeated dividing rules", evaluate("['.arena-header','.arena-contexts','.arena-pick','.arena-row','.arena-catalog > div:first-child'].every(s=>getComputedStyle(document.querySelector(s)).borderBottomWidth==='0px')"));
  check("page entrance preserves viewport positioning for fixed actions", evaluate("getComputedStyle(document.querySelector('.app-page')).transform==='none'"));
  const catalogY = evaluate("document.querySelector('.arena-catalog').getBoundingClientRect().y");
  browser(["focus", ".arena-filter-toggle"]);
  const opening = evaluate(`(${frameSample})('#arena-filters',()=>document.querySelector('.arena-filter-toggle').click())`);
  check("filter surface opens through intermediate opacity frames", opening.some((s: { opacity: number }) => s.opacity > 0 && s.opacity < 0.99));
  check("filter entrance settles in under 300 ms", opening.some((s: { opacity: number; ms: number }) => s.opacity >= 0.999 && s.ms < 300));
  check("opening filters leaves the catalog position stable", Math.abs(evaluate("document.querySelector('.arena-catalog').getBoundingClientRect().y") - catalogY) < 1);
  check("filter choices are available without being covered by moving content", evaluate("(()=>{const b=Array.from(document.querySelectorAll('#arena-filters button')).find(b=>b.textContent.includes('清晰沟通'));const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})()"));
  browser(["press", "Tab"]);
  check("keyboard enters the filter form from the trigger", evaluate("document.querySelector('#arena-filters').contains(document.activeElement)"));
  browser(["press", "Escape"]);
  check("Escape closes the panel and returns focus to its trigger", evaluate("document.querySelector('#arena-filters').hidden && document.activeElement===document.querySelector('.arena-filter-toggle')"));
  check("closed filter controls leave the tab order immediately", evaluate("document.querySelector('#arena-filters').inert"));
  const choosing = evaluate(`(${frameSample})('.arena-contexts .choice-indicator',()=>Array.from(document.querySelectorAll('.arena-contexts button')).find(b=>b.textContent.includes('职场')).click())`);
  check("category selection moves continuously between choices", new Set(choosing.map((s: { x: number }) => Math.round(s.x))).size > 2);
  check("selection surface ends under the chosen category", evaluate("(()=>{const b=document.querySelector('.arena-contexts button[aria-pressed=true]');return Math.abs(b.getBoundingClientRect().x-document.querySelector('.arena-contexts .choice-indicator').getBoundingClientRect().x)<2;})()"));
  browser(["click", ".arena-contexts button:nth-child(2)"]);
  check("recent collection and context retain independent selection states", evaluate("new URLSearchParams(location.search).get('collection')==='recent' && new URLSearchParams(location.search).get('context')==='workplace' && document.querySelectorAll('.arena-contexts button[aria-pressed=true]').length===2 && document.querySelectorAll('.arena-contexts .choice-indicator').length===1"));
  browser(["click", ".arena-contexts button:nth-child(2)"]);
  evaluate("document.querySelector('.arena-filter-toggle').click();true");
  browser(["click", ".arena-header h1"]);
  check("clicking outside dismisses filters without losing the category", evaluate("document.querySelector('#arena-filters').hidden && new URLSearchParams(location.search).get('context')==='workplace'"));
  evaluate("const b=document.querySelector('.arena-filter-toggle');b.click();b.click();b.click();true");
  // Separate input events; users can reverse a transition before it settles.
  browser(["click", ".arena-filter-toggle"]); browser(["click", ".arena-filter-toggle"]);
  check("rapid reversals end in the latest requested filter state", evaluate("document.querySelector('.arena-filter-toggle').getAttribute('aria-expanded')==='true' && !document.querySelector('#arena-filters').hidden"));
  browser(["press", "Escape"]);
  open("/learn");
  browser(["click", "li.card > button[aria-controls^=knowledge-]"]);
  check("mobile knowledge opens with accessible content and no overflow", evaluate("document.querySelector('li.card > button').getAttribute('aria-expanded')==='true' && !document.querySelector('.knowledge-reveal').inert && document.documentElement.scrollWidth<=innerWidth"));
  browser(["click", "li.card > button[aria-controls^=knowledge-]"]);
  check("closing knowledge removes descendant actions from keyboard access", evaluate("document.querySelector('.knowledge-reveal').inert && document.querySelector('.knowledge-reveal').hidden"));
  browser(["set", "viewport", "1440", "1000"]); open("/learn");
  evaluate("document.querySelector('#knowledge-reading').scrollTop=450;true");
  browser(["click", "li.card:nth-child(2) > button"]);
  check("a newly selected reading starts at its heading", evaluate("document.querySelector('#knowledge-reading').scrollTop===0 && document.querySelector('li.card:nth-child(2)>button').getAttribute('aria-current')==='true'"));
  browser(["set", "media", "light", "reduced-motion"]); open("/arena");
  const calm = evaluate(`(${frameSample})('.arena-contexts .choice-indicator',()=>Array.from(document.querySelectorAll('.arena-contexts button')).find(b=>b.textContent.includes('家庭')).click())`);
  check("reduced motion changes the category without a traveling selection", calm.every((s: { transform: string }) => s.transform === "none"));
  browser(["click", ".arena-filter-toggle"]);
  check("reduced motion keeps all filter controls and suppresses surface travel", evaluate("!document.querySelector('#arena-filters').hidden && getComputedStyle(document.querySelector('#arena-filters')).transform==='none' && getComputedStyle(document.querySelector('#arena-filters')).transitionDuration.split(',').every(d=>parseFloat(d)<0.001)"));
  browser(["set", "viewport", "390", "600"]); open("/arena");
  browser(["click", ".arena-filter-toggle"]);
  check("short mobile screens keep the filter surface above navigation", evaluate("document.querySelector('#arena-filters').getBoundingClientRect().bottom < document.querySelector('.app-tabbar').getBoundingClientRect().top"));
  evaluate("document.querySelector('#arena-filters').scrollTop=10000;true");
  check("the last skill remains reachable in the compact scroll surface", evaluate("(()=>{const p=document.querySelector('#arena-filters');const b=p.querySelector('button:last-child');const r=b.getBoundingClientRect();return r.top>=p.getBoundingClientRect().top && r.bottom<=p.getBoundingClientRect().bottom;})()"));
  const persisted = JSON.parse(evaluate("localStorage.getItem('socialcoach.v1')")).state;
  check("interaction polish preserves the saved evidence report", JSON.stringify(persisted.sessions[0]) === JSON.stringify(report));
  writeFileSync(join(artifacts, "motion-frames.json"), JSON.stringify({ opening, choosing, calm }, null, 2));
  console.log(`${checks} material and motion checks passed. Artifacts: ${artifacts}`);
} finally { browser(["close"]); }
