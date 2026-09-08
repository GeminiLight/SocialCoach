// Zero-dependency static build for the official site.
//   node site/build.mjs            → site/dist/  (zh at /, en at /en/)
//   SITE_URL=https://example.com node site/build.mjs
//
// Colour tokens below are copied from app/src/app/globals.css (OKLCH, light and
// dark). Change colours there first, then mirror them here.

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pick, site, meta, nav, hero, marquee, gap, how, trust, privacy, faq, research, footer } from "./content.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = join(here, "dist");
const SITE_URL = (process.env.SITE_URL || site.defaultUrl).replace(/\/$/, "");

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// *phrase* in content → an ochre hand-drawn underline, the debrief's own gesture.
const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, '<mark class="ul">$1</mark>');

const pages = [
  { lang: "zh", htmlLang: "zh-CN", dir: "", rel: "", url: `${SITE_URL}/`, other: "en/" },
  { lang: "en", htmlLang: "en", dir: "en", rel: "../", url: `${SITE_URL}/en/`, other: "../" },
];
const urlOf = (lang) => pages.find((p) => p.lang === lang).url;

// Optional real-product screenshots. Named per marketing/03-asset-plan.md; the
// block only renders when the file exists, so nothing ships as a placeholder.
const SHOT_NAMES = { 1: "screenshot-01-home", 2: "screenshot-02-pushback", 3: "screenshot-03-evidence-debrief" };
const shot = (n, lang) => {
  const file = `${SHOT_NAMES[n]}-${lang}.png`;
  return existsSync(join(here, "assets", file)) ? `assets/${file}` : null;
};

/* -------------------------------- corpus --------------------------------- */
// The scenario strip reads the product's corpus straight from app/src/data so it
// never drifts. It is a regex over our own TS, not a TS parser: each scenario
// object starts at a two-space-indented brace and has title/context fields.
const corpusDir = join(root, "app", "src", "data", "corpus");
const CONTEXT_NAMES = (() => {
  const tax = readFileSync(join(root, "app", "src", "data", "taxonomy.ts"), "utf8");
  const start = tax.indexOf("export const CONTEXTS");
  const end = tax.indexOf("export const", start + 10);
  const block = tax.slice(start, end < 0 ? undefined : end);
  const names = {};
  for (const m of block.matchAll(/\{ id: "([a-z-]+)", name: L\("([^"]+)", "([^"]+)"\)/g)) names[m[1]] = { zh: m[2], en: m[3] };
  return names;
})();
const CONTEXT_HUE = { workplace: "--c-clay", family: "--c-amber", friendship: "--c-moss", romantic: "--c-rose", education: "--c-teal", party: "--c-ochre", public: "--c-indigo" };
const SCENARIOS = readdirSync(corpusDir)
  .filter((f) => /^scenarios-[a-z]\.ts$/.test(f))
  .sort()
  .flatMap((f) =>
    readFileSync(join(corpusDir, f), "utf8")
      .split(/\n  \{\n/)
      .slice(1)
      .map((b) => {
        const id = b.match(/^\s*id: "([^"]+)"/)?.[1];
        const t = b.match(/\n\s*title: L\("((?:[^"\\]|\\.)*)", "((?:[^"\\]|\\.)*)"\)/);
        const context = b.match(/\n\s*context: "([a-z-]+)"/)?.[1];
        return id && t && context ? { id, title: { zh: t[1], en: t[2] }, context } : null;
      })
      .filter(Boolean),
  );
if (SCENARIOS.length < 20) console.warn(`warn: only ${SCENARIOS.length} scenarios parsed from the corpus`);

/* ---------------------------------- SVG ---------------------------------- */

const heartPath =
  "M256 396 C196 350 112 300 112 224 A74 74 0 0 1 256 196 A74 74 0 0 1 400 224 C400 300 316 350 256 396 Z";
const sparkPath =
  "M410 98 C414.7 122.2 421.8 129.3 446 134 C421.8 138.7 414.7 145.8 410 170 C405.3 145.8 398.2 138.7 374 134 C398.2 129.3 405.3 122.2 410 98 Z";
const mark = (size, id) => `<svg width="${size}" height="${size}" viewBox="0 0 512 512" aria-hidden="true" class="mark">
<rect width="512" height="512" rx="112" fill="var(--paper-deep)"/>
<defs><clipPath id="${id}"><rect width="256" height="512"/></clipPath></defs>
<path d="${heartPath}" fill="var(--accent)"/>
<path d="${heartPath}" fill="var(--ink)" clip-path="url(#${id})"/>
<path d="${sparkPath}" fill="var(--ink)"/></svg>`;

// The pentagon radar from docs/banner.svg, re-coloured with tokens so it works in both themes.
const radar = (aria) => {
  const cx = 200, cy = 210, r = 150;
  const pt = (i, k) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [cx + k * r * Math.cos(a), cy + k * r * Math.sin(a)];
  };
  const ring = (k) => Array.from({ length: 5 }, (_, i) => pt(i, k).map((v) => v.toFixed(1)).join(",")).join(" ");
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const [x, y] = pt(i, 1);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
  }).join("");
  const values = [0.8, 0.6, 0.72, 0.5, 0.58];
  const data = values.map((v, i) => pt(i, v));
  const poly = data.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ");
  const hues = ["--c-amber", "--c-moss", "--c-teal", "--c-clay", "--c-indigo"];
  const dots = data.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="var(${hues[i]})"/>`).join("");
  return `<svg class="radar" viewBox="0 0 400 400" role="img" aria-label="${esc(aria)}">
