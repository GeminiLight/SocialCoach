/** Recovery UI/backup checks. Uses a disposable localhost browser; never a real profile. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const base = process.env.UX_BASE_URL ?? "http://localhost:3101";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const session = `socialcoach-storage-${process.pid}`;
const artifacts = process.env.UX_ARTIFACTS ?? join(tmpdir(), session);
mkdirSync(artifacts, { recursive: true });
function browser(args: string[], input?: string) {
  const result = JSON.parse(execFileSync("agent-browser", ["--session", session, "--json", ...args], { input, encoding: "utf8", timeout: 45000 }));
  assert(result.success, JSON.stringify(result.error));
  return result.data;
}
const evaluate = (code: string) => browser(["eval", "--stdin"], code).result;
const wait = (code: string) => browser(["wait", "--fn", code]);
function check(name: string, result: unknown) { assert(result, name); console.log(`PASS ${name}`); }
try {
  browser(["open", "about:blank"]);
  browser(["network", "route", "**/api/track", "--body", "{}"]);
  browser(["open", base + "/onboarding"]);
  wait("document.querySelector('h1') !== null");
  evaluate("localStorage.setItem('socialcoach.v1', '{broken'); true");
  browser(["open", base + "/onboarding"]);
  wait("document.body.innerText.includes('暂时无法读取')");
  const scans: unknown[] = [];
  for (const lang of ["zh", "en"]) {
    browser(["find", "role", "button", "click", "--name", lang === "zh" ? "中文" : "English", "--exact"]);
    for (const theme of ["light", "dark"]) {
      evaluate(`document.documentElement.dataset.theme = '${theme}'; true`);
      for (const width of [360, 768, 1024, 1440]) {
        browser(["set", "viewport", String(width), "900"]);
        wait("!document.getAnimations().some(a=>a.playState==='running' && a.effect.getTiming().iterations!==Infinity)");
        check(`recovery ${lang}/${theme}/${width} has no overflow and preserves raw data`, evaluate("document.documentElement.scrollWidth <= innerWidth && localStorage.getItem('socialcoach.v1') === '{broken'"));
        if (width === 360 || width === 1440) {
          browser(["screenshot", join(artifacts, `recovery-${lang}-${theme}-${width}.png`)]);
          const scan = browser(["a11y", "--tags", "wcag2a,wcag2aa"]);
          scans.push({ lang, theme, width, ...scan });
          check("recovery has no automatic accessibility violations", scan.counts.violations === 0);
        }
      }
    }
  }
  browser(["find", "role", "button", "click", "--name", "中文", "--exact"]);
  check("restart remains disabled until the raw backup is offered", evaluate("Array.from(document.querySelectorAll('button')).find(e=>e.textContent==='重新开始').disabled"));
  evaluate("(() => { const original=URL.createObjectURL.bind(URL); URL.createObjectURL=(blob)=>{window.__recoveryBackup=blob;return original(blob)}; return true; })()");
  browser(["find", "role", "button", "click", "--name", "下载原始档案", "--exact"]);
  check("download preserves the exact unreadable bytes", evaluate("window.__recoveryBackup.text().then(text=>text==='{broken')"));
  browser(["find", "role", "button", "click", "--name", "重新开始", "--exact"]);
  wait("!!document.querySelector('dialog[open]')");
  browser(["find", "role", "button", "click", "--name", "取消", "--exact"]);
  check("cancelling reset preserves the original records", evaluate("localStorage.getItem('socialcoach.v1') === '{broken'"));
  browser(["find", "role", "button", "click", "--name", "重新开始", "--exact"]);
  browser(["click", "dialog button.bg-action"]);
  wait("document.body.innerText.includes('排练我的对话')");
  check("confirmed restart returns to onboarding with a readable empty profile", evaluate("JSON.parse(localStorage.getItem('socialcoach.v1')).state.profile === null"));
  writeFileSync(join(artifacts, "accessibility.json"), JSON.stringify(scans, null, 2));
  console.log(`Artifacts: ${artifacts}`);
} finally { browser(["close"]); }
