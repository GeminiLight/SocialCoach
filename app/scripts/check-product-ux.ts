/**
 * Browser regressions for the practice journey. Run against a local dev server:
 * UX_BASE_URL=http://localhost:3005 npx tsx scripts/check-product-ux.ts
 * Requires agent-browser; optionally set AGENT_BROWSER_BIN to its executable.
 * Uses a disposable browser session, synthetic records and mocked model calls.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { scenarioById } from "../src/data/corpus";

const base = process.env.UX_BASE_URL ?? "http://localhost:3005";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Fixtures are only allowed on localhost");
const executable = process.env.AGENT_BROWSER_BIN ?? "agent-browser";
const session = `socialcoach-ux-check-${process.pid}`;
const artifacts = process.env.UX_ARTIFACTS ?? join(tmpdir(), session);
mkdirSync(artifacts, { recursive: true });
function browser(args: string[], input?: string) {
  const output = execFileSync(executable, ["--session", session, "--json", ...args], { input, encoding: "utf8", timeout: 60000 });
  const result = JSON.parse(output);
  assert(result.success, JSON.stringify(result.error));
  return result.data;
}
function evaluate(code: string) { return browser(["eval", "--stdin"], code).result; }
function wait(code: string) { browser(["wait", "--fn", code]); }
function open(path: string, settleFades = true) {
  browser(["open", base + path]);
  wait("document.querySelector('h1') !== null");
  // Wait for finite entry fades before measuring contrast or taking evidence.
  if (settleFades) wait("Array.from(document.querySelectorAll('[style]')).filter(e => e.style.opacity && e.getClientRects().length).every(e => Number(getComputedStyle(e).opacity) >= 0.999)");
}
function check(name: string, condition: unknown) { assert(condition, name); console.log(`PASS ${name}`); }
const sc = scenarioById("declining-extra-hours")!;
const now = Date.now();
const quote = "我今晚已有安排，无法留下。";
const briefing = {
  id: "ux-briefing", scenario: sc, learnerCharacterId: "you", messages: [],
  objectiveDone: sc.objectives.map(() => false), status: "briefing", startedAt: now,
  reflections: [], origin: "arena", adaptation: { learnerCharacterId: "you", briefing: sc.background.zh,
    objectives: sc.objectives.map(o => o.zh), focus: "说清自己的边界。", why: "练习清晰表达。" },
};
const chat = { ...briefing, id: "ux-chat", status: "active", timed: false,
  messages: [{ id: "opening", role: "npc", characterId: sc.opening.characterId, text: sc.opening.text.zh, ts: now }],
};
const review = { ...chat, id: "ux-review", status: "assessed", revealSeen: true,
  messages: [...chat.messages, { id: "learner", role: "learner", text: quote, ts: now }],
  report: { scoringVersion: 2, stars: 2, outcome: "partial", verdictEvidence: quote,
    verdict: "你说清了边界，也给对方留出了讨论空间。", summary: `${quote}你没有用反复道歉削弱自己的决定。`,
    ratings: [{ skill: "communication", level: 2, evidence: quote, reason: "限制明确。" }],
    strengths: [{ skill: "communication", evidence: quote, behavior: "清晰说明限制" }], weaknesses: [],
    alternatives: [{ original: quote, better: "我今晚无法留下，现在可以交接材料。", why: "在边界内提供选择。" }],
    knowledge: { theoryIds: [], caseIds: [], whyThis: "" }, reflectionQuestions: ["你最想保留的边界是什么？"],
    nextStep: "下一次拒绝时，先说清限制，再决定是否提供替代方案。", deltas: { communication: 0.2 } },
};
const longChat = { ...chat, id: "ux-long", messages: Array.from({ length: 24 }, (_, i) => ({ ...chat.messages[0], id: `history-${i}`, text: `${i + 1}. ${sc.opening.text.zh.repeat(3)}` })) };
const state = { profile: { name: "UX Fixture", bio: "练习清晰表达", goals: ["communication"], contexts: ["workplace"], lang: "zh", createdAt: now },
  sessions: [briefing, review, chat, longChat], settings: { theme: "light", telemetry: false, tts: false },
  proficiency: { communication: 2 }, practiceDays: [], customScenarios: [], bookmarks: [], todaySessionId: briefing.id,
  todayDate: new Date().toLocaleDateString("en-CA"), patternInsight: null };

try {
  browser(["open", "about:blank"]);
  browser(["network", "route", "**/api/roleplay", "--abort"]);
  browser(["network", "route", "**/api/schedule", "--abort"]);
  browser(["network", "route", "**/api/track", "--body", "{}"]);
  browser(["open", base]);
  // The deployed v0 envelope predates quality ratings and closure evidence.
  // Loading new screens must not rewrite an old report or lose an active chat.
  const legacyReport = { ...review.report };
  Reflect.deleteProperty(legacyReport, "scoringVersion");
  Reflect.deleteProperty(legacyReport, "ratings");
  Reflect.deleteProperty(legacyReport, "verdictEvidence");
  const legacyState = { ...state,
    sessions: [briefing, { ...review, report: legacyReport, startedAt: now - 7 * 86400000 },
      { ...chat, startedAt: now - 2 * 86400000, messages: review.messages }],
    bookmarks: [sc.id], customScenarios: [{ ...sc, id: "upgrade-custom" }],
    practiceDays: ["2026-09-10"],
  };
  evaluate(`localStorage.setItem('socialcoach.v1', ${JSON.stringify(JSON.stringify({ state: legacyState, version: 0 }))}); true`);
  for (const path of ["/", "/progress", "/practice/ux-review", "/practice/ux-chat", "/settings", "/"]) {
    open(path, false); // Growth includes intentionally translucent chart elements.
    const persisted = JSON.parse(evaluate("localStorage.getItem('socialcoach.v1')"));
    assert.deepEqual(persisted, { state: legacyState, version: 0 }, `Legacy storage changed on ${path}`);
    check(`legacy history and preferences unchanged on ${path}`, true);
    if (path === "/practice/ux-review") check("legacy report renders", evaluate(`document.body.innerText.includes(${JSON.stringify(legacyReport.verdict)})`));
    if (path === "/practice/ux-chat") check("old active chat remains resumable", evaluate(`!!document.querySelector('textarea') && document.body.innerText.includes(${JSON.stringify(quote)})`));
  }
  evaluate(`localStorage.setItem('socialcoach.v1', ${JSON.stringify(JSON.stringify({ state, version: 0 }))}); true`);
  open("/practice/ux-chat");
  browser(["fill", "textarea", "这是一段还没发送的草稿。"]);
  check("draft saved immediately", evaluate("sessionStorage.getItem('socialcoach.draft.ux-chat') === '这是一段还没发送的草稿。'"));
  open("/practice/ux-chat");
  check("draft restored after refresh", evaluate("document.querySelector('textarea').value === '这是一段还没发送的草稿。'"));
  open("/practice/ux-long");
  check("drafts isolated per practice", evaluate("document.querySelector('textarea').value === ''"));
  open("/practice/ux-chat");
  browser(["click", "button[aria-label='发送']"]);
  wait("document.querySelector('[role=alert]') !== null");
  check("sent draft cleared; failed message retained", evaluate("sessionStorage.getItem('socialcoach.draft.ux-chat') === null && document.body.innerText.includes('这是一段还没发送的草稿。')"));
  browser(["click", "[role=alert] button"]);
  check("retry restores editable draft", evaluate("document.querySelector('textarea').value === '这是一段还没发送的草稿。'"));

  open("/arena");
  check("catalog starts with twelve rows", evaluate("document.querySelectorAll('.notebook-row').length === 12"));
  browser(["find", "role", "button", "click", "--name", "再看 12 个场景"]);
  check("show more reveals twelve more", evaluate("document.querySelectorAll('.notebook-row').length === 24"));
  browser(["fill", "input[type=search]", "拒绝"]);
  check("filter resets page size in URL", evaluate("new URLSearchParams(location.search).get('q') === '拒绝' && !new URLSearchParams(location.search).has('limit')"));
  const filtered = evaluate("document.querySelectorAll('.notebook-row').length");
  open("/practice/ux-briefing");
  browser(["click", "button[aria-label='返回练习场']"]);
  // The preparation back action returns to the saved collection history.
  wait("location.pathname === '/arena'");
  check("return preserves collection filters", evaluate("document.querySelector('input[type=search]').value === '拒绝' && document.querySelectorAll('.notebook-row').length === " + filtered));
  browser(["fill", "input[type=search]", "no-match-ux-938"]);
  check("empty results offer recovery", evaluate("document.body.innerText.includes('还没有找到合适的场景') && document.querySelectorAll('.notebook-row').length === 0"));

  open("/practice/ux-long");
  evaluate(`(() => {
    const original = window.fetch;
    window.fetch = (url, options) => String(url).endsWith('/api/roleplay') ? Promise.resolve(new Response(new ReadableStream({ start(controller) { window.__uxStream = controller; } }))) : original(url, options);
    return true;
  })()`);
  browser(["fill", "textarea", "我需要想一想。"]);
  browser(["click", "button[aria-label='发送']"]);
  wait("!!window.__uxStream");
  evaluate("document.querySelector('.chat-transcript').scrollTop = 0");
  wait("document.body.innerText.includes('回到最新消息')");
  evaluate(`window.__uxStream.enqueue(new TextEncoder().encode(${JSON.stringify(`@@${sc.opening.characterId}\n这是新的回复。`)})); true`);
  wait("document.body.innerText.includes('这是新的回复。')");
  check("incoming reply does not interrupt reading history", evaluate("document.querySelector('.chat-transcript').scrollTop < 10"));
  browser(["find", "role", "button", "click", "--name", "回到最新消息"]);
  check("jump returns to latest message", evaluate("(() => { const e = document.querySelector('.chat-transcript'); return e.scrollHeight - e.clientHeight - e.scrollTop < 10; })()"));
  evaluate(`window.__uxStream.enqueue(new TextEncoder().encode(${JSON.stringify('\n@@meta\n' + JSON.stringify({ objectives: [false, false, false], ended: false, stance: 20 }))})); window.__uxStream.close(); true`);
  wait("!document.querySelector('textarea').disabled");

  browser(["set", "viewport", "390", "844"]);
  open("/practice/ux-chat");
  browser(["click", "button[aria-label='暂停或结束练习']"]);
  browser(["press", "Escape"]);
  check("Escape closes pause sheet and returns focus", evaluate("!document.querySelector('dialog[open]') && document.activeElement.getAttribute('aria-label') === '暂停或结束练习'"));
  check("keyboard focus is visible", evaluate("getComputedStyle(document.activeElement).outlineStyle === 'solid'"));
  evaluate("sessionStorage.setItem('unrelated-key', 'keep'); true");
  open("/settings");
  browser(["find", "role", "button", "click", "--name", "清除所有数据", "--exact"]);
  browser(["click", "dialog button.bg-danger-soft"]);
  wait("location.pathname === '/onboarding'");
  check("erase clears app drafts and collection state only", evaluate("!Object.keys(sessionStorage).some(k => k.startsWith('socialcoach.draft.') || k === 'socialcoach.arena.location') && sessionStorage.getItem('unrelated-key') === 'keep'"));
  evaluate(`localStorage.setItem('socialcoach.v1', ${JSON.stringify(JSON.stringify({ state, version: 0 }))}); true`);
  open("/");

  const scans: unknown[] = [];
  let violations = 0;
  for (const lang of (process.env.UX_SKIP_MATRIX ? [] : ["zh", "en"])) {
    evaluate(`(() => { const s = JSON.parse(localStorage.getItem('socialcoach.v1')); s.state.profile.lang = '${lang}'; localStorage.setItem('socialcoach.v1', JSON.stringify(s)); return true; })()`);
    for (const theme of ["light", "dark"]) {
      evaluate(`(() => { const s = JSON.parse(localStorage.getItem('socialcoach.v1')); s.state.settings.theme = '${theme}'; localStorage.setItem('socialcoach.v1', JSON.stringify(s)); return true; })()`);
      for (const width of [360, 768, 1024, 1440]) {
        browser(["set", "viewport", String(width), "900"]);
        for (const [name, path] of [["home", "/"], ["arena", "/arena"], ["briefing", "/practice/ux-briefing"], ["chat", "/practice/ux-chat"], ["review", "/practice/ux-review"]]) {
          open(path);
          check(`${name} ${lang}/${theme}/${width} no horizontal overflow`, evaluate("document.documentElement.scrollWidth <= innerWidth"));
          if (width === 360 || width === 1440) {
            browser(["screenshot", join(artifacts, `${name}-${lang}-${theme}-${width}.png`)]);
            const scan = browser(["a11y", "--tags", "wcag2a,wcag2aa"]);
            scans.push({ name, lang, theme, width, ...scan });
            violations += scan.counts.violations;
            if (scan.counts.violations) console.log(`A11Y ${name}/${lang}/${theme}/${width}: ${scan.counts.violations} violation types`);
          }
        }
      }
    }
  }
  writeFileSync(join(artifacts, "accessibility.json"), JSON.stringify(scans, null, 2));
  if (scans.length) check("accessibility scans have no automatic violations", violations === 0);
  console.log(`Artifacts: ${artifacts}`);
} finally {
  browser(["close"]);
}