<g fill="none" stroke="var(--line)" stroke-width="1.2">
<polygon points="${ring(1)}"/><polygon points="${ring(0.66)}"/><polygon points="${ring(0.33)}"/>${spokes}</g>
<polygon points="${poly}" fill="var(--accent)" fill-opacity="0.14" stroke="var(--accent)" stroke-opacity="0.7" stroke-width="2"/>
${dots}</svg>`;
};

const squiggle = `<svg class="squiggle" viewBox="0 0 540 12" aria-hidden="true" preserveAspectRatio="none">
<path d="M4 8.5 C 70 5, 150 11, 220 6.5 S 380 11.5, 460 6.5 S 510 10, 536 7" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/></svg>`;

const arrow = `<svg class="arrow" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4l3.5 4-3.5 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Monoline glyphs, 1.6px stroke, currentColor. Restraint on purpose: they mark, they do not decorate.
const ICON = {
  scene: `<rect x="7" y="9" width="30" height="34" rx="4"/><rect x="13" y="5" width="30" height="34" rx="4"/><path d="M20 17h16M20 24h16M20 31h9"/>`,
  pushback: `<path d="M6 12a4 4 0 0 1 4-4h18a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H16l-7 6v-6a4 4 0 0 1-3-4z"/><path d="M42 26a4 4 0 0 0-4-4H24"/><path d="M40 30l-4 4 4 4M44 22v4"/><path d="M12 39h30" stroke-dasharray="2 4"/>`,
  quote: `<path d="M12 12c-4 2-6 5-6 10v4h8v-8h-4c0-3 1-4 4-6zM30 12c-4 2-6 5-6 10v4h8v-8h-4c0-3 1-4 4-6z"/><path d="M8 38c8-3 14 3 22 0s10-2 14 0" stroke-width="2.2"/>`,
  radar: `<path d="M24 5l18 13-7 22H13L6 18z"/><path d="M24 14l10 7-4 13H18l-4-13z" opacity=".55"/><circle cx="24" cy="24" r="2.5" fill="currentColor" stroke="none"/>`,
  gauge: `<path d="M8 32a16 16 0 0 1 32 0"/><path d="M24 32l7-11"/><circle cx="24" cy="32" r="2" fill="currentColor" stroke="none"/><path d="M14 40h20" stroke-dasharray="2 3"/>`,
  device: `<rect x="13" y="4" width="22" height="40" rx="5"/><path d="M21 8h6"/><rect x="18" y="22" width="12" height="10" rx="2"/><path d="M21 22v-3a3 3 0 0 1 6 0v3"/>`,
  box: `<path d="M24 6l16 8v18l-16 8-16-8V14z"/><path d="M8 14l16 8 16-8M24 22v18"/>`,
  clock: `<circle cx="24" cy="24" r="16"/><path d="M24 14v10l7 4"/>`,
  enter: `<path d="M20 8h-9a3 3 0 0 0-3 3v26a3 3 0 0 0 3 3h9"/><path d="M18 24h22M33 17l7 7-7 7"/>`,
  book: `<path d="M8 10a4 4 0 0 1 4-4h26v32H12a4 4 0 0 0-4 4z"/><path d="M8 42a4 4 0 0 1 4-4h26"/><path d="M17 14h13M17 21h9"/>`,
  pin: `<path d="M24 42S11 31 11 21a13 13 0 0 1 26 0c0 10-13 21-13 21z"/><circle cx="24" cy="21" r="4"/>`,
  sparkle: `<path d="M22 6c1.4 8.5 4.8 11.9 13.3 13.3C26.8 20.7 23.4 24.1 22 32.6 20.6 24.1 17.2 20.7 8.7 19.3 17.2 17.9 20.6 14.5 22 6z"/><path d="M36 30l1 3.5 3.5 1-3.5 1L36 39l-1-3.5-3.5-1 3.5-1z" stroke-width="1.3"/>`,
  ban: `<circle cx="24" cy="24" r="16"/><path d="M13 13l22 22"/>`,
  help: `<circle cx="24" cy="24" r="16"/><path d="M18.5 19a5.5 5.5 0 1 1 8 4.9c-1.7.9-2.5 2-2.5 3.6"/><circle cx="24" cy="33" r="1.3" fill="currentColor" stroke="none"/>`,
  file: `<path d="M12 6h16l10 10v26H12z"/><path d="M28 6v10h10"/><path d="M18 27h12M18 33h12"/>`,
  external: `<path d="M20 10H10v28h28V28"/><path d="M27 8h13v13M40 8L23 25"/>`,
  code: `<path d="M16 15L7 24l9 9M32 15l9 9-9 9M28 9l-8 30"/>`,
  globe: `<circle cx="24" cy="24" r="16"/><path d="M8 24h32M24 8c5 5 7.5 10.3 7.5 16S29 35 24 40c-5-5-7.5-10.3-7.5-16S19 13 24 8z"/>`,
  sun: `<circle cx="24" cy="24" r="7"/><path d="M24 5v5M24 38v5M5 24h5M38 24h5M10.6 10.6l3.5 3.5M33.9 33.9l3.5 3.5M10.6 37.4l3.5-3.5M33.9 14.1l3.5-3.5"/>`,
  moon: `<path d="M29 7a16 16 0 1 0 12 27A17.5 17.5 0 0 1 29 7z"/>`,
  auto: `<rect x="6" y="9" width="36" height="24" rx="3"/><path d="M17 41h14M24 33v8"/><path d="M14 21a10 10 0 0 1 10-8v16a10 10 0 0 1-10-8z" fill="currentColor" stroke="none" opacity=".35"/>`,
  shield: `<path d="M24 6l14 5v12c0 9-6 15-14 19-8-4-14-10-14-19V11z"/><path d="M17 24l5 5 9-10"/>`,
};
const icon = (name, size = 28) => `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON[name] || ""}</svg>`;

// The debrief's gesture as a schematic: lines of a transcript, one underlined,
// a leader to the margin. Abstract bars on purpose: no invented dialogue.
const annotated = (kind) => {
  const bars = [
    [0, 0, 150], [0, 22, 118], [0, 62, 168], [0, 84, 96],
  ];
  const hi = kind === "acquisition" ? 1 : 3;
  return `<svg class="annot" viewBox="0 0 320 112" aria-hidden="true">
${bars.map(([x, y, w], i) => `<rect x="${x + 16}" y="${y + 8}" width="${w}" height="10" rx="5" fill="var(--line)"/>` + (i === hi ? `<path d="M${x + 16} ${y + 24} C ${x + 40} ${y + 21}, ${x + 70} ${y + 27}, ${x + 100} ${y + 23} S ${x + w - 10} ${y + 26}, ${x + w + 16} ${y + 23}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round"/>` : "")).join("")}
<rect x="96" y="${8 + 44}" width="0" height="0"/>
<path d="M${16 + bars[hi][2] + 20} ${bars[hi][1] + 13} H 250" stroke="var(--line-strong)" stroke-dasharray="3 4"/>
<circle cx="250" cy="${bars[hi][1] + 13}" r="4" fill="var(--accent)"/>
<path d="M258 ${bars[hi][1] + 13} h 46" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
</svg>`;
};

// A row of objective cells filling with ink, the app's own progress motif.
const inkRow = (filled = 5, total = 8) => `<span class="inkrow" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${i < filled ? "on" : ""}"></i>`).join("")}</span>`;

// Paper grain, inlined so nothing external is fetched.
const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .3 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")`;

/* ---------------------------------- CSS ---------------------------------- */

