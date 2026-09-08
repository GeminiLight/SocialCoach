// Renders the 1200×630 social preview images (zh + en) into site/assets/.
// Uses the `sharp` that Next.js already installed under app/node_modules, so
// there is nothing extra to install. Run from anywhere:
//   node site/scripts/og.mjs
// Commit the PNGs; the build does not regenerate them.

import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pick, hero, site } from "../content.mjs";

const here = dirname(fileURLToPath(import.meta.url));
// pnpm does not hoist sharp into app/node_modules; it lives in the virtual store.
const appDir = join(here, "..", "..", "app");
const req = createRequire(import.meta.url);
const sharp = req(join(appDir, "node_modules", ".pnpm", "node_modules", "sharp"));

// Hex twins of the OKLCH tokens (see wiki/03-design-principle.md); SVG rasterisers do not read OKLCH.
const C = { paper: "#faf6f1", ink: "#261d16", ink3: "#71675f", line: "#ded8d1", accent: "#ca592e",
  amber: "#ad7c2f", moss: "#518046", teal: "#00656a", clay: "#c65b4c", indigo: "#485996" };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sans = "'PingFang SC','Hiragino Sans GB','Noto Sans SC','Microsoft YaHei',sans-serif";
const serif = "Georgia,'Iowan Old Style','Palatino Linotype','Times New Roman',serif";

const radar = (cx, cy, r) => {
  const pt = (i, k) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [cx + k * r * Math.cos(a), cy + k * r * Math.sin(a)]; };
  const ring = (k) => Array.from({ length: 5 }, (_, i) => pt(i, k).map((v) => v.toFixed(1)).join(",")).join(" ");
  const vals = [0.8, 0.6, 0.72, 0.5, 0.58];
  const data = vals.map((v, i) => pt(i, v));
  const cols = [C.amber, C.moss, C.teal, C.clay, C.indigo];
  return `<g fill="none" stroke="${C.line}" stroke-width="1.4">
<polygon points="${ring(1)}"/><polygon points="${ring(0.66)}"/><polygon points="${ring(0.33)}"/>
${Array.from({ length: 5 }, (_, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join("")}</g>
<polygon points="${data.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="${C.accent}" fill-opacity="0.15" stroke="${C.accent}" stroke-opacity="0.6" stroke-width="2.4"/>
${data.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${cols[i]}"/>`).join("")}`;
};

const wrap = (text, max) => {
  // Greedy wrap; CJK breaks per character, Latin per word.
  const cjk = /[\u3000-\u9fff\uff00-\uffef]/.test(text);
  const units = cjk ? Array.from(text) : text.split(" ");
  const lines = []; let cur = "";
  for (const u of units) { const next = cur ? (cjk ? cur + u : cur + " " + u) : u; if (next.length > max && cur) { lines.push(cur); cur = u; } else cur = next; }
  if (cur) lines.push(cur);
  return lines;
};

const svg = (lang) => {
  const zh = lang === "zh";
  const h1 = pick(hero.h1, lang);
  const sub = zh ? "有阻力的困难对话排练，引用你原话的复盘。" : "Difficult-conversation rehearsal with pushback, and a debrief that quotes you.";
  const subLines = wrap(sub, zh ? 24 : 46);
  const h1Size = zh ? 62 : 58;
  // Chinese breaks at the comma so the phrase stays whole; English wraps by width.
  const h1Lines = zh ? h1.split(/(?<=，)/) : wrap(h1, 22);
  const y0 = 262; // first headline baseline; the wordmark sits above at 176
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${C.paper}"/>
<line x1="88" y1="0" x2="88" y2="630" stroke="${C.line}" stroke-width="1.5"/>
${radar(985, 300, 170)}
<text x="132" y="118" font-family="${zh ? sans : serif}" font-size="22" fill="${C.ink3}" letter-spacing="${zh ? 7 : 2}">${zh ? "情商练习场" : "SOCIAL COACH"}</text>
<text x="130" y="176" font-family="${serif}" font-size="44" fill="${C.ink}" letter-spacing="-1">SocialCoach</text>
${h1Lines.map((ln, i) => `<text x="130" y="${y0 + i * (h1Size + 10)}" font-family="${zh ? sans : serif}" font-weight="${zh ? 600 : 400}" font-size="${h1Size}" fill="${C.ink}" letter-spacing="${zh ? 0 : -1.5}">${esc(ln)}</text>`).join("")}
<path d="M134 ${y0 + (h1Lines.length - 1) * (h1Size + 10) + 22} C 200 ${y0 + (h1Lines.length - 1) * (h1Size + 10) + 18}, 300 ${y0 + (h1Lines.length - 1) * (h1Size + 10) + 25}, 400 ${y0 + (h1Lines.length - 1) * (h1Size + 10) + 20} S 560 ${y0 + (h1Lines.length - 1) * (h1Size + 10) + 26}, 640 ${y0 + (h1Lines.length - 1) * (h1Size + 10) + 21}" fill="none" stroke="${C.accent}" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
${subLines.map((ln, i) => `<text x="132" y="${y0 + (h1Lines.length - 1) * (h1Size + 10) + 76 + i * 36} " font-family="${sans}" font-size="26" fill="${C.ink3}">${esc(ln)}</text>`).join("")}
<text x="132" y="560" font-family="${serif}" font-size="20" fill="${C.ink3}">arXiv:${site.arxivId}</text>
<text x="300" y="560" font-family="${sans}" font-size="20" fill="${C.ink3}">${zh ? "无需注册 · 记录留在设备上" : "No account · History stays on your device"}</text>
</svg>`;
};

for (const lang of ["zh", "en"]) {
  const png = await sharp(Buffer.from(svg(lang)), { density: 144 }).resize(1200, 630).png({ compressionLevel: 9 }).toBuffer();
  const file = join(here, "..", "assets", `og-${lang}.png`);
  writeFileSync(file, png);
  console.log(`wrote ${file} (${(png.length / 1024).toFixed(0)} KB)`);
}
