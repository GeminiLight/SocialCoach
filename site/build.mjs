// Zero-dependency static build for the official site.
//   node site/build.mjs            → site/dist/  (zh at /, en at /en/)
//   SITE_URL=https://example.com node site/build.mjs
//
// Colour tokens are read from app/src/app/globals.css at build time.

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pick, site, meta, nav, hero, learning, trust, privacy, faq, research, footer, experience } from "./content.mjs";
import { guides, guideCopy } from "./guides.mjs";
import { siteTokens, hexToken, darkTokens } from "./design-tokens.mjs";
import { heroSection, scenarioSection, practiceSection, scenesSection, videosSection, closingSection, homeStyles } from "./home.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = join(here, "dist");
const SITE_URL = (process.env.SITE_URL || site.defaultUrl).replace(/\/$/, "");

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const pages = [
  { lang: "zh", htmlLang: "zh-CN", dir: "", rel: "", url: `${SITE_URL}/`, other: "en/" },
  { lang: "en", htmlLang: "en", dir: "en", rel: "../", url: `${SITE_URL}/en/`, other: "../" },
];
const urlOf = (lang) => pages.find((p) => p.lang === lang).url;
const guideUrl = (id, lang) => `${SITE_URL}/${lang === "en" ? "en/" : ""}guides/${id}/`;
const guidePages = guides.flatMap((guide) => ["zh", "en"].map((lang) => ({
  lang, htmlLang: lang === "zh" ? "zh-CN" : "en", guide,
  dir: `${lang === "en" ? "en/" : ""}guides/${guide.id}`,
  rel: lang === "en" ? "../../../" : "../../",
  url: guideUrl(guide.id, lang),
  other: guideUrl(guide.id, lang === "zh" ? "en" : "zh"),
  homeUrl: urlOf(lang),
})));
const allPages = [...pages, ...guidePages];
const pairUrls = (p) => p.guide
  ? { zh: guideUrl(p.guide.id, "zh"), en: guideUrl(p.guide.id, "en") }
  : { zh: urlOf("zh"), en: urlOf("en") };