const css = `
:root{
  --paper:#faf6f1;--paper:oklch(0.975 0.008 80);
  --paper-deep:#f4efe8;--paper-deep:oklch(0.955 0.011 78);
  --card:#fefcf9;--card:oklch(0.992 0.004 85);
  --inset:oklch(0.95 0.012 78);
  --ink:#261d16;--ink:oklch(0.24 0.02 60);
  --ink-2:#50453d;--ink-2:oklch(0.4 0.02 60);
  --ink-3:#71675f;--ink-3:oklch(0.52 0.018 62);
  --ink-4:#a59d96;--ink-4:oklch(0.7 0.014 65);
  --line:#ded8d1;--line:oklch(0.885 0.012 75);
  --line-strong:#c4bcb3;--line-strong:oklch(0.8 0.016 72);
  --accent:#ca592e;--accent:oklch(0.6 0.155 40);
  --accent-deep:#ad411c;--accent-deep:oklch(0.52 0.15 38);
  --accent-soft:#ffe4d5;--accent-soft:oklch(0.94 0.04 48);
  --accent-ink:#fdf8ef;--accent-ink:oklch(0.985 0.01 70);
  --action:var(--accent-deep);
  --action-hover:oklch(0.46 0.14 38);
  --slab:var(--ink);--slab-ink:var(--paper);
  --c-amber:oklch(0.62 0.10 75);--c-moss:oklch(0.55 0.09 140);--c-teal:oklch(0.50 0.08 200);--c-clay:oklch(0.58 0.11 30);--c-indigo:oklch(0.50 0.09 270);--c-rose:oklch(0.60 0.10 15);--c-ochre:oklch(0.62 0.11 60);
  --grain-opacity:.14;
  --shadow:0 30px 60px -32px oklch(0.2 0.02 60 / .45), 0 2px 6px -2px oklch(0.2 0.02 60 / .12);
  --radius-sm:10px;--radius:16px;--radius-lg:22px;
  --font-sans:"Hanken Grotesk","PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;
  --font-serif:Georgia,"Iowan Old Style","Palatino Linotype","Times New Roman",serif;
  --content:1120px;--measure:62ch;
  --ease-out:cubic-bezier(0.22,1,0.36,1);--ease-expo:cubic-bezier(0.16,1,0.3,1);
  color-scheme:light dark;
}
:root[data-theme="light"]{color-scheme:light}
:root[data-theme="dark"]{color-scheme:dark}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--paper:oklch(0.205 0.012 62);--paper-deep:oklch(0.165 0.011 60);--card:oklch(0.238 0.013 63);--inset:oklch(0.272 0.014 63);
  --ink:oklch(0.935 0.012 78);--ink-2:oklch(0.80 0.013 75);--ink-3:oklch(0.655 0.013 70);--ink-4:oklch(0.515 0.012 68);
  --line:oklch(0.315 0.014 65);--line-strong:oklch(0.425 0.016 65);
  --accent:oklch(0.70 0.145 42);--accent-deep:oklch(0.795 0.125 46);--accent-soft:oklch(0.315 0.055 44);--accent-ink:oklch(0.17 0.02 50);
  --action-hover:oklch(0.84 0.10 46);
  --c-amber:oklch(0.78 0.10 75);--c-moss:oklch(0.74 0.09 140);--c-teal:oklch(0.72 0.08 200);--c-clay:oklch(0.76 0.10 30);--c-indigo:oklch(0.72 0.09 270);--c-rose:oklch(0.76 0.09 15);--c-ochre:oklch(0.78 0.10 60);
  --grain-opacity:.09;
  --shadow:0 30px 60px -30px oklch(0 0 0 / .7), 0 2px 6px -2px oklch(0 0 0 / .4);}
:root:not([data-theme="light"]) body::before{mix-blend-mode:screen}
:root:not([data-theme="light"]) mark.ul{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 8' preserveAspectRatio='none'%3E%3Cpath d='M2 5.5C20 3 40 7 60 4.5S100 6.5 118 4' fill='none' stroke='%23e08a5c' stroke-width='2' stroke-linecap='round' opacity='.9'/%3E%3C/svg%3E")}}
:root[data-theme="dark"]{--paper:oklch(0.205 0.012 62);--paper-deep:oklch(0.165 0.011 60);--card:oklch(0.238 0.013 63);--inset:oklch(0.272 0.014 63);
  --ink:oklch(0.935 0.012 78);--ink-2:oklch(0.80 0.013 75);--ink-3:oklch(0.655 0.013 70);--ink-4:oklch(0.515 0.012 68);
  --line:oklch(0.315 0.014 65);--line-strong:oklch(0.425 0.016 65);
  --accent:oklch(0.70 0.145 42);--accent-deep:oklch(0.795 0.125 46);--accent-soft:oklch(0.315 0.055 44);--accent-ink:oklch(0.17 0.02 50);
  --action-hover:oklch(0.84 0.10 46);
  --c-amber:oklch(0.78 0.10 75);--c-moss:oklch(0.74 0.09 140);--c-teal:oklch(0.72 0.08 200);--c-clay:oklch(0.76 0.10 30);--c-indigo:oklch(0.72 0.09 270);
  --grain-opacity:.09;
  --shadow:0 30px 60px -30px oklch(0 0 0 / .7), 0 2px 6px -2px oklch(0 0 0 / .4);}
:root[data-theme="dark"] body::before{mix-blend-mode:screen}
:root[data-theme="dark"] mark.ul{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 8' preserveAspectRatio='none'%3E%3Cpath d='M2 5.5C20 3 40 7 60 4.5S100 6.5 118 4' fill='none' stroke='%23e08a5c' stroke-width='2' stroke-linecap='round' opacity='.9'/%3E%3C/svg%3E")}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:5rem}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font-sans);font-size:1.0625rem;line-height:1.65;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;position:relative}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;background-image:GRAIN;opacity:var(--grain-opacity);mix-blend-mode:multiply}
body>*{position:relative;z-index:1}
a{color:inherit}
a:focus-visible,button:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
img,svg{display:block;max-width:100%}
p{margin:0}
h1,h2,h3{margin:0;font-weight:700;letter-spacing:-0.01em;line-height:1.15;text-wrap:balance}
.serif{font-family:var(--font-serif);font-weight:400;letter-spacing:-0.005em}
.wrap{max-width:var(--content);margin:0 auto;padding:0 clamp(16px,4vw,32px);position:relative}
.skip{position:absolute;left:-999px;top:8px;background:var(--card);padding:.5rem .75rem;border:1px solid var(--line-strong);border-radius:var(--radius-sm)}
.skip:focus{left:8px;z-index:50}
.eyebrow{font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);font-weight:600;display:flex;align-items:center;gap:.6rem}
.eyebrow::before{content:"";width:1.25rem;height:2px;background:var(--accent);border-radius:2px;flex:0 0 auto}
.eyebrow.num::before{display:none}
.eyebrow .no{font-family:var(--font-serif);font-size:1.05rem;letter-spacing:0;color:var(--accent);line-height:1}
.eyebrow .no::after{content:"";display:inline-block;width:1rem;height:1px;background:var(--line-strong);margin:0 .1rem 0 .7rem;vertical-align:middle}
.icon{flex:0 0 auto}
.measure{max-width:var(--measure)}
.muted{color:var(--ink-3)}
mark.ul{background:none;color:inherit;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 8' preserveAspectRatio='none'%3E%3Cpath d='M2 5.5C20 3 40 7 60 4.5S100 6.5 118 4' fill='none' stroke='%23ca592e' stroke-width='2' stroke-linecap='round' opacity='.85'/%3E%3C/svg%3E");background-repeat:no-repeat;background-size:100% .5em;background-position:0 100%;padding-bottom:.12em}

main{position:relative}

/* reveal on scroll (transform/opacity only) */
html.js .reveal{opacity:0;transform:translateY(14px);transition:opacity .7s var(--ease-out),transform .7s var(--ease-out)}
html.js .reveal.in{opacity:1;transform:none}
html.js .reveal[data-d="1"]{transition-delay:.08s}html.js .reveal[data-d="2"]{transition-delay:.16s}html.js .reveal[data-d="3"]{transition-delay:.24s}
@media (prefers-reduced-motion:reduce){html.js .reveal{opacity:1;transform:none;transition:none}}

/* nav */
.nav{position:sticky;top:0;z-index:20;background:color-mix(in oklab,var(--paper) 86%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.nav .wrap{display:flex;align-items:center;gap:1rem;min-height:64px}
.brand{display:flex;align-items:center;gap:.65rem;text-decoration:none;margin-right:auto}
.brand .word{font-family:var(--font-serif);font-size:1.25rem;letter-spacing:-0.01em;line-height:1}
.brand .zh{font-size:.72rem;letter-spacing:.22em;color:var(--ink-3);margin-top:.2rem}
.nav-links{display:none;gap:1.5rem;font-size:.95rem}
.nav-links a{text-decoration:none;color:var(--ink-2);position:relative}
.nav-links a::after{content:"";position:absolute;left:0;right:100%;bottom:-4px;height:2px;background:var(--accent);transition:right .25s var(--ease-out)}
.nav-links a:hover{color:var(--ink)}.nav-links a:hover::after{right:0}
.ctrl{display:flex;align-items:center;gap:.5rem}
.seg{display:inline-flex;align-items:center;border:1px solid var(--line-strong);border-radius:999px;padding:2px;gap:2px;background:var(--card)}
.seg .icon{width:15px;height:15px;color:var(--ink-3);margin:0 .15rem 0 .5rem}
.seg a{text-decoration:none;font-size:.8rem;font-weight:600;line-height:1;padding:.42rem .62rem;border-radius:999px;color:var(--ink-2);transition:background .18s,color .18s}
.seg a:hover{background:var(--paper-deep)}
.seg a.on{background:var(--ink);color:var(--paper)}
.theme{width:36px;height:36px;border-radius:999px;border:1px solid var(--line-strong);background:var(--card);display:grid;place-items:center;color:var(--ink-2);cursor:pointer;padding:0;transition:background .18s,transform .15s var(--ease-out)}
.theme:hover{background:var(--paper-deep)}.theme:active{transform:scale(.94)}
.theme .icon{width:18px;height:18px;display:none}
html:not([data-theme]) .theme .i-auto,html[data-theme="light"] .theme .i-sun,html[data-theme="dark"] .theme .i-moon{display:block}
@media (max-width:40rem){.nav .wrap{gap:.5rem;min-height:56px}.brand .word,.brand .zh{display:none}.nav .btn-sm{padding:.5rem .8rem;font-size:.88rem;white-space:nowrap}.seg .icon{display:none}.seg a{padding:.4rem .5rem}}
@media (min-width:64rem){.nav-links{display:flex}}

/* buttons */
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.8rem 1.2rem;border-radius:999px;font-weight:600;font-size:.98rem;text-decoration:none;border:1px solid transparent;transition:background .18s var(--ease-out),transform .12s var(--ease-out),border-color .18s,box-shadow .2s}
.btn .arrow{transition:transform .2s var(--ease-out)}
.btn:hover .arrow{transform:translateX(3px)}
.btn .icon{width:16px;height:16px;color:var(--accent-deep)}
.btn-primary .icon{color:inherit}
.btn:active{transform:translateY(1px) scale(.99)}
.btn-primary{background:var(--action);color:var(--accent-ink);box-shadow:0 8px 20px -12px var(--accent-deep)}
.btn-primary:hover{background:var(--action-hover)}
.btn-ghost{border-color:var(--line-strong);color:var(--ink);background:transparent}
.btn-ghost:hover{background:var(--paper-deep)}
.btn-sm{padding:.55rem .95rem;font-size:.9rem}

/* hero */
.hero{padding:clamp(48px,7vw,96px) 0 clamp(40px,6vw,80px);overflow:hidden}
.hero .wrap{display:grid;gap:2.5rem;align-items:center}
@media (min-width:64rem){.hero .wrap{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:3rem}}
.pill{display:inline-flex;align-items:center;gap:.6rem;padding:.35rem .9rem .35rem .4rem;border:1px solid var(--line-strong);border-radius:999px;background:var(--card);font-size:.88rem;color:var(--ink-2);text-decoration:none;margin-bottom:1.75rem;transition:border-color .2s,transform .2s var(--ease-out)}
.pill:hover{border-color:var(--ink-4);transform:translateY(-1px)}
.pill .tag{font-family:var(--font-serif);font-size:.8rem;background:var(--accent-soft);color:var(--accent-deep);padding:.18rem .55rem;border-radius:999px}
.pill svg{color:var(--ink-3)}
.hero h1{font-size:clamp(2.3rem,5.4vw + .6rem,4.6rem);margin-top:.6rem;letter-spacing:-0.02em}
.hero h1:lang(zh-CN){word-break:keep-all;overflow-wrap:normal;letter-spacing:0}
.alt:lang(zh-CN),.footer .tag:lang(zh-CN){font-family:var(--font-sans);font-weight:500}
.hero .alt{font-family:var(--font-serif);font-size:clamp(1.25rem,1.6vw + .6rem,1.7rem);color:var(--ink-2);margin-top:1rem;line-height:1.3}
.squiggle{width:min(540px,80%);height:12px;margin:.6rem 0 1.6rem}
.hero .sub{font-size:1.15rem;line-height:1.6;color:var(--ink-2);max-width:56ch}
.ctas{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:2rem}
.micro{display:flex;flex-wrap:wrap;gap:.4rem 1.25rem;margin:1.25rem 0 0;padding:0;font-size:.9rem;color:var(--ink-3)}
.micro li{list-style:none;display:flex;align-items:center;gap:.45rem}
.micro .icon{width:16px;height:16px;color:var(--accent)}
.hero-art{display:flex;justify-content:center;position:relative;min-height:320px}
.hero-art .radar{width:min(380px,80vw)}
.hero-art.with-phone .radar{position:absolute;width:min(560px,110%);left:50%;top:50%;transform:translate(-50%,-50%);opacity:.55}
.phone{width:min(300px,78vw);aspect-ratio:9/19.5;border-radius:38px;border:1px solid var(--line-strong);background:var(--paper-deep);padding:9px;box-shadow:var(--shadow);margin:0;position:relative}
.phone img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:30px}
.phone::after{content:"";position:absolute;top:9px;left:50%;transform:translateX(-50%);width:34%;height:22px;background:var(--paper-deep);border-radius:0 0 14px 14px}
.hero-art .phone{width:min(280px,72vw);transform:rotate(-2deg)}

/* scenario strip: two rows, opposite directions, paused on hover */
.marquee{padding:0 0 clamp(40px,5vw,72px)}
.marquee-head{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1.1rem}
.marquee-head a{display:inline-flex;align-items:center;gap:.4rem;font-size:.92rem;color:var(--ink-2);text-decoration:none;font-weight:600}
.marquee-head a:hover{color:var(--ink)}
.viewport{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);display:grid;gap:.7rem}
.track{display:flex;width:max-content;animation:slide var(--dur,80s) linear infinite}
.track.rev{animation-direction:reverse}
.viewport:hover .track{animation-play-state:paused}
.row{display:flex;gap:.7rem;padding-right:.7rem;margin:0;list-style:none}
@keyframes slide{to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){.track{animation:none}.viewport{overflow-x:auto}}
.chip{display:inline-flex;align-items:center;gap:.6rem;white-space:nowrap;padding:.55rem .95rem .55rem .75rem;border:1px solid var(--line);border-radius:999px;background:var(--card);font-size:.95rem;color:var(--ink)}
.chip .dot{width:8px;height:8px;border-radius:50%;background:var(--dot)}
.chip .ctx{font-size:.78rem;color:var(--ink-3);letter-spacing:.04em}

/* sections */
.section{padding:clamp(56px,8vw,112px) 0;border-top:1px solid var(--line)}
.section-head{display:grid;gap:.85rem;margin-bottom:clamp(28px,4vw,48px)}
.section h2{font-size:clamp(1.8rem,3vw + .4rem,2.6rem);max-width:26ch}
.lead{font-size:1.15rem;color:var(--ink-2);max-width:var(--measure)}

/* gap */
.notes{display:grid;gap:1rem;margin-top:2.25rem}
@media (min-width:48rem){.notes{grid-template-columns:repeat(3,1fr)}}
.note{margin:0;padding:1.6rem 1.5rem 1.5rem;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);font-size:1.05rem;line-height:1.65;position:relative;box-shadow:0 1px 0 var(--line);transition:transform .25s var(--ease-out),box-shadow .25s}
@media (hover:hover){.note:hover{transform:translateY(-3px);box-shadow:var(--shadow)}}
.note::before{content:"“";font-family:var(--font-serif);font-size:3rem;line-height:0;position:absolute;top:1.75rem;left:1.1rem;color:var(--accent);opacity:.7}
.note p{padding-left:1.5rem}
.note:nth-child(2){transform:rotate(.4deg)}.note:nth-child(3){transform:rotate(-.3deg)}
.deficits{display:grid;gap:1rem;margin-top:2.5rem}
@media (min-width:48rem){.deficits{grid-template-columns:1fr 1fr}}
.deficit{padding:1.5rem;border-radius:var(--radius);background:var(--paper-deep);border:1px solid var(--line);display:grid;gap:.5rem}
.deficit .tag{font-family:var(--font-serif);font-style:italic;font-size:.9rem;color:var(--ink-3)}
.deficit h3{font-size:1.45rem}
.deficit p{color:var(--ink-2)}
.annot{width:100%;max-width:320px;height:auto;margin:.5rem 0 .25rem}
.deficit .fix{display:inline-flex;align-items:center;gap:.5rem;font-size:.92rem;color:var(--accent-deep);font-weight:600}
.deficit .fix::before{content:"→";font-family:var(--font-serif)}
.deficit-note{margin-top:1.25rem;color:var(--ink-2);display:flex;gap:.6rem;align-items:baseline}
.deficit-note::before{content:"";flex:0 0 22px;height:2px;background:var(--accent);transform:translateY(-.3em);border-radius:2px}

/* steps */
.steps{list-style:none;margin:0;padding:0}
.step{display:grid;grid-template-columns:3.5rem 1fr;gap:1rem 1.25rem;padding:2rem 0;border-top:1px solid var(--line);align-items:start}
.step:last-child{border-bottom:1px solid var(--line)}
.step .num{font-family:var(--font-serif);font-size:1.6rem;color:var(--accent);line-height:1.1;padding-top:.15rem}
.step h3{font-size:1.35rem;margin-bottom:.5rem}
.step p{color:var(--ink-2);max-width:var(--measure)}
.step .art{grid-column:2;display:flex;justify-content:flex-start}
.step .glyph{width:96px;height:96px;border-radius:var(--radius);background:var(--paper-deep);border:1px solid var(--line);display:grid;place-items:center;color:var(--ink-2)}
.step .glyph .icon{width:44px;height:44px}
.step .phone{width:200px;height:300px;aspect-ratio:auto;padding:6px 6px 0;border-radius:26px 26px 0 0;border-bottom:0;overflow:hidden;-webkit-mask-image:linear-gradient(#000 62%,transparent);mask-image:linear-gradient(#000 62%,transparent);box-shadow:none}.step .phone img{border-radius:20px 20px 0 0;height:auto}.step .phone::after{width:38%;height:14px;top:6px;border-radius:0 0 9px 9px}
@media (min-width:64rem){.step{grid-template-columns:3.5rem 1fr 240px;column-gap:2rem;align-items:start}.step .art{grid-column:3;grid-row:1;justify-content:flex-end}.step .phone{width:220px;height:320px}}

/* trust */
.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem 1rem;margin-top:.5rem}
@media (min-width:48rem){.stats{grid-template-columns:repeat(5,1fr)}}
.stat .icon{width:22px;height:22px;color:var(--accent-deep);margin-bottom:.6rem}
.stat .n{font-family:var(--font-serif);font-size:clamp(2.4rem,3.6vw,3.2rem);line-height:1;letter-spacing:-0.02em}
.stat .l{font-size:.92rem;color:var(--ink-3);margin-top:.35rem}
.inkrow{display:inline-flex;gap:4px;margin-top:.7rem}
.inkrow i{width:14px;height:6px;border-radius:2px;background:var(--line)}
.inkrow i.on{background:var(--accent)}
.stats-note{margin-top:1.75rem;color:var(--ink-2);max-width:var(--measure)}
.sources{margin-top:.5rem;color:var(--ink-3);font-size:.95rem;max-width:var(--measure)}
.sources i{font-family:var(--font-serif);color:var(--ink-2)}
.cards{display:grid;gap:1rem;margin-top:.5rem}
@media (min-width:48rem){.cards{grid-template-columns:repeat(2,1fr)}}
@media (min-width:64rem){.cards{grid-template-columns:repeat(4,1fr)}}
.card{padding:1.5rem;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);transition:transform .25s var(--ease-out),box-shadow .25s}
@media (hover:hover){.card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}}
.card .icon{color:var(--accent-deep);margin-bottom:1rem;width:30px;height:30px;padding:6px;box-sizing:content-box;border-radius:12px;background:var(--accent-soft)}
.card h3{font-size:1.15rem;margin-bottom:.6rem}
.card p{color:var(--ink-2);font-size:1rem}

/* faq */
.faq{display:grid;gap:0 3rem}
@media (min-width:64rem){.faq{grid-template-columns:1fr 1fr}}
.faq details{border-top:1px solid var(--line)}
.faq details:last-child{border-bottom:1px solid var(--line)}
@media (min-width:64rem){.faq details:nth-last-child(2){border-bottom:1px solid var(--line)}}
.faq summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:.8rem;padding:1.15rem 0;font-weight:600;font-size:1.08rem}
.faq summary .icon{width:20px;height:20px;color:var(--accent)}
.faq summary span{flex:1}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";font-family:var(--font-serif);font-size:1.5rem;color:var(--accent);flex:0 0 auto;transition:transform .25s var(--ease-out)}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq .a{padding:0 0 1.35rem 1.75rem;color:var(--ink-2);max-width:var(--measure)}

/* research */
.paper{display:grid;gap:2.5rem;align-items:start}
@media (min-width:64rem){.paper{grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:4rem}}
.paper-card{position:relative;padding:1.6rem 1.75rem 1.5rem;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
.paper-card .top{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1.25rem}
.paper-card .venue{margin:0;font-family:var(--font-sans);font-size:.8rem;letter-spacing:.08em;color:var(--ink-3);font-weight:600}
.stamp{transform:rotate(-3deg);font-family:var(--font-serif);font-size:.8rem;letter-spacing:.06em;color:var(--accent-deep);border:2px solid var(--accent);padding:.28rem .6rem;border-radius:6px;background:var(--card);white-space:nowrap;box-shadow:0 2px 0 var(--accent-soft)}
.paper-title{font-family:var(--font-serif);font-weight:400;font-size:clamp(1.4rem,1.8vw + .4rem,1.8rem);line-height:1.3;letter-spacing:-0.01em;padding-bottom:1.1rem;border-bottom:1px solid var(--line)}
.authors{margin-top:1.25rem;color:var(--ink-2);line-height:1.7;font-size:.95rem}
.authors sup{font-size:.7em;color:var(--ink-3);margin-left:.05em}
.affs{margin-top:.6rem;color:var(--ink-3);font-size:.86rem;line-height:1.6}
.affs sup{font-size:.7em;margin-right:.15em}
.links{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.4rem;padding-top:1.25rem;border-top:1px solid var(--line)}
.links .btn-sm{padding:.5rem .85rem;font-size:.88rem}
.covers{margin:1.25rem 0 0;padding:0;list-style:none;display:grid;gap:.6rem}
.covers li{display:flex;gap:.75rem;color:var(--ink-2)}
.covers li::before{content:"";flex:0 0 6px;height:6px;border-radius:50%;background:var(--accent);margin-top:.65em}
.boundary{margin-top:1.75rem;padding:1.25rem 1.4rem;background:var(--paper-deep);border:1px solid var(--line);border-radius:var(--radius);color:var(--ink-2)}
.boundary .eyebrow{margin-bottom:.4rem}
.boundary .eyebrow::before{display:none}
.boundary .eyebrow .icon{width:16px;height:16px;color:var(--accent)}
.bib{margin-top:1.75rem}
.bib-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem}
.bib button{font:inherit;font-size:.85rem;font-weight:600;color:var(--ink-2);background:var(--card);border:1px solid var(--line-strong);border-radius:999px;padding:.35rem .8rem;cursor:pointer}
.bib button:hover{background:var(--paper-deep)}
pre{margin:0;padding:1rem 1.1rem;background:var(--card);border:1px solid var(--line);border-radius:var(--radius-sm);font-size:.82rem;line-height:1.55;overflow-x:auto;color:var(--ink-2);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}

/* footer */
.footer{border-top:1px solid var(--line);padding:clamp(40px,6vw,72px) 0 2.5rem;color:var(--ink-3);font-size:.92rem;background:var(--paper-deep)}
.footer .top{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1.5rem;align-items:flex-start}
.footer .brand .word{color:var(--ink)}
.footer .tag{margin-top:.6rem;font-family:var(--font-serif);color:var(--ink-2);font-size:1.05rem}
.footer nav{display:flex;flex-wrap:wrap;gap:1.25rem}
.footer nav a{text-decoration:none;color:var(--ink-2)}
.footer nav a:hover{color:var(--ink)}
.footer .disc{margin-top:2rem;max-width:var(--measure);line-height:1.6}
.footer .copy{margin-top:1.25rem;display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between}
`.replace("GRAIN", grain);

