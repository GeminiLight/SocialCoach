// Shoots the three product screenshots against a live deployment, phone-sized
// (390×844 @3x = 1170×2532), light theme, driving Chrome over the DevTools protocol.
//
//   node site/scripts/screenshots.mjs [--base=https://socialcoach-app.vercel.app] [--lang=zh] [--out=docs/screenshots]
//
// Flow: seed a demo profile → home (today's pick + "why this one") → start →
// briefing → chat: one soft reply, the character pushes back → one clear
// reply with an alternative → end → debrief. Names and lines are demo data.
// Spends four or five model calls on the target deployment.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const opt = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = "true"] = a.replace(/^--/, "").split("="); return [k, v]; }));
const BASE = (opt.base || "https://socialcoach-app.vercel.app").replace(/\/$/, "");
const LANG = opt.lang || "zh";
const OUT = opt.out || "docs/screenshots";
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const zh = LANG === "zh";
mkdirSync(join(OUT, "raw"), { recursive: true });

const S = zh
  ? { start: "开始练习", why: "为什么是这个", another: ["换一个", "再来一个"], enter: "进入对话", send: "发送", end: "结束对话", endReview: "结束并复盘", toReport: "看复盘", writing: "教练正在写", stillWriting: "还在写", wantTitle: "拒绝临时加班" }
  : { start: "Start practice", why: "Why this one", another: ["One more", "Swap"], enter: "Enter the scene", send: "Send", end: "End scene", endReview: "End and review", toReport: "See the debrief", writing: "Coach is writing", stillWriting: "Still writing", wantTitle: "Declining Extra Hours" };

const profile = zh
  ? { name: "小周", bio: "工作两年的产品经理，不太会拒绝别人，最近总被临时加活。", goals: ["seeking-help", "communication", "goal-setting"], contexts: ["workplace"], lang: "zh", createdAt: Date.now() }
  : { name: "Sam", bio: "Product manager, two years in. Bad at saying no; keeps getting last-minute asks.", goals: ["seeking-help", "communication", "goal-setting"], contexts: ["workplace"], lang: "en", createdAt: Date.now() };
const proficiency = { "seeking-help": 2.5, communication: 3, "goal-setting": 3 };

// Two learner turns: a polite reply with no boundary, then a clear no with an alternative and a question.
const lines = zh
  ? [
      "啊……好的，我看看。不过我今晚其实有点事，可能会晚一点开始，可以吗？",
      "Michael，今晚我确实不行，答应了家里的事。我现在可以花二十分钟把第三部分的问题先标出来，明早七点半到公司改完，九点前一定给你。客户明早最需要看的是哪几页？",
    ]
  : [
      "Oh… okay, let me take a look. I do have something tonight though, so I might start a bit late, is that all right?",
      "Michael, tonight really doesn't work, I've promised my family. I can spend twenty minutes now flagging what's wrong in section three, be in at 7:30 tomorrow and have it to you before nine. Which slides does the client actually need first thing?",
    ];