/* -------------------------------- corpus --------------------------------- */
// The scenario strip reads the product's corpus straight from app/src/data so it
// never drifts. It is a regex over our own TS, not a TS parser: each scenario
// object starts at a two-space-indented brace and has title/context fields.
const corpusDir = join(root, "app", "src", "data", "corpus");
const bilingualField = (block, key) => {
  const match = block.match(new RegExp(`\\n\\s*${key}: L\\(\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*,\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*,?\\s*\\)`));
  return match ? { zh: JSON.parse(`"${match[1]}"`), en: JSON.parse(`"${match[2]}"`) } : null;
};
const practiceSources = Object.fromEntries(
  [...readFileSync(join(corpusDir, "sources.ts"), "utf8").matchAll(/^  (\w+): \{([\s\S]*?)^  \},/gm)].map(([, key, block]) => {
    const field = (name) => block.match(new RegExp(`${name}: "([^"]+)"`))?.[1];
    return [key, `Original fictional practice inspired by ${field("book")} — ${field("author")}. ${field("url")}`];
  }),
);
const CONTEXT_NAMES = (() => {
  const tax = readFileSync(join(root, "app", "src", "data", "taxonomy.ts"), "utf8");
  const start = tax.indexOf("export const CONTEXTS");
  const end = tax.indexOf("export const", start + 10);
  const block = tax.slice(start, end < 0 ? undefined : end);
  const names = {};
  for (const m of block.matchAll(/\{ id: "([a-z-]+)", name: L\("([^"]+)", "([^"]+)"\)/g)) names[m[1]] = { zh: m[2], en: m[3] };
  return names;
})();
const SCENARIOS = readdirSync(corpusDir)
  .filter((f) => /^scenarios-[a-z]\.ts$/.test(f))
  .sort()
  .flatMap((f) => {
    const text = readFileSync(join(corpusDir, f), "utf8");
    const authoredSource = text.match(/const original = \(id: string\) => `([^`]+)`;/)?.[1];
    return text
      .split(/\n  \{\n/)
      .slice(1)
      .map((b) => {
        const id = b.match(/^\s*id: "([^"]+)"/)?.[1];
        const title = bilingualField(b, "title");
        const context = b.match(/\n\s*context: "([a-z-]+)"/)?.[1];
        const hook = bilingualField(b, "hook");
        const authoredId = b.match(/\n\s*source: original\("([^"]+)"\)/)?.[1];
        const practiceKey = b.match(/\n\s*source: practiceSource\("([^"]+)"\)/)?.[1];
        const source = b.match(/\n\s*source: "([^"]+)"/)?.[1] ??
          (authoredId && authoredSource ? authoredSource.replace("${id}", authoredId) : null) ?? practiceSources[practiceKey];
        if (id && (!title || !hook || !context || !source)) throw new Error(`Cannot read source-backed scenario ${id} from ${f}`);
        return id ? { id, file: f, title, hook, context, source } : null;
      })
      .filter(Boolean);
  });
if (SCENARIOS.length < 20) console.warn(`warn: only ${SCENARIOS.length} scenarios parsed from the corpus`);
if (Number(trust.stats.find((stat) => stat.icon === "scene")?.n) !== SCENARIOS.length) throw new Error("Site scenario count differs from the source-backed corpus");
const guideScenarios = new Map(guides.map((g) => {
  const scenario = SCENARIOS.find((s) => s.id === g.id);
  if (!scenario) throw new Error(`Guide ${g.id} has no matching source-backed scenario`);
  if (scenario.file !== g.corpusFile) throw new Error(`Guide ${g.id} points to ${g.corpusFile}, but lives in ${scenario.file}`);
  return [g.id, scenario];
}));

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
const inkRow = (filled = 5, total = 8) => `<span class="inkrow" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${i < filled ? "on" : ""}"></i>`).join("")}</span>`;

// Paper grain, inlined so nothing external is fetched.
const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .3 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")`;

/* ---------------------------------- CSS ---------------------------------- */

const css = `
${siteTokens}
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

main{position:relative}

/* reveal on scroll (transform/opacity only) */
html.reveal-ready .reveal{opacity:0;transform:translateY(14px);transition:opacity .7s var(--ease-out),transform .7s var(--ease-out)}
html.reveal-ready .reveal.in{opacity:1;transform:none}
html.reveal-ready .reveal[data-d="1"]{transition-delay:.08s}html.reveal-ready .reveal[data-d="2"]{transition-delay:.16s}html.reveal-ready .reveal[data-d="3"]{transition-delay:.24s}
@media (prefers-reduced-motion:reduce){html.reveal-ready .reveal{opacity:1;transform:none;transition:none}}

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
.nav .btn-sm .short{display:none}
@media (max-width:40rem){.nav .btn-sm .long{display:none}.nav .btn-sm .short{display:inline}}
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
/* sections */
.section{padding:clamp(56px,8vw,112px) 0;border-top:1px solid var(--line)}
.section-head{display:grid;gap:.85rem;margin-bottom:clamp(28px,4vw,48px)}
.section h2{font-size:clamp(1.8rem,3vw + .4rem,2.6rem);max-width:26ch}
.lead{font-size:1.15rem;color:var(--ink-2);max-width:var(--measure)}

/* trust */
.learning-note{margin-top:1.5rem;color:var(--ink-2);max-width:var(--measure)}
.learning-source{margin-top:.5rem;font-size:.95rem;color:var(--accent-deep)}
.learning-source a{display:inline-flex;align-items:center;gap:.35rem;text-underline-offset:.2em}
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
@media (min-width:64rem){.cards{grid-template-columns:repeat(3,1fr)}}
.card{padding:1.5rem;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);transition:transform .25s var(--ease-out),box-shadow .25s}
@media (hover:hover){.card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}}
.card .icon{color:var(--accent-deep);margin-bottom:1rem;width:30px;height:30px;padding:6px;box-sizing:content-box;border-radius:12px;background:var(--accent-soft)}
.card h3{font-size:1.15rem;margin-bottom:.6rem}
.card p{color:var(--ink-2);font-size:1rem}

/* public practice previews */
.guide-card{display:block;text-decoration:none}
.guide-card .guide-context{font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-deep);font-weight:700;margin-bottom:.7rem}
.guide-card .guide-link{display:inline-flex;gap:.4rem;align-items:center;color:var(--accent-deep);font-weight:600;font-size:.92rem;margin-top:1rem}
.guide-hero{padding:clamp(52px,7vw,90px) 0 clamp(35px,5vw,64px)}
.guide-hero h1{font-size:clamp(2.1rem,4.8vw,3.9rem);max-width:21ch;margin:.65rem 0 1.2rem}
.guide-hero .lead{max-width:67ch}
.guide-meta{display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;color:var(--ink-3);font-size:.9rem;margin-bottom:1.5rem}
.guide-layout{display:grid;gap:2rem;padding-bottom:clamp(56px,8vw,100px)}
@media (min-width:64rem){.guide-layout{grid-template-columns:minmax(0,1.65fr) minmax(240px,.75fr);gap:5rem}}
.guide-article{max-width:68ch}
.guide-article section{padding:1.7rem 0;border-top:1px solid var(--line)}
.guide-article section:last-child{border-bottom:1px solid var(--line)}
.guide-article h2{font-size:1.4rem;margin-bottom:.7rem}
.guide-article p{color:var(--ink-2)}
.guide-article ol{padding-left:1.5rem;margin:.8rem 0 0;color:var(--ink-2)}
.guide-article li{padding-left:.25rem;margin:.4rem 0}
.guide-side{align-self:start;padding:1.5rem;background:var(--card);border:1px solid var(--line);border-radius:var(--radius)}
.guide-side p{color:var(--ink-2);font-size:.94rem;margin:1rem 0}
.guide-side .btn{margin-top:.6rem}
.guide-source{margin-top:1.2rem;padding:1.2rem;background:var(--paper-deep);border:1px solid var(--line);border-radius:var(--radius-sm);font-size:.92rem;color:var(--ink-2)}
.guide-source p+p{margin-top:.5rem}
.guide-source a{text-underline-offset:.2em}

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
${homeStyles}
`.replace("GRAIN", grain);

/* -------------------------------- template ------------------------------- */

const jsonLd = (p) => {
  const l = p.lang;
  if (p.guide) return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${p.url}#webpage`,
    url: p.url,
    name: pick(p.guide.title, l),
    description: pick(p.guide.description, l),
    inLanguage: p.htmlLang,
    isPartOf: { "@id": `${SITE_URL}/#site` },
    about: { "@id": `${SITE_URL}/#app` },
  });
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
    dateModified: research.dateModified,
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
  const title = p.guide ? `${pick(p.guide.title, l)} | SocialCoach` : pick(meta.title, l);
  const description = p.guide ? pick(p.guide.description, l) : pick(meta.description, l);
  const alternate = pairUrls(p);
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
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${p.url}">
<link rel="alternate" hreflang="zh-CN" href="${alternate.zh}">
<link rel="alternate" hreflang="en" href="${alternate.en}">
<link rel="alternate" hreflang="x-default" href="${alternate.zh}">
<link rel="icon" href="${p.rel}assets/icon.svg" type="image/svg+xml">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="${hexToken("--paper")}">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${hexToken("--paper", darkTokens)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="SocialCoach">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${p.url}">
<meta property="og:locale" content="${l === "zh" ? "zh_CN" : "en_US"}">
<meta property="og:locale:alternate" content="${l === "zh" ? "en_US" : "zh_CN"}">
${hasOg ? `<meta property="og:image" content="${og}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="${og}">` : `<meta name="twitter:card" content="summary">`}
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${p.guide ? "" : citation}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap">
<style>${css}</style>
<script type="application/ld+json">${jsonLd(p)}</script>`;
};

const navHtml = (p) => {
  const l = p.lang;
  const home = p.homeUrl || "./";
  const section = p.guide ? p.homeUrl : "";
  const self = p.guide ? p.url : "./";
  return `<header class="nav">
<div class="wrap">
<a class="brand" href="${home}" aria-label="SocialCoach">
${mark(30, "m-nav")}
<span><span class="word">SocialCoach</span>${l === "zh" ? '<span class="zh" style="display:block">情商练习场</span>' : ""}</span>
</a>
<nav class="nav-links" aria-label="${l === "zh" ? "页面导航" : "Site"}">
<a href="${section}#how">${esc(pick(nav.how, l))}</a>
<a href="${section}#scenes">${esc(pick(experience.nav3d, l))}</a>
<a href="${section}#videos">${esc(pick(experience.navVideos, l))}</a>
<a href="${section}#research">${esc(pick(nav.research, l))}</a>
</nav>
<div class="ctrl">
<nav class="seg" aria-label="${esc(pick(nav.langAria, l))}">
${icon("globe", 15)}
<a href="${l === "zh" ? self : p.other}" lang="zh-CN" hreflang="zh-CN"${l === "zh" ? ' class="on" aria-current="page"' : ""}>中</a>
<a href="${l === "en" ? self : p.other}" lang="en" hreflang="en"${l === "en" ? ' class="on" aria-current="page"' : ""}>EN</a>
</nav>
<button class="theme" type="button" data-theme-toggle aria-label="${esc(pick(nav.themeAria, l))}" data-label="${esc(pick(nav.themeAria, l))}" data-names="${esc(pick(nav.themeNames, l).join("|"))}">${icon("auto", 18).replace('class="icon"', 'class="icon i-auto"')}${icon("sun", 18).replace('class="icon"', 'class="icon i-sun"')}${icon("moon", 18).replace('class="icon"', 'class="icon i-moon"')}</button>
<a class="btn btn-primary btn-sm" href="${site.appUrl}" aria-label="${esc(pick(nav.cta, l))}"><span class="long">${esc(pick(nav.cta, l))}</span><span class="short">${esc(pick(nav.ctaShort, l))}</span></a>
</div>
</div>
</header>`;
};

const guidesHtml = (p, excludeId = null) => {
  const l = p.lang;
  const items = guides.filter((g) => g.id !== excludeId);
  return `<section class="section guide-more" id="guides">
<div class="wrap">
<div class="section-head">
<p class="eyebrow">${esc(pick(guideCopy.eyebrow, l))}</p>
<h2>${esc(pick(excludeId ? guideCopy.more : guideCopy.indexTitle, l))}</h2>
${excludeId ? "" : `<p class="lead">${esc(pick(guideCopy.indexLead, l))}</p>`}
</div>
<div class="cards">${items.map((g) => {
    const s = guideScenarios.get(g.id);
    return `<a class="card guide-card" href="${guideUrl(g.id, l)}"><p class="guide-context">${esc(pick(CONTEXT_NAMES[s.context], l))}</p><h3>${esc(pick(g.title, l))}</h3><p>${esc(pick(s.hook, l))}</p><span class="guide-link">${esc(pick(guideCopy.read, l))} ${arrow}</span></a>`;
  }).join("")}</div>
</div>
</section>`;
};

const guidePage = (p) => {
  const l = p.lang;
  const g = p.guide;
  const s = guideScenarios.get(g.id);
  const corpusUrl = `${site.repoUrl}/blob/main/app/src/data/corpus/${g.corpusFile}`;
  const practiceUrl = `${site.appDeepUrl}/arena?q=${encodeURIComponent(s.title.en)}`;
  return `<!doctype html>
<html lang="${p.htmlLang}">
<head>
<script>document.documentElement.classList.add("js");try{var t=localStorage.getItem("sc-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
${head(p)}
</head>
<body>
<a class="skip" href="#main">${esc(pick(nav.skip, l))}</a>
${navHtml(p)}
<main id="main">
<header class="guide-hero"><div class="wrap">
<p class="eyebrow">${esc(pick(guideCopy.eyebrow, l))}</p>
<h1>${esc(pick(g.title, l))}</h1>
<div class="guide-meta"><span>${esc(pick(CONTEXT_NAMES[s.context], l))}</span><span>${esc(pick(guideCopy.fictional, l))}</span></div>
<p class="lead">${esc(pick(g.description, l))}</p>
<div class="ctas"><a class="btn btn-primary" href="${practiceUrl}">${esc(pick(guideCopy.start, l))} ${arrow}</a><a class="btn btn-ghost" href="${p.homeUrl}#guides">${esc(pick(guideCopy.back, l))}</a></div>
</div></header>
<div class="wrap guide-layout">
<article class="guide-article">
<section><h2>${esc(pick(guideCopy.situation, l))}</h2><p>${esc(pick(s.hook, l))}</p></section>
<section><h2>${esc(pick(guideCopy.pressure, l))}</h2><p>${esc(pick(g.pressure, l))}</p></section>
<section><h2>${esc(pick(guideCopy.goal, l))}</h2><ol>${g.goals.map((goal) => `<li>${esc(pick(goal, l))}</li>`).join("")}</ol></section>
<section><h2>${esc(pick(guideCopy.reflect, l))}</h2><p>${esc(pick(g.reflect, l))}</p></section>
<section><h2>${esc(pick(guideCopy.process, l))}</h2><p>${esc(pick(guideCopy.processBody, l))}</p></section>
<div class="guide-source"><p><strong>${esc(pick(guideCopy.source, l))}:</strong> ${esc(s.source)}</p><p>${esc(pick(guideCopy.sourceNote, l))}</p><p><a href="${corpusUrl}">${esc(pick(guideCopy.corpus, l))} ${arrow}</a></p></div>
</article>
<aside class="guide-side"><p class="eyebrow">${esc(pick(guideCopy.scenario, l))}</p><h2>${esc(pick(s.title, l))}</h2><p>${esc(pick(s.hook, l))}</p><a class="btn btn-primary" href="${practiceUrl}">${esc(pick(guideCopy.start, l))} ${arrow}</a></aside>
</div>
${guidesHtml(p, g.id)}
</main>
${footerHtml(p)}
</body>
</html>`;
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
<p class="sources"><a href="${learning.sourceUrl}">${esc(pick(experience.sourceNote, l))}</a></p>
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
<a class="btn btn-ghost btn-sm" href="${site.supplementaryUrl}">${icon("external", 16)}${esc(pick(research.links.supplementary, l))}</a>
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
<a class="brand" href="${p.homeUrl || "./"}" aria-label="SocialCoach">${mark(30, "m-foot")}<span><span class="word">SocialCoach</span>${l === "zh" ? '<span class="zh" style="display:block">情商练习场</span>' : ""}</span></a>
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
(function(){if(!("IntersectionObserver" in window))return;var els=document.querySelectorAll(".reveal");var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{rootMargin:"0px 0px -8% 0px",threshold:.08});els.forEach(function(el){io.observe(el)});document.documentElement.classList.add("reveal-ready")})();
(function(){var b=document.querySelector("[data-theme-toggle]");if(!b)return;var names=(b.getAttribute("data-names")||"").split("|");var order=["","light","dark"];function cur(){return document.documentElement.getAttribute("data-theme")||""}function label(){var name=names[order.indexOf(cur())]||"";b.title=name;b.setAttribute("aria-label",b.getAttribute("data-label")+": "+name)}label();b.addEventListener("click",function(){var next=order[(order.indexOf(cur())+1)%order.length];if(next)document.documentElement.setAttribute("data-theme",next);else document.documentElement.removeAttribute("data-theme");try{next?localStorage.setItem("sc-theme",next):localStorage.removeItem("sc-theme")}catch(e){}label()})})();
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
${heroSection(p)}
${scenarioSection(p, SCENARIOS, CONTEXT_NAMES)}
${practiceSection(p)}
${scenesSection(p)}
${videosSection(p)}
${guidesHtml(p)}
${trustHtml(p)}
${privacyHtml(p)}
${faqHtml(p)}
${researchHtml(p)}
${closingSection(p)}
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
for (const p of guidePages) {
  mkdirSync(join(out, p.dir), { recursive: true });
  writeFileSync(join(out, p.dir, "index.html"), guidePage(p));
}

for (const f of readdirSync(join(here, "assets"))) copyFileSync(join(here, "assets", f), join(out, "assets", f));

const pdfSrc = join(root, "docs", "social-coach-paper.pdf");
if (!existsSync(pdfSrc)) throw new Error("Missing docs/social-coach-paper.pdf; cannot publish the paper sitemap entry");
copyFileSync(pdfSrc, join(out, site.localPdf));

writeFileSync(join(out, ".nojekyll"), "");

writeFileSync(
  join(out, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
);

writeFileSync(
  join(out, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allPages.map((q) => {
    const pair = pairUrls(q);
    const alt = [`    <xhtml:link rel="alternate" hreflang="zh-CN" href="${pair.zh}"/>`, `    <xhtml:link rel="alternate" hreflang="en" href="${pair.en}"/>`, `    <xhtml:link rel="alternate" hreflang="x-default" href="${pair.zh}"/>`].join("\n");
    return `  <url>\n    <loc>${q.url}</loc>\n${alt}\n  </url>`;
  }).join("\n")}
  <url>
    <loc>${SITE_URL}/${site.localPdf}</loc>
  </url>
</urlset>
`,
);

writeFileSync(
  join(out, "llms.txt"),
  `# SocialCoach

> ${pick(meta.description, "en")}

> ${pick(meta.description, "zh")}

## What it is

- An AI practice partner for difficult real-life conversations. Characters have goals of their own, sometimes with an unspoken concern; they do not yield because the learner is polite. Text practice uses finite, extendable segments, and the learner decides when to debrief.
- An AI tool for practicing social skills within social and emotional learning (SEL). Its 34-skill map uses the five CASEL competencies; it is an individual practice tool, not a certified school curriculum. Framework: ${learning.sourceUrl}
- Every debrief point quotes the learner's own words first, then separates an acquisition deficit (did not know the move) from a performance deficit (knew it, could not execute under pressure), then cites a source.
- Corpus shipped in the product: ${SCENARIOS.length} bilingual scenarios, 42 strategies, 30 cases; every strategy and case carries a source. Teaching illustrations are labelled.
- 3D practice includes work, family and school dinners, an elevator lobby and an office, with movement, actions and multiple characters.
- Two original fictional video lessons include Chinese audio, Chinese/English captions, key choices and matching 3D practice.
- No account, no user database. Practice history stays on the device and can be exported. Relevant context is sent to the selected model service for generation. Optional anonymous analytics and submitted feedback are separate. Shared model quota, bring-your-own-key and self-hosting are supported.
- For everyday practice and reflection, not clinical assessment or hiring. Proficiency numbers are model estimates shown as such in the UI.

## Links

- App: ${site.appUrl}
- 3D scenes: ${site.appDeepUrl}/3d
- Video lessons and library: ${site.appDeepUrl}/learn
- Custom rehearsal: ${site.appDeepUrl}/rehearse
- Site (zh): ${urlOf("zh")}
- Site (en): ${urlOf("en")}
- Code: ${site.repoUrl}

## Practice scenarios

${guides.map((g) => `- ${pick(g.title, "en")}: ${guideUrl(g.id, "en")} (中文: ${guideUrl(g.id, "zh")})`).join("\n")}

## Research

- Paper: ${research.paperTitle}. arXiv:${site.arxivId} (cs.HC, 2026). ${site.arxivUrl}
- Paper PDF: ${SITE_URL}/${site.localPdf}
- Supplementary materials: ${site.supplementaryUrl}
- The paper studies the research system and an internal research platform; the product is its productised version with a smaller, source-checked corpus (${SCENARIOS.length} scenarios, 42 strategies, 30 cases), distinct from the paper's 43,170-entry research corpus.
`,
);

writeFileSync(
  join(out, "404.html"),
  `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 · SocialCoach</title><meta name="robots" content="noindex"><style>${css}</style></head><body><main class="wrap" style="padding:20vh 0"><p class="eyebrow">404</p><h1 style="font-size:2rem;margin:.5rem 0 1rem">这一页不存在。</h1><p class="lead">This page does not exist.</p><p style="margin-top:1.5rem"><a class="btn btn-ghost" href="${SITE_URL}/">SocialCoach</a></p></main></body></html>`,
);

console.log(`built ${allPages.length} pages → ${out}`);