/* -------------------------------- template ------------------------------- */

const jsonLd = (p) => {
  const l = p.lang;
  const article = {
    "@type": "ScholarlyArticle",
    "@id": `${site.arxivUrl}#article`,
    headline: research.paperTitle,
    name: research.paperTitle,
    author: research.authors.map((a) => ({
      "@type": "Person",
      name: a.name,
      affiliation: { "@type": "Organization", name: research.affiliations[a.aff - 1] },
    })),
    identifier: `arXiv:${site.arxivId}`,
    url: site.arxivUrl,
    sameAs: [site.pdfUrl],
    datePublished: research.datePublished,
    inLanguage: "en",
    publisher: { "@type": "Organization", name: "arXiv" },
    description: pick(research.lead, "en"),
  };
  const app = {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#app`,
    name: site.name,
    description: pick(meta.description, l),
    url: site.appUrl,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    inLanguage: ["zh-CN", "en"],
    sameAs: [site.repoUrl],
    citation: { "@id": `${site.arxivUrl}#article` },
  };
  const page = {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#site`,
    url: `${SITE_URL}/`,
    name: site.name,
    inLanguage: p.htmlLang,
    about: { "@id": `${SITE_URL}/#app` },
  };
  return JSON.stringify({ "@context": "https://schema.org", "@graph": [page, app, article] });
};