/* ------------------------------ CDP plumbing ------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const chrome = spawn(CHROME, [
  "--headless", "--remote-debugging-port=0", `--user-data-dir=/tmp/sc-shots-${Date.now()}`,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars",
  "--disable-background-networking", "--disable-component-update", "--disable-sync",
  "--window-size=390,844", "--lang=" + (zh ? "zh-CN" : "en-US"), "about:blank",
]);
let chromeLog = "";
chrome.stderr.on("data", (d) => { chromeLog = (chromeLog + d).slice(-4000); });
chrome.stdout.on("data", () => {});
let chromeGone = false;
chrome.on("exit", (code, sig) => { chromeGone = true; if (!shuttingDown) console.error(`chrome exited (${code ?? sig}); last stderr:\n${chromeLog.slice(-800)}`); });
let shuttingDown = false;
const cleanup = () => { shuttingDown = true; try { chrome.kill("SIGKILL"); } catch {} };
process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(130); });

const port = await new Promise((resolve, reject) => {
  let buf = "";
  const onData = (d) => { buf += d; const m = buf.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/); if (m) { chrome.stderr.off("data", onData); resolve(m[1]); } };
  chrome.stderr.on("data", onData);
  chrome.on("exit", (c) => reject(new Error("chrome exited " + c + "\n" + buf)));
  setTimeout(() => reject(new Error("no DevTools banner\n" + buf)), 20000);
});

// The DevTools socket occasionally drops (close 1006) mid-flow while Chrome and
// the tab live on, so every command reconnects to the same tab if needed.
let ws = null, wsClosed = true, seq = 0;
const pending = new Map();
const setupPage = async () => {
  await cdp("Page.enable");
  await cdp("Runtime.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true, screenWidth: 390, screenHeight: 844 });
  await cdp("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
};
const connect = async () => {
  for (let attempt = 1; ; attempt++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = targets.find((t) => t.type === "page");
      if (!page) throw new Error("no page target");
      const sock = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((r, j) => { sock.onopen = r; sock.onerror = () => j(new Error("ws open failed")); });
      ws = sock; wsClosed = false;
      sock.onclose = (e) => { if (ws !== sock) return; wsClosed = true; console.error(`devtools socket closed (${e.code})`); for (const { rej } of pending.values()) rej(new Error("devtools socket closed")); pending.clear(); };
      sock.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
      if (attempt > 1) log("reconnected to the tab");
      await setupPage();
      return;
    } catch (e) {
      if (chromeGone || attempt >= 5) throw e;
      await sleep(800 * attempt);
    }
  }
};
const cdp = async (method, params = {}) => {
  if (chromeGone) throw new Error("chrome is gone");
  if (wsClosed && method !== "__noop") await connect();
  return new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
};
// setupPage runs inside connect(); guard against recursion on first connect.
{
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === "page");
  const sock = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { sock.onopen = r; sock.onerror = () => j(new Error("ws open failed")); });
  ws = sock; wsClosed = false;
  sock.onclose = (e) => { if (ws !== sock) return; wsClosed = true; console.error(`devtools socket closed (${e.code})`); for (const { rej } of pending.values()) rej(new Error("devtools socket closed")); pending.clear(); };
  sock.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } };
  await setupPage();
}

const evaluate = async (expression) => {
  const r = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("page error: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
};
// Helpers injected into every evaluate: find by selector and (optionally) visible text.
const H = `
const $$ = (sel, text) => [...document.querySelectorAll(sel)].filter(e => !text || (e.textContent || "").replace(/\\s+/g," ").includes(text));
const $ = (sel, text) => $$(sel, text)[0] || null;
const body = () => (document.body?.innerText || "").replace(/\\s+/g, " ");
`;
const ev = (js) => evaluate(`(() => { ${H} return (${js}); })()`);
const waitFor = async (js, label, timeout = 60000, interval = 300) => {
  const t0 = Date.now(); let lastLog = 0, lastErr = "";
  for (;;) {
    if (chromeGone) throw new Error(`chrome gone while waiting: ${label}`);
    let v = null; try { v = await ev(`!!(${js})`); } catch (e) { if (e.message !== lastErr) { lastErr = e.message; log(`  (${label}) eval error:`, e.message.slice(0, 160)); } }
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error(`timeout: ${label}`);
    if (Date.now() - lastLog > 20000) { lastLog = Date.now(); log(`  waiting: ${label} …`, (await ev("body()").catch(() => "")).slice(0, 90)); }
    await sleep(interval);
  }
};
const click = (js) => ev(`(() => { const el = ${js}; if (!el) return false; el.scrollIntoView({block:"center"}); el.click(); return true; })()`);
const goto = async (url) => { await cdp("Page.navigate", { url }); await waitFor(`document.readyState === "complete"`, "load " + url); await sleep(400); };

const shot = async (name, { full = false } = {}) => {
  let params = { format: "png" };
  if (full) {
    const { contentSize } = await cdp("Page.getLayoutMetrics");
    params = { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: Math.ceil(contentSize.height), scale: 1 } };
  }
  const { data } = await cdp("Page.captureScreenshot", params);
  const file = join(OUT, full ? "raw" : "", `${name}${full ? "-full" : ""}.png`);
  writeFileSync(file, Buffer.from(data, "base64"));
  log("saved", file);
};

/* --------------------------------- flow ---------------------------------- */

