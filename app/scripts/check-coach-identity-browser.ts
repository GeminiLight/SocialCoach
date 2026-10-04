/** Local coach integration checks: model endpoints are intercepted, no inference is sent. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { t } from "../src/lib/i18n";
import { skillById } from "../src/data/taxonomy";

const base = process.env.UX_BASE_URL ?? "http://localhost:3101";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const session = `coach-identity-${process.pid}`;
const artifacts = process.env.UX_ARTIFACTS ?? join(tmpdir(), session);
mkdirSync(artifacts, { recursive: true });
function browser(args: string[], input?: string) {
  let output: string;
  try {
    output = execFileSync("agent-browser", ["--session", session, "--json", ...args], { input, encoding: "utf8", timeout: 60000 });
  } catch (error) {
    const failure = error as { code?: string; stdout?: string };
    // Occasionally the CLI prints its completed response but fails to exit.
    // Accept only that valid response; failed or missing UI results still fail.
    if (failure.code !== "ETIMEDOUT" || !failure.stdout?.trim()) throw error;
    output = failure.stdout;
  }
  const result = JSON.parse(output);
  assert(result.success, JSON.stringify(result.error)); return result.data;
}
const evaluate = (code: string) => browser(["eval", "--stdin"], code).result;
const wait = (code: string) => browser(["wait", "--fn", code]);
const button = (name: string) => browser(["find", "role", "button", "click", "--name", name, "--exact"]);
let count = 0;
function check(name: string, condition: unknown) { assert(condition, name); count++; console.log(`PASS ${name}`); }
function welcome(lang: "zh" | "en", theme = "light") {
  const state = { profile: null, onboardingLang: lang, sessions: [], settings: { theme, telemetry: false, tts: false }, proficiency: {}, practiceDays: [], customScenarios: [], bookmarks: [], todaySessionId: null, todayDate: null, patternInsight: null };
  evaluate(`localStorage.setItem('socialcoach.v1', ${JSON.stringify(JSON.stringify({ state, version: 0 }))}); localStorage.setItem('socialcoach.3d-launch.v1','seen'); true`);
  browser(["open", base + "/onboarding"]);
  wait("document.querySelector('.welcome-copy h1') !== null && document.querySelector('.coach-mascot img')?.complete");
  wait("document.fonts.status === 'loaded' && !document.getAnimations().some(a=>a.playState==='running' && a.effect.getTiming().iterations !== Infinity)");
}
const saved = () => JSON.parse(evaluate("localStorage.getItem('socialcoach.v1')")).state;
const scans: unknown[] = [];
try {
  browser(["open", "about:blank"]);
  for (const endpoint of ["schedule", "roleplay", "assess", "rehearse", "hint", "pattern", "reflect", "debrief-chat", "dinner/direct"]) {
    browser(["network", "route", `**/api/${endpoint}`, "--status", "503", "--body", '{"error":"Local UI fixture — no inference"}']);
  }
  browser(["network", "route", "**/api/health*", "--body", '{"state":"available","serverKey":true,"requireByok":false}']);
  browser(["network", "route", "**/api/track", "--body", "{}"]);
  browser(["network", "route", "**/api/feedback", "--body", '{"available":false}']);
  browser(["open", base + "/onboarding"]);
  for (const lang of ["zh", "en"] as const) for (const theme of ["light", "dark"]) for (const [width, height] of [[360, 600], [390, 844], [1440, 900]]) {
    browser(["set", "viewport", String(width), String(height)]); welcome(lang, theme);
    const scan = browser(["a11y", "--tags", "wcag2a,wcag2aa"]); scans.push({ lang, theme, width, height, ...scan });
    check(`${lang}/${theme}/${width}: welcome remains accessible and has no overflow`, scan.counts.violations === 0 && evaluate("document.documentElement.scrollWidth <= innerWidth"));
    check(`${lang}/${theme}/${width}: artwork loads and leaves actions unobstructed`, evaluate("document.querySelector('.coach-mascot img').naturalWidth > 0 && [...document.querySelectorAll('.onboarding-welcome-actions button, .onboarding-welcome-actions a')].every(b => { const r=b.getBoundingClientRect(); const f=document.querySelector('.welcome-coach').getBoundingClientRect(); return r.height>=44 && (r.top>=f.bottom || r.right<=f.left); })"));
    browser(["screenshot", join(artifacts, `welcome-${lang}-${theme}-${width}.png`)]);
  }
  browser(["set", "viewport", "390", "844"]);
  for (const lang of ["zh", "en"] as const) for (const [label, destination] of [["ob_rehearse", "/rehearse"], ["ob_browse", "/arena"], ["ob_dinner_short", "/3d"]] as const) {
    welcome(lang);
    if (destination === "/3d") browser(["find", "role", "link", "click", "--name", t(lang, label), "--exact"]);
    else button(t(lang, label));
    wait(`location.pathname === ${JSON.stringify(destination)}`);
    check(`${lang}: ${label} preserves language and direct guest entry`, destination === "/3d" ? !saved().profile && saved().onboardingLang === lang : saved().profile.lang === lang && saved().profile.goals.length === 1);
  }
  for (const lang of ["zh", "en"] as const) {
    welcome(lang); button(t(lang, "ob_personalize")); wait("document.querySelector('[aria-controls^=onboarding-]') !== null");
    button(skillById("communication").name[lang]); button(t(lang, "next")); wait("document.querySelector('input[type=range]') !== null");
    browser(["click", "input[type=range]"]); browser(["press", "Home"]);
    for (let i = 0; i < 5; i++) browser(["press", "ArrowRight"]);
    button(t(lang, "next")); wait(`document.querySelector('h1')?.textContent === ${JSON.stringify(t(lang, "ob_ctx_title"))}`);
    button(t(lang, "next")); wait(`document.querySelector('input[maxlength="24"]') !== null`);
    browser(["fill", 'input[maxlength="24"]', "Alex"]); button(t(lang, "ob_done")); wait("location.pathname === '/' && document.querySelector('.home-greeting') !== null");
    check(`${lang}: five-step setup preserves name, chosen goal and self-rating`, saved().profile.name === "Alex" && saved().profile.goals.includes("communication") && saved().proficiency.communication === 3.5);
  }
  browser(["set", "media", "light", "reduced-motion"]); welcome("zh");
  check("reduced motion keeps the mascot still", evaluate("getComputedStyle(document.querySelector('.welcome-coach-figure')).animationName === 'none' && !document.getAnimations().some(a=>a.playState==='running')"));
  browser(["network", "route", "**/_next/image*", "--status", "503", "--body", "Image unavailable"]); welcome("en");
  button(t("en", "ob_browse")); wait("location.pathname === '/arena'");
  check("an unavailable illustration never blocks starting practice", saved().profile.lang === "en");
  writeFileSync(join(artifacts, "accessibility.json"), JSON.stringify(scans, null, 2));
  console.log(`${count} coach identity checks passed. Artifacts: ${artifacts}`);
} finally { browser(["close"]); }