const head = (p) => {
  const l = p.lang;
  const og = `${SITE_URL}/assets/og-${l}.png`;
  const hasOg = existsSync(join(here, "assets", `og-${l}.png`));
  const citation = [
    `<meta name="citation_title" content="${esc(research.paperTitle)}">`,
    ...research.authors.map((a) => `<meta name="citation_author" content="${esc(a.name)}">`),
    `<meta name="citation_publication_date" content="${research.datePublished.replace(/-/g, "/")}">`,
    `<meta name="citation_arxiv_id" content="${site.arxivId}">`,
    `<meta name="citation_pdf_url" content="${SITE_URL}/${site.localPdf}">`,
  ].join("\n");
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pick(meta.title, l))}</title>
<meta name="description" content="${esc(pick(meta.description, l))}">
<link rel="canonical" href="${p.url}">
<link rel="alternate" hreflang="zh-CN" href="${urlOf("zh")}">
<link rel="alternate" hreflang="en" href="${urlOf("en")}">
<link rel="alternate" hreflang="x-default" href="${urlOf("zh")}">
<link rel="icon" href="${p.rel}assets/icon.svg" type="image/svg+xml">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#faf6f1">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#211c18">
<meta property="og:type" content="website">
<meta property="og:site_name" content="SocialCoach">
<meta property="og:title" content="${esc(pick(meta.title, l))}">
<meta property="og:description" content="${esc(pick(meta.description, l))}">
<meta property="og:url" content="${p.url}">
<meta property="og:locale" content="${l === "zh" ? "zh_CN" : "en_US"}">
<meta property="og:locale:alternate" content="${l === "zh" ? "en_US" : "zh_CN"}">
${hasOg ? `<meta property="og:image" content="${og}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="${og}">` : `<meta name="twitter:card" content="summary">`}
<meta name="twitter:title" content="${esc(pick(meta.title, l))}">
<meta name="twitter:description" content="${esc(pick(meta.description, l))}">
${citation}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap">
<style>${css}</style>
<script type="application/ld+json">${jsonLd(p)}</script>`;
};

const navHtml = (p) => {
  const l = p.lang;
  return `<header class="nav">