try {

  // Seed the demo learner so the app skips onboarding.
  await goto(`${BASE}/onboarding`);
  await evaluate(`localStorage.setItem("socialcoach.v1", ${JSON.stringify(JSON.stringify({ state: { profile, proficiency }, version: 0 }))}); "ok"`);

  // 01 · home: today's pick, reason expanded.
  await goto(`${BASE}/`);
  await waitFor(`$("button", ${JSON.stringify(S.start)})`, "today card", 240000);
  for (let i = 0; i < 3 && !(await ev(`body().includes(${JSON.stringify(S.wantTitle)})`)); i++) {
    log("today's pick is not the overtime scene; asking for another");
    const before = await ev(`body()`);
    if (!(await click(`(${JSON.stringify(S.another)}).map(t => $("button", t)).find(Boolean)`))) break;
    await waitFor(`$("button", ${JSON.stringify(S.start)}) && body() !== ${JSON.stringify(before)}`, "new pick", 90000);
    await sleep(500);
  }
  await click(`$("button", ${JSON.stringify(S.why)})`);
  await sleep(900);
  await evaluate(`window.scrollTo(0, 0); "ok"`);
  await sleep(300);
  await shot(`screenshot-01-home-${LANG}`);
  await shot(`screenshot-01-home-${LANG}`, { full: true });

  // Start → briefing → enter.
  await click(`$("button", ${JSON.stringify(S.start)})`);
  await waitFor(`location.pathname.startsWith("/practice/")`, "practice route", 30000);
  await waitFor(`(() => { const b = $("button", ${JSON.stringify(S.enter)}); return b && !b.disabled; })()`, "briefing adapted", 120000);
  await sleep(600);
  await click(`$("button", ${JSON.stringify(S.enter)})`);
  await waitFor(`document.querySelector("textarea")`, "chat input", 30000);
  await sleep(1500);

  // Chat: type a line, send, wait for the character to finish.
  const say = async (text) => {
    await evaluate(`document.querySelector("textarea").focus(); "ok"`);
    await cdp("Input.insertText", { text });
    await waitFor(`(() => { const b = $('button[aria-label=${JSON.stringify(S.send)}]'); return b && !b.disabled; })()`, "send enabled", 10000);
    await click(`$('button[aria-label=${JSON.stringify(S.send)}]')`);
    try { await waitFor(`document.querySelector("textarea")?.disabled`, "busy", 8000, 100); } catch {}
    await waitFor(`!document.querySelector("textarea")?.disabled`, "character replied", 120000, 300);
    await sleep(1200);
  };
  await say(lines[0]);
  // 02 · pushback: the polite reply did not get a yes.
  await evaluate(`window.scrollTo(0, document.body.scrollHeight); "ok"`);
  await sleep(500);
  await shot(`screenshot-02-pushback-${LANG}`);
  await shot(`screenshot-02-pushback-${LANG}`, { full: true });

  await say(lines[1]);
  await shot(`screenshot-02b-after-boundary-${LANG}`, { full: true });

  // End → reveal → report.
  await click(`$('button[aria-label=${JSON.stringify(S.end)}]')`);
  await waitFor(`$("button", ${JSON.stringify(S.endReview)})`, "end sheet", 15000);
  await click(`$("button", ${JSON.stringify(S.endReview)})`);
  await waitFor(`(() => { const b = $("button", ${JSON.stringify(S.toReport)}); return b && !b.disabled; })()`, "report ready", 180000, 500);
  await sleep(800);
  await shot(`screenshot-03a-reveal-${LANG}`);
  await click(`$("button", ${JSON.stringify(S.toReport)})`);
  await waitFor(`!body().includes(${JSON.stringify(S.writing)}) && !body().includes(${JSON.stringify(S.stillWriting)})`, "report written", 180000, 500);
  await sleep(1500);
  await evaluate(`window.scrollTo(0, 0); "ok"`);
  await sleep(300);
  await shot(`screenshot-03-evidence-debrief-${LANG}`);
  await shot(`screenshot-03-evidence-debrief-${LANG}`, { full: true });
  // Second framing: scroll to the first quoted learner line so evidence leads the frame.
  await ev(`(() => { const q = $("blockquote") || $("q") || $("[class*=quote]"); if (q) { q.scrollIntoView({ block: "start" }); window.scrollBy(0, -96); } return true; })()`);
  await sleep(500);
  await shot(`screenshot-03b-evidence-scrolled-${LANG}`);
  log("done. practice url:", await ev(`location.href`));
} catch (e) {
  console.error("FAILED:", e.message);
  try { await shot(`failure-${LANG}`); await shot(`failure-${LANG}`, { full: true }); } catch {}
  process.exitCode = 1;
} finally {
  cleanup();
}
