/** Local UI regression. All model responses are fixtures; no inference is sent. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fixtureSession } from "./check-debrief-assistant";
import { scenarioById } from "../src/data/corpus";
import { buildSession } from "../src/lib/session-utils";
import { t } from "../src/lib/i18n";

const base = process.env.UX_BASE_URL ?? "http://localhost:3101";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const session = `refined-workspace-${process.pid}`;
const artifacts = process.env.UX_ARTIFACTS ?? join(tmpdir(), session);
mkdirSync(artifacts, { recursive: true });
function browser(args: string[], input?: string) {
  const result = JSON.parse(execFileSync("agent-browser", ["--session", session, "--json", ...args], { input, encoding: "utf8", timeout: 60000 }));
  assert(result.success, JSON.stringify(result.error)); return result.data;
}
const evaluate = (code: string) => browser(["eval", "--stdin"], code).result;
const wait = (code: string) => browser(["wait", "--fn", code]);
const button = (name: string) => browser(["find", "role", "button", "click", "--name", name, "--exact"]);
let checks = 0;
function check(name: string, condition: unknown) { assert(condition, name); checks++; console.log(`PASS ${name}`); }
const report = fixtureSession();
const scenario = scenarioById("declining-extra-hours")!;
const brief = { ...buildSession(scenario, "arena", "zh"), id: "workspace-brief", adaptation: { learnerCharacterId: "you", briefing: scenario.background.zh, objectives: scenario.objectives.map(o => o.zh), focus: "", why: "" } };
const date = new Date().toLocaleDateString("en-CA");
const state = { profile: { name: "Workspace fixture", bio: "", goals: ["communication"], contexts: ["workplace"], lang: "zh", createdAt: 1 }, sessions: [report, brief], settings: { theme: "light", telemetry: false, tts: false }, proficiency: { communication: 2 }, practiceDays: [], customScenarios: [], bookmarks: [], todaySessionId: brief.id, todayDate: date, patternInsight: null };
function open(path: string) {
  browser(["open", base + path]);
  wait("document.querySelector('h1') !== null");
  wait("document.fonts.status==='loaded' && !document.getAnimations().some(a=>a.playState==='running' && a.effect.getTiming().iterations!==Infinity)");
}
const scans: unknown[] = [];
try {
  browser(["open", "about:blank"]);
  browser(["network", "route", "**/api/health*", "--body", '{"state":"available","serverKey":true,"requireByok":false}']);
  browser(["network", "route", "**/api/track", "--body", "{}"]);
  browser(["network", "route", "**/api/feedback", "--body", '{"available":false}']);
  browser(["network", "route", "**/api/schedule", "--body", JSON.stringify({ scenario, adaptation: brief.adaptation })]);
  browser(["open", base + "/onboarding"]);
  evaluate(`localStorage.setItem('socialcoach.v1', ${JSON.stringify(JSON.stringify({ state, version: 0 }))}); true`);
  browser(["set", "viewport", "390", "844"]); open("/arena");
  check("a complete recommended scene is visible above mobile navigation", evaluate("document.querySelector('.arena-pick').getBoundingClientRect().bottom < document.querySelector('.app-tabbar').getBoundingClientRect().top"));
  check("search stays visible while secondary filters start closed", evaluate("document.querySelector('input[type=search]').getClientRects().length>0 && document.querySelector('#arena-filters').hidden"));
  button("筛选"); button("清晰沟通"); browser(["select", "select[aria-label=难度]", "2"]);
  browser(["fill", "input[type=search]", "临时加班"]);
  wait("document.querySelectorAll('.arena-row').length===1");
  check("combined skill, difficulty and search find the intended scene", evaluate("document.querySelector('.arena-row').textContent.includes('拒绝临时加班') && new URLSearchParams(location.search).get('difficulty')==='2'"));
  browser(["click", ".arena-filter-toggle"]);
  check("closing filters retains the active conditions and readable summary", evaluate("document.querySelector('#arena-filters').hidden && document.querySelector('.arena-selected-filters').textContent.includes('清晰沟通') && document.querySelector('.arena-filter-toggle').textContent.includes('2')"));
  const returnPath = evaluate("location.pathname+location.search");
  open(returnPath);
  check("refresh preserves search and conditions without reopening the panel", evaluate("document.querySelector('input[type=search]').value==='临时加班' && document.querySelector('#arena-filters').hidden && document.querySelectorAll('.arena-row').length===1"));
  browser(["click", ".arena-row"]); wait("location.pathname.startsWith('/practice/') && document.querySelector('h1')!==null");
  button(t("zh", "pr_back_workspace")); wait("location.pathname==='/arena' && document.querySelectorAll('.arena-row').length===1");
  check("preview and return restore the exact collection URL", evaluate("location.pathname+location.search") === returnPath);
  browser(["fill", "input[type=search]", "no-such-scene-fixture"]); wait("document.querySelectorAll('.arena-row').length===0");
  button(t("zh", "arena_reset")); wait("location.search==='' && document.querySelectorAll('.arena-row').length===12");
  check("empty-state reset clears all conditions and restores search focus", evaluate("document.activeElement===document.querySelector('input[type=search]')"));
  button(t("zh", "arena_show_more", { n: 12 })); wait("document.querySelectorAll('.arena-row').length===24");
  check("load more remains available after the catalog redesign", true);
  for (const lang of ["zh", "en"] as const) for (const theme of ["light", "dark"] as const) for (const width of [360, 1440]) {
    state.profile.lang = lang; state.settings.theme = theme;
    evaluate(`localStorage.setItem('socialcoach.v1', ${JSON.stringify(JSON.stringify({ state, version: 0 }))}); true`);
    browser(["set", "viewport", String(width), "900"]);
    open("/arena");
    check(`${lang}/${theme}/${width}: no horizontal overflow`, evaluate("document.documentElement.scrollWidth<=innerWidth"));
    check(`${lang}/${theme}/${width}: first scene title is readable`, evaluate("document.querySelector('.arena-pick').getBoundingClientRect().bottom < (innerWidth<1024 ? document.querySelector('.app-tabbar').getBoundingClientRect().top : innerHeight)"));
    browser(["click", ".arena-filter-toggle"]);
    check(`${lang}/${theme}/${width}: all filter targets meet 44px`, evaluate("Array.from(document.querySelectorAll('.arena-search button, .arena-search select')).filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height>=44)"));
    const scan = browser(["a11y", "--tags", "wcag2a,wcag2aa"]); scans.push({ lang, theme, width, page: "arena", ...scan });
    check(`${lang}/${theme}/${width}: no automatic accessibility violations`, scan.counts.violations === 0);
    browser(["screenshot", join(artifacts, `filters-${lang}-${theme}-${width}.png`)]);
    open("/");
    check(`${lang}/${theme}/${width}: daily practice precedes 3D in the document and focus order`, evaluate("Boolean(document.querySelector('.home-practice-layout').compareDocumentPosition(document.querySelector('.dinner-feature')) & Node.DOCUMENT_POSITION_FOLLOWING)"));
    evaluate("document.querySelector('.dinner-feature').scrollIntoView({block:'center',behavior:'instant'}); true");
    const dinner = browser(["a11y", "--tags", "wcag2a,wcag2aa", "--selector", ".dinner-feature"]); scans.push({ lang, theme, width, page: "dinner-entry", ...dinner });
    check(`${lang}/${theme}/${width}: all 3D entry links pass contrast and accessibility`, dinner.counts.violations === 0);
    browser(["screenshot", join(artifacts, `dinner-${lang}-${theme}-${width}.png`)]);
    open("/learn");
    const library = browser(["a11y", "--tags", "wcag2a,wcag2aa"]); scans.push({ lang, theme, width, page: "learn", ...library });
    check(`${lang}/${theme}/${width}: library has no overflow or automatic accessibility violations`, library.counts.violations === 0 && evaluate("document.documentElement.scrollWidth<=innerWidth"));
  }
  browser(["set", "viewport", "820", "1180"]); open("/arena");
  check("tablet category strip and three recommendations fit the page", evaluate("document.documentElement.scrollWidth<=innerWidth && document.querySelectorAll('.arena-pick').length===3"));
  browser(["set", "viewport", "1920", "1080"]); open("/");
  check("wide monitors retain a comfortable maximum content width", evaluate("document.querySelector('#main-content').getBoundingClientRect().width<=1280"));
  const saved = JSON.parse(evaluate("localStorage.getItem('socialcoach.v1')")).state;
  check("visual changes preserve the original report and proficiency", JSON.stringify(saved.sessions.find((s: { id: string }) => s.id === report.id).report) === JSON.stringify(report.report) && saved.proficiency.communication === 2);
  const noPick = { ...state, todaySessionId: null, todayDate: null };
  evaluate(`localStorage.setItem('socialcoach.v1', ${JSON.stringify(JSON.stringify({ state: noPick, version: 0 }))}); true`);
  open("/");
  check("without a daily pick, rehearsing a real conversation comes first", evaluate("Boolean(document.querySelector('.rehearsal-invitation').compareDocumentPosition(document.querySelector('.home-practice-layout section[aria-live]')) & Node.DOCUMENT_POSITION_FOLLOWING) && document.querySelector('.rehearsal-invitation').classList.contains('is-primary')"));
  const ongoing = { ...state, sessions: [report, brief, { ...brief, id: 'workspace-active', status: 'active', timed: false, messages: [{ id: 'npc', role: 'npc', characterId: scenario.opening.characterId, text: scenario.opening.text.en, ts: 1 }] }] };
  evaluate(`localStorage.setItem('socialcoach.v1', ${JSON.stringify(JSON.stringify({ state: ongoing, version: 0 }))}); true`);
  open("/");
  check("an unfinished practice keeps the only filled main action", evaluate("getComputedStyle(document.querySelector('.today-feature .app-button')).backgroundColor!==getComputedStyle(document.querySelector('.home-resume > span:last-child')).backgroundColor"));
  writeFileSync(join(artifacts, "accessibility.json"), JSON.stringify(scans, null, 2));
  console.log(`${checks} refined workspace checks passed. Artifacts: ${artifacts}`);
} finally { browser(["close"]); }