<div class="wrap">
<a class="brand" href="${p.rel || "./"}" aria-label="SocialCoach">
${mark(30, "m-nav")}
<span><span class="word">SocialCoach</span>${l === "zh" ? '<span class="zh" style="display:block">情商练习场</span>' : ""}</span>
</a>
<nav class="nav-links" aria-label="${l === "zh" ? "页面导航" : "Site"}">
<a href="#how">${esc(pick(nav.how, l))}</a>
<a href="#trust">${esc(pick(nav.trust, l))}</a>
<a href="#privacy">${esc(pick(nav.privacy, l))}</a>
<a href="#faq">${esc(pick(nav.faq, l))}</a>
<a href="#research">${esc(pick(nav.research, l))}</a>
</nav>
<div class="ctrl">
<nav class="seg" aria-label="${esc(pick(nav.langAria, l))}">
${icon("globe", 15)}
<a href="${l === "zh" ? (p.rel || "./") : p.other}" lang="zh-CN" hreflang="zh-CN"${l === "zh" ? ' class="on" aria-current="page"' : ""}>中</a>
<a href="${l === "en" ? "./" : p.other}" lang="en" hreflang="en"${l === "en" ? ' class="on" aria-current="page"' : ""}>EN</a>
</nav>
<button class="theme" type="button" data-theme-toggle aria-label="${esc(pick(nav.themeAria, l))}" data-names="${esc(pick(nav.themeNames, l).join("|"))}">${icon("auto", 18).replace('class="icon"', 'class="icon i-auto"')}${icon("sun", 18).replace('class="icon"', 'class="icon i-sun"')}${icon("moon", 18).replace('class="icon"', 'class="icon i-moon"')}</button>
<a class="btn btn-primary btn-sm" href="${site.appUrl}">${esc(pick(nav.cta, l))}</a>
</div>
</div>
</header>`;
};

const heroHtml = (p) => {
  const l = p.lang;
  const s1 = shot(1, l);
  const s3 = shot(3, l);
  const secondary = s3
    ? `<a class="btn btn-ghost" href="#debrief">${esc(pick(hero.ctaDebrief, l))}</a>`
    : `<a class="btn btn-ghost" href="#how">${esc(pick(hero.ctaHow, l))}</a>`;
  const art = s1
    ? `${radar(pick(hero.radarAria, l))}<figure class="phone"><img src="${p.rel}${s1}" alt="${esc(pick(hero.screenshotAlt, l))}" width="1170" height="2532" loading="eager" fetchpriority="high"></figure>`
    : radar(pick(hero.radarAria, l));
  return `<section class="hero">
<div class="wrap">
<div>
<a class="pill" href="#research">
<span class="tag">${hero.pillTag}</span>
<span>${esc(pick(hero.pill, l))}</span>
${arrow}
</a>
<p class="eyebrow">${esc(pick(hero.eyebrow, l))}</p>
<h1>${esc(pick(hero.h1, l)).replace("，", "，<wbr>")}</h1>
<p class="alt" lang="${l === "zh" ? "en" : "zh-CN"}">${esc(pick(hero.h1Alt, l))}</p>
${squiggle}
<p class="sub">${esc(pick(hero.sub, l))}</p>
<div class="ctas">
<a class="btn btn-primary" href="${site.appUrl}">${esc(pick(hero.ctaPrimary, l))} ${arrow}</a>
${secondary}
</div>
<ul class="micro">${hero.micro.map((m) => `<li>${icon(m.icon, 16)}${esc(pick(m.text, l))}</li>`).join("")}</ul>
</div>
<div class="hero-art${s1 ? " with-phone" : ""}">${art}</div>
</div>
</section>`;
};

const marqueeHtml = (p) => {
  const l = p.lang;
  const contexts = new Set(SCENARIOS.map((s) => s.context));
  const chip = (s) =>
    `<li class="chip" style="--dot:var(${CONTEXT_HUE[s.context] || "--c-amber"})"><span class="dot"></span><span class="ctx">${esc(pick(CONTEXT_NAMES[s.context] || { zh: s.context, en: s.context }, l))}</span><span>${esc(pick(s.title, l))}</span></li>`;
  // interleave contexts so no row is a block of one colour
  const byCtx = [...contexts].map((c) => SCENARIOS.filter((s) => s.context === c));
  const mixed = [];
  for (let i = 0; byCtx.some((a) => a.length > i); i++) for (const a of byCtx) if (a[i]) mixed.push(a[i]);
  const half = Math.ceil(mixed.length / 2);
  const rows = [mixed.slice(0, half), mixed.slice(half)];
  const row = (items, rev) => `<div class="track${rev ? " rev" : ""}" style="--dur:${Math.round(items.length * 3.4)}s"><ul class="row">${items.map(chip).join("")}</ul><ul class="row" aria-hidden="true">${items.map(chip).join("")}</ul></div>`;
  const eyebrow = pick(marquee.eyebrow, l).replace("{n}", SCENARIOS.length).replace("{c}", contexts.size);
  return `<section class="marquee" aria-label="${esc(pick(marquee.aria, l))}">
<div class="wrap marquee-head"><p class="eyebrow">${esc(eyebrow)}</p><a href="${site.appUrl}/arena">${esc(pick(marquee.all, l))} ${arrow}</a></div>
<div class="viewport">${row(rows[0], false)}${row(rows[1], true)}</div>
</section>`;
};

const gapHtml = (p) => {
  const l = p.lang;
  return `<section class="section" id="gap">
<div class="wrap">
<div class="section-head reveal">
<p class="eyebrow num"><span class="no">${gap.no}</span>${esc(pick(gap.eyebrow, l))}</p>
<h2>${esc(pick(gap.title, l))}</h2>
<p class="lead">${rich(pick(gap.lead, l))}</p>
</div>
<div class="notes">${gap.hooks.map((h, i) => `<blockquote class="note reveal" data-d="${i}"><p>${rich(pick(h, l))}</p></blockquote>`).join("")}</div>
<div class="deficits">${gap.deficits
    .map(
      (d, i) => `<div class="deficit reveal" data-d="${i}"><span class="tag">${d.tag} deficit</span><h3>${esc(pick(d.label, l))}</h3>${annotated(d.tag)}<p>${esc(pick(d.body, l))}</p><span class="fix">${esc(pick(d.fix, l))}</span></div>`,
    )
    .join("")}</div>
<p class="deficit-note">${esc(pick(gap.deficitNote, l))}</p>
</div>
</section>`;
};

const howHtml = (p) => {
  const l = p.lang;
  const s2 = shot(2, l);
  const s3 = shot(3, l);
  return `<section class="section" id="how">
<div class="wrap">
<div class="section-head reveal">
<p class="eyebrow num"><span class="no">${how.no}</span>${esc(pick(how.eyebrow, l))}</p>
<h2>${esc(pick(how.title, l))}</h2>
</div>
<ol class="steps">${how.steps
    .map((s, i) => {
      const img = s.id === "debrief" ? s3 : s.id === "pushback" ? s2 : null;
      const art = img
        ? `<figure class="phone"><img src="${p.rel}${img}" alt="${esc(pick(s.screenshotAlt, l))}" width="1170" height="2532" loading="lazy"></figure>`
        : `<div class="glyph">${icon(s.icon, 44)}</div>`;
      return `<li class="step reveal"${s.id ? ` id="${s.id}"` : ""}>
<span class="num" aria-hidden="true">0${i + 1}</span>
<div><h3>${esc(pick(s.title, l))}</h3><p>${rich(pick(s.body, l))}</p></div>
<div class="art">${art}</div>
</li>`;
    })
    .join("")}</ol>
</div>
</section>`;
};

const trustHtml = (p) => {
  const l = p.lang;
  return `<section class="section" id="trust">
<div class="wrap">
<div class="section-head reveal">
<p class="eyebrow num"><span class="no">${trust.no}</span>${esc(pick(trust.eyebrow, l))}</p>
<h2>${esc(pick(trust.title, l))}</h2>
</div>
<div class="stats">${trust.stats
    .map((s, i) => `<div class="stat reveal" data-d="${Math.min(i, 3)}">${icon(s.icon, 22)}<div class="n">${s.n}</div><div class="l">${esc(pick(s.label, l))}</div>${inkRow(8 - i, 8)}</div>`)
    .join("")}</div>
<p class="stats-note">${esc(pick(trust.statsNote, l))}</p>
<p class="sources">${esc(pick(trust.sourcesLabel, l))}${l === "zh" ? "：" : ": "}${trust.sources.map((s) => `<i>${esc(s)}</i>`).join(l === "zh" ? "、" : ", ")}${l === "zh" ? "。" : "."}</p>
</div>
</section>`;
};

const privacyHtml = (p) => {
  const l = p.lang;
  return `<section class="section" id="privacy">
<div class="wrap">
<div class="section-head reveal">
<p class="eyebrow num"><span class="no">${privacy.no}</span>${esc(pick(privacy.eyebrow, l))}</p>
<h2>${esc(pick(privacy.title, l))}</h2>
</div>
<div class="cards">${privacy.cards
    .map((c, i) => `<div class="card reveal" data-d="${i}">${icon(c.icon, 30)}<h3>${esc(pick(c.title, l))}</h3><p>${esc(pick(c.body, l))}</p></div>`)
    .join("")}</div>
</div>
</section>`;
};

const faqHtml = (p) => {
  const l = p.lang;
  return `<section class="section" id="faq">
<div class="wrap">
<div class="section-head reveal">
<p class="eyebrow num"><span class="no">${faq.no}</span>${esc(pick(faq.eyebrow, l))}</p>
<h2>${esc(pick(faq.title, l))}</h2>
</div>
<div class="faq">${faq.items
    .map((it) => `<details><summary>${icon("help", 20)}<span>${esc(pick(it.q, l))}</span></summary><p class="a">${esc(pick(it.a, l))}</p></details>`)
    .join("")}</div>
</div>
</section>`;
};

const researchHtml = (p) => {
  const l = p.lang;
  const authors = research.authors
    .map((a) => `<span>${esc(a.name)}<sup>${a.aff}</sup></span>`)
    .join(l === "zh" ? "，" : ", ");
  const affs = research.affiliations.map((a, i) => `<span><sup>${i + 1}</sup>${esc(a)}</span>`).join(" · ");
  return `<section class="section" id="research">
<div class="wrap">
<div class="section-head reveal">
<p class="eyebrow num"><span class="no">${research.no}</span>${esc(pick(research.eyebrow, l))}</p>
<h2>${esc(pick(research.title, l))}</h2>
</div>
<div class="paper">
<div class="paper-card reveal">
<div class="top"><p class="venue">${esc(pick(research.venue, l))}</p><span class="stamp">arXiv · ${site.arxivId}</span></div>
<p class="paper-title" lang="en">${esc(research.paperTitle)}</p>
<p class="authors" lang="en">${authors}</p>
<p class="affs" lang="en">${affs}</p>
<div class="links">
<a class="btn btn-ghost btn-sm" href="${site.arxivUrl}">${icon("external", 16)}${esc(pick(research.links.arxiv, l))}</a>
<a class="btn btn-ghost btn-sm" href="${p.rel}${site.localPdf}">${icon("file", 16)}${esc(pick(research.links.pdf, l))}</a>
<a class="btn btn-ghost btn-sm" href="${site.repoUrl}">${icon("code", 16)}${esc(pick(research.links.code, l))}</a>
<a class="btn btn-ghost btn-sm" href="#bibtex">${icon("quote", 16)}${esc(pick(research.links.bibtex, l))}</a>
</div>
</div>
<div class="reveal" data-d="1">
<p class="lead">${esc(pick(research.lead, l))}</p>
<h3 style="margin-top:1.75rem;font-size:1.1rem">${esc(pick(research.coversTitle, l))}</h3>
<ul class="covers">${research.covers.map((c) => `<li>${esc(pick(c, l))}</li>`).join("")}</ul>
<div class="boundary"><span class="eyebrow">${icon("shield", 16)}${esc(pick(research.boundaryLabel, l))}</span>${esc(pick(research.boundary, l))}</div>
<div class="bib" id="bibtex">
<div class="bib-head"><span class="eyebrow">${esc(pick(research.bibtexLabel, l))}</span><button type="button" data-copy="bib" data-done="${esc(pick(research.copied, l))}">${esc(pick(research.copy, l))}</button></div>
<pre id="bib">${esc(research.bibtex)}</pre>
</div>
</div>
</div>
</div>
</section>`;
};

const footerHtml = (p) => {
  const l = p.lang;
  return `<footer class="footer">
<div class="wrap">
<div class="top">
<div>
<a class="brand" href="${p.rel || "./"}" aria-label="SocialCoach">${mark(30, "m-foot")}<span><span class="word">SocialCoach</span>${l === "zh" ? '<span class="zh" style="display:block">情商练习场</span>' : ""}</span></a>
<p class="tag">${esc(pick(footer.tagline, l))}</p>
</div>
<nav aria-label="${l === "zh" ? "页脚链接" : "Footer"}">
<a href="${site.appUrl}">${esc(pick(footer.links.app, l))}</a>
<a href="${site.repoUrl}">${esc(pick(footer.links.repo, l))}</a>
<a href="${site.arxivUrl}">${esc(pick(footer.links.paper, l))}</a>
<a href="${p.other}" hreflang="${l === "zh" ? "en" : "zh-CN"}" lang="${l === "zh" ? "en" : "zh-CN"}">${l === "zh" ? "English" : "中文"}</a>
</nav>
</div>
<p class="disc">${esc(pick(footer.disclaimer, l))}</p>
<div class="copy"><span>${esc(pick(footer.copyright, l))}</span><span>arXiv:${site.arxivId}</span></div>
</div>
</footer>
<script>
(function(){if(!("IntersectionObserver" in window))return;var els=document.querySelectorAll(".reveal");var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{rootMargin:"0px 0px -8% 0px",threshold:.08});els.forEach(function(el){io.observe(el)})})();
(function(){var b=document.querySelector("[data-theme-toggle]");if(!b)return;var names=(b.getAttribute("data-names")||"").split("|");var order=["","light","dark"];function cur(){return document.documentElement.getAttribute("data-theme")||""}function label(){b.title=names[order.indexOf(cur())]||""}label();b.addEventListener("click",function(){var next=order[(order.indexOf(cur())+1)%order.length];if(next)document.documentElement.setAttribute("data-theme",next);else document.documentElement.removeAttribute("data-theme");try{next?localStorage.setItem("sc-theme",next):localStorage.removeItem("sc-theme")}catch(e){}label()})})();
(function(){var b=document.querySelector('[data-copy]');if(!b||!navigator.clipboard)return;b.addEventListener('click',function(){var t=document.getElementById(b.getAttribute('data-copy')).textContent;navigator.clipboard.writeText(t).then(function(){var o=b.textContent;b.textContent=b.getAttribute('data-done');setTimeout(function(){b.textContent=o},1600)})})})();
</script>`;
};

const page = (p) => `<!doctype html>
<html lang="${p.htmlLang}">
<head>
<script>document.documentElement.classList.add("js");try{var t=localStorage.getItem("sc-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
${head(p)}
</head>
<body>
<a class="skip" href="#main">${esc(pick(nav.skip, p.lang))}</a>
${navHtml(p)}
<main id="main">
${heroHtml(p)}
${marqueeHtml(p)}
${gapHtml(p)}
${howHtml(p)}
${trustHtml(p)}
${privacyHtml(p)}
${faqHtml(p)}
${researchHtml(p)}
</main>
${footerHtml(p)}
</body>
</html>
`;

/* ---------------------------------- emit --------------------------------- */

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "en"), { recursive: true });
mkdirSync(join(out, "assets"), { recursive: true });
mkdirSync(join(out, "paper"), { recursive: true });

for (const p of pages) writeFileSync(join(out, p.dir, "index.html"), page(p));

for (const f of readdirSync(join(here, "assets"))) copyFileSync(join(here, "assets", f), join(out, "assets", f));

const pdfSrc = join(root, "docs", "social-coach-paper.pdf");
if (existsSync(pdfSrc)) copyFileSync(pdfSrc, join(out, site.localPdf));
else console.warn("warn: docs/social-coach-paper.pdf not found; citation_pdf_url will 404");

writeFileSync(join(out, ".nojekyll"), "");

writeFileSync(
  join(out, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
);

const alt = pages
  .map((q) => `    <xhtml:link rel="alternate" hreflang="${q.htmlLang}" href="${q.url}"/>`)
  .concat([`    <xhtml:link rel="alternate" hreflang="x-default" href="${urlOf("zh")}"/>`])
  .join("\n");
writeFileSync(
  join(out, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.map((q) => `  <url>\n    <loc>${q.url}</loc>\n${alt}\n  </url>`).join("\n")}
</urlset>
`,
);

writeFileSync(
  join(out, "llms.txt"),
  `# SocialCoach

> ${pick(meta.description, "en")}

> ${pick(meta.description, "zh")}

## What it is

- An AI practice partner for difficult real-life conversations. Characters have goals of their own, a hidden motive, a turn limit and a failure state; they do not yield because the learner is polite.
- Every debrief point quotes the learner's own words first, then separates an acquisition deficit (did not know the move) from a performance deficit (knew it, could not execute under pressure), then cites a source.
- Corpus shipped in the product: 46 bilingual scenarios, 42 strategies, 30 cases; every strategy and case carries a source. Teaching illustrations are labelled.
- No account, no user database. Practice history stays on the device and can be exported. Bring-your-own-key and self-hosting are supported.
- Not for clinical assessment, diagnosis, crisis intervention, or hiring and performance decisions. Proficiency numbers are model estimates.

## Links

- App: ${site.appUrl}
- Site (zh): ${urlOf("zh")}
- Site (en): ${urlOf("en")}
- Code: ${site.repoUrl}

## Research

- Paper: ${research.paperTitle}. arXiv:${site.arxivId} (cs.HC, 2026). ${site.arxivUrl}
- The paper studies the research system and an internally deployed research platform; the product is its productised version with a separate, smaller, source-checked corpus. Do not present the paper's results as proof of the product's effectiveness.
`,
);

writeFileSync(
  join(out, "404.html"),
  `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 · SocialCoach</title><meta name="robots" content="noindex"><style>${css}</style></head><body><main class="wrap" style="padding:20vh 0"><p class="eyebrow">404</p><h1 style="font-size:2rem;margin:.5rem 0 1rem">这一页不存在。</h1><p class="lead">This page does not exist.</p><p style="margin-top:1.5rem"><a class="btn btn-ghost" href="/">SocialCoach</a></p></main></body></html>`,
);

console.log(`built → ${out}\n  ${urlOf("zh")}\n  ${urlOf("en")}`);
