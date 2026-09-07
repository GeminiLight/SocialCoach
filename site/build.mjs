// Zero-dependency static build for the official site.
//   node site/build.mjs            → site/dist/  (zh at /, en at /en/)
//   SITE_URL=https://example.com node site/build.mjs
//
// Colour tokens below are copied from app/src/app/globals.css (OKLCH, light and
// dark). Change colours there first, then mirror them here.

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, rmSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pick, site, meta, nav, hero, gap, how, trust, faq, research, footer } from "./content.mjs";

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

// Optional real-product screenshots. Named per marketing/03-asset-plan.md; the
// block only renders when the file exists, so nothing ships as a placeholder.
const shot = (n, lang) => {
  const file = `screenshot-0${n}-${lang}.png`;
  return existsSync(join(here, "assets", file)) ? `assets/${file}` : null;
};

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

const arrow = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4l3.5 4-3.5 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

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
  --c-amber:oklch(0.62 0.10 75);--c-moss:oklch(0.55 0.09 140);--c-teal:oklch(0.50 0.08 200);--c-clay:oklch(0.58 0.11 30);--c-indigo:oklch(0.50 0.09 270);
  --radius-sm:10px;--radius:16px;--radius-lg:22px;
  --font-sans:"Hanken Grotesk","PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;
  --font-serif:Georgia,"Iowan Old Style","Palatino Linotype","Times New Roman",serif;
  --content:1120px;--measure:62ch;
  --ease-out:cubic-bezier(0.22,1,0.36,1);
  color-scheme:light dark;
}
@media (prefers-color-scheme:dark){:root{
  --paper:oklch(0.205 0.012 62);--paper-deep:oklch(0.165 0.011 60);--card:oklch(0.238 0.013 63);--inset:oklch(0.272 0.014 63);
  --ink:oklch(0.935 0.012 78);--ink-2:oklch(0.80 0.013 75);--ink-3:oklch(0.655 0.013 70);--ink-4:oklch(0.515 0.012 68);
  --line:oklch(0.315 0.014 65);--line-strong:oklch(0.425 0.016 65);
  --accent:oklch(0.70 0.145 42);--accent-deep:oklch(0.795 0.125 46);--accent-soft:oklch(0.315 0.055 44);--accent-ink:oklch(0.17 0.02 50);
  --action-hover:oklch(0.84 0.10 46);
  --c-amber:oklch(0.78 0.10 75);--c-moss:oklch(0.74 0.09 140);--c-teal:oklch(0.72 0.08 200);--c-clay:oklch(0.76 0.10 30);--c-indigo:oklch(0.72 0.09 270);
}}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:5rem}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font-sans);font-size:1.0625rem;line-height:1.65;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:inherit}
a:focus-visible,button:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
img,svg{display:block;max-width:100%}
p{margin:0}
h1,h2,h3{margin:0;font-weight:700;letter-spacing:-0.01em;line-height:1.15;text-wrap:balance}
.serif{font-family:var(--font-serif);font-weight:400;letter-spacing:-0.005em}
.wrap{max-width:var(--content);margin:0 auto;padding:0 clamp(16px,4vw,32px)}
.skip{position:absolute;left:-999px;top:8px;background:var(--card);padding:.5rem .75rem;border:1px solid var(--line-strong);border-radius:var(--radius-sm)}
.skip:focus{left:8px;z-index:50}
.eyebrow{font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);font-weight:600}
.measure{max-width:var(--measure)}
.muted{color:var(--ink-3)}

/* nav */
.nav{position:sticky;top:0;z-index:20;background:color-mix(in oklab,var(--paper) 86%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.nav .wrap{display:flex;align-items:center;gap:1rem;min-height:64px}
.brand{display:flex;align-items:center;gap:.65rem;text-decoration:none;margin-right:auto}
.brand .word{font-family:var(--font-serif);font-size:1.25rem;letter-spacing:-0.01em;line-height:1}
.brand .zh{font-size:.72rem;letter-spacing:.22em;color:var(--ink-3);margin-top:.2rem}
.nav-links{display:none;gap:1.5rem;font-size:.95rem}
.nav-links a{text-decoration:none;color:var(--ink-2)}
.nav-links a:hover{color:var(--ink)}
.lang{font-size:.9rem;color:var(--ink-2);text-decoration:none;padding:.4rem .6rem;border-radius:999px;border:1px solid transparent;white-space:nowrap}
.lang .short{display:none}
@media (max-width:40rem){.nav .wrap{gap:.5rem;min-height:56px}.brand .zh{display:none}.lang .long{display:none}.lang .short{display:inline}.nav .btn-sm{padding:.5rem .8rem;font-size:.88rem;white-space:nowrap}}
.lang:hover{border-color:var(--line-strong)}
@media (min-width:64rem){.nav-links{display:flex}}

/* buttons */
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.8rem 1.2rem;border-radius:999px;font-weight:600;font-size:.98rem;text-decoration:none;border:1px solid transparent;transition:background .18s var(--ease-out),transform .12s var(--ease-out),border-color .18s}
.btn:active{transform:translateY(1px) scale(.99)}
.btn-primary{background:var(--action);color:var(--accent-ink)}
.btn-primary:hover{background:var(--action-hover)}
.btn-ghost{border-color:var(--line-strong);color:var(--ink);background:transparent}
.btn-ghost:hover{background:var(--paper-deep)}
.btn-sm{padding:.55rem .95rem;font-size:.9rem}

/* hero */
.hero{padding:clamp(48px,8vw,104px) 0 clamp(40px,6vw,80px)}
.hero .wrap{display:grid;gap:2.5rem;align-items:center}
@media (min-width:64rem){.hero .wrap{grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:4rem}}
.pill{display:inline-flex;align-items:center;gap:.6rem;padding:.35rem .9rem .35rem .4rem;border:1px solid var(--line-strong);border-radius:999px;background:var(--card);font-size:.88rem;color:var(--ink-2);text-decoration:none;margin-bottom:1.75rem}
.pill:hover{border-color:var(--ink-4)}
.pill .tag{font-family:var(--font-serif);font-size:.8rem;background:var(--accent-soft);color:var(--accent-deep);padding:.18rem .55rem;border-radius:999px}
.pill svg{color:var(--ink-3)}
.hero h1{font-size:clamp(2.1rem,5.2vw + .6rem,4.4rem);margin-top:.5rem}
.hero h1:lang(zh-CN){word-break:keep-all;overflow-wrap:normal}
.alt:lang(zh-CN),.footer .tag:lang(zh-CN){font-family:var(--font-sans);font-weight:500}
.hero .alt{font-family:var(--font-serif);font-size:clamp(1.25rem,1.6vw + .6rem,1.7rem);color:var(--ink-2);margin-top:1rem;line-height:1.3}
.squiggle{width:min(540px,80%);height:12px;margin:.6rem 0 1.6rem}
.hero .sub{font-size:1.15rem;line-height:1.6;color:var(--ink-2);max-width:56ch}
.ctas{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:2rem}
.micro{display:flex;flex-wrap:wrap;gap:.4rem 1.25rem;margin-top:1.25rem;font-size:.9rem;color:var(--ink-3)}
.micro li{list-style:none;display:flex;align-items:center;gap:.5rem}
.micro li::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--accent)}
.micro{padding:0;margin-bottom:0}
.hero-art{display:flex;justify-content:center}
.radar{width:min(380px,80vw)}
.phone{width:min(300px,78vw);aspect-ratio:9/19.5;border-radius:38px;border:1px solid var(--line-strong);background:var(--paper-deep);padding:10px;box-shadow:0 30px 60px -30px oklch(0.2 0.02 60 / .45);margin:0}
.phone img{width:100%;height:100%;object-fit:cover;border-radius:28px}

/* sections */
.section{padding:clamp(56px,8vw,112px) 0;border-top:1px solid var(--line)}
.section-head{display:grid;gap:.75rem;margin-bottom:clamp(28px,4vw,48px)}
.section h2{font-size:clamp(1.8rem,3vw + .4rem,2.6rem);max-width:26ch}
.lead{font-size:1.15rem;color:var(--ink-2);max-width:var(--measure)}

/* gap */
.notes{display:grid;gap:1rem;margin-top:2.25rem}
@media (min-width:48rem){.notes{grid-template-columns:repeat(3,1fr)}}
.note{margin:0;padding:1.5rem 1.5rem 1.4rem;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);font-size:1.05rem;line-height:1.6;position:relative}
.note::before{content:"“";font-family:var(--font-serif);font-size:2.6rem;line-height:0;position:absolute;top:1.65rem;left:1.1rem;color:var(--ink-4)}
.note p{padding-left:1.35rem}
.deficits{display:grid;gap:1rem;margin-top:2.5rem}
@media (min-width:48rem){.deficits{grid-template-columns:1fr 1fr}}
.deficit{padding:1.5rem;border-radius:var(--radius);background:var(--paper-deep);border:1px solid var(--line)}
.deficit .tag{font-family:var(--font-serif);font-style:italic;font-size:.9rem;color:var(--ink-3)}
.deficit h3{font-size:1.4rem;margin:.35rem 0 .6rem}
.deficit p{color:var(--ink-2)}
.deficit-note{margin-top:1.25rem;color:var(--ink-2);display:flex;gap:.6rem;align-items:baseline}
.deficit-note::before{content:"";flex:0 0 22px;height:2px;background:var(--accent);transform:translateY(-.3em);border-radius:2px}

/* steps */
.steps{list-style:none;margin:0;padding:0;counter-reset:step}
.step{display:grid;grid-template-columns:3.5rem 1fr;gap:1rem 1.25rem;padding:1.75rem 0;border-top:1px solid var(--line)}
.step:last-child{border-bottom:1px solid var(--line)}
.step .num{font-family:var(--font-serif);font-size:1.6rem;color:var(--accent);line-height:1.1;padding-top:.15rem}
.step h3{font-size:1.35rem;margin-bottom:.5rem}
.step p{color:var(--ink-2);max-width:var(--measure)}
.step.has-shot{grid-template-columns:3.5rem 1fr}
@media (min-width:64rem){.step.has-shot{grid-template-columns:3.5rem 1fr auto;align-items:start}.step.has-shot .phone{width:220px;grid-row:span 2}}

/* trust */
.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:1.25rem 1rem;margin-top:.5rem}
@media (min-width:48rem){.stats{grid-template-columns:repeat(5,1fr)}}
.stat .n{font-family:var(--font-serif);font-size:clamp(2.2rem,3.5vw,3rem);line-height:1;letter-spacing:-0.02em}
.stat .l{font-size:.92rem;color:var(--ink-3);margin-top:.35rem}
.stats-note{margin-top:1.5rem;color:var(--ink-2);max-width:var(--measure)}
.sources{margin-top:.5rem;color:var(--ink-3);font-size:.95rem;max-width:var(--measure)}
.sources i{font-family:var(--font-serif);color:var(--ink-2)}
.cards{display:grid;gap:1rem;margin-top:2.5rem}
@media (min-width:48rem){.cards{grid-template-columns:repeat(3,1fr)}}
.card{padding:1.5rem;background:var(--card);border:1px solid var(--line);border-radius:var(--radius)}
.card h3{font-size:1.15rem;margin-bottom:.6rem}
.card p{color:var(--ink-2);font-size:1rem}

/* faq */
.faq{max-width:760px}
.faq details{border-top:1px solid var(--line)}
.faq details:last-child{border-bottom:1px solid var(--line)}
.faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1.15rem 0;font-weight:600;font-size:1.08rem}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";font-family:var(--font-serif);font-size:1.5rem;color:var(--ink-3);flex:0 0 auto;transition:transform .2s var(--ease-out)}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq .a{padding:0 0 1.35rem;color:var(--ink-2);max-width:var(--measure)}

/* research */
.paper{display:grid;gap:2.5rem}
@media (min-width:64rem){.paper{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:4rem}}
.paper-title{font-family:var(--font-serif);font-weight:400;font-size:clamp(1.45rem,2vw + .4rem,1.9rem);line-height:1.3;letter-spacing:-0.01em}
.authors{margin-top:1.25rem;color:var(--ink-2);line-height:1.7;font-size:.98rem}
.authors sup{font-size:.7em;color:var(--ink-3);margin-left:.05em}
.affs{margin-top:.6rem;color:var(--ink-3);font-size:.88rem;line-height:1.6}
.affs sup{font-size:.7em;margin-right:.15em}
.venue{margin-top:1rem;font-family:var(--font-serif);color:var(--ink-3);font-size:.95rem}
.links{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.5rem}
.covers{margin:1.25rem 0 0;padding:0;list-style:none;display:grid;gap:.6rem}
.covers li{display:flex;gap:.75rem;color:var(--ink-2)}
.covers li::before{content:"";flex:0 0 6px;height:6px;border-radius:50%;background:var(--accent);margin-top:.65em}
.boundary{margin-top:1.75rem;padding:1.25rem 1.4rem;background:var(--paper-deep);border:1px solid var(--line);border-radius:var(--radius);color:var(--ink-2)}
.boundary .eyebrow{display:block;margin-bottom:.4rem}
.bib{margin-top:1.75rem}
.bib-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem}
.bib button{font:inherit;font-size:.85rem;font-weight:600;color:var(--ink-2);background:var(--card);border:1px solid var(--line-strong);border-radius:999px;padding:.35rem .8rem;cursor:pointer}
.bib button:hover{background:var(--paper-deep)}
pre{margin:0;padding:1rem 1.1rem;background:var(--card);border:1px solid var(--line);border-radius:var(--radius-sm);font-size:.82rem;line-height:1.55;overflow-x:auto;color:var(--ink-2);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}

/* footer */
.footer{border-top:1px solid var(--line);padding:clamp(40px,6vw,72px) 0 2.5rem;color:var(--ink-3);font-size:.92rem}
.footer .top{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1.5rem;align-items:flex-start}
.footer .brand .word{color:var(--ink)}
.footer .tag{margin-top:.6rem;font-family:var(--font-serif);color:var(--ink-2);font-size:1.05rem}
.footer nav{display:flex;flex-wrap:wrap;gap:1.25rem}
.footer nav a{text-decoration:none;color:var(--ink-2)}
.footer nav a:hover{color:var(--ink)}
.footer .disc{margin-top:2rem;max-width:var(--measure);line-height:1.6}
.footer .copy{margin-top:1.25rem;display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between}
`;

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
    alternateName: site.nameZh,
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
    name: `${site.name} · ${site.nameZh}`,
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
<meta property="og:site_name" content="SocialCoach · 社交教练">
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
<span><span class="word">SocialCoach</span><span class="zh" style="display:block">${l === "zh" ? "社交教练" : "SOCIAL COACH"}</span></span>
</a>
<nav class="nav-links" aria-label="${l === "zh" ? "页面导航" : "Site"}">
<a href="#how">${esc(pick(nav.how, l))}</a>
<a href="#trust">${esc(pick(nav.trust, l))}</a>
<a href="#faq">${esc(pick(nav.faq, l))}</a>
<a href="#research">${esc(pick(nav.research, l))}</a>
</nav>
<a class="lang" href="${p.other}" hreflang="${l === "zh" ? "en" : "zh-CN"}" lang="${l === "zh" ? "en" : "zh-CN"}" aria-label="${esc(pick(nav.switchAria, l))}"><span class="long">${esc(pick(nav.switchLabel, l))}</span><span class="short" aria-hidden="true">${esc(pick(nav.switchShort, l))}</span></a>
<a class="btn btn-primary btn-sm" href="${site.appUrl}">${esc(pick(nav.cta, l))}</a>
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
    ? `<figure class="phone"><img src="${p.rel}${s1}" alt="${esc(pick(hero.screenshotAlt, l))}" width="1170" height="2532" loading="eager"></figure>`
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
<ul class="micro">${hero.micro.map((m) => `<li>${esc(pick(m, l))}</li>`).join("")}</ul>
</div>
<div class="hero-art">${art}</div>
</div>
</section>`;
};

const gapHtml = (p) => {
  const l = p.lang;
  return `<section class="section" id="gap">
<div class="wrap">
<div class="section-head">
<p class="eyebrow">${esc(pick(gap.eyebrow, l))}</p>
<h2>${esc(pick(gap.title, l))}</h2>
<p class="lead">${esc(pick(gap.lead, l))}</p>
</div>
<div class="notes">${gap.hooks.map((h) => `<blockquote class="note"><p>${esc(pick(h, l))}</p></blockquote>`).join("")}</div>
<div class="deficits">${gap.deficits
    .map(
      (d) => `<div class="deficit"><span class="tag">${d.tag} deficit</span><h3>${esc(pick(d.label, l))}</h3><p>${esc(pick(d.body, l))}</p></div>`,
    )
    .join("")}</div>
<p class="deficit-note">${esc(pick(gap.deficitNote, l))}</p>
</div>
</section>`;
};

const howHtml = (p) => {
  const l = p.lang;
  const s3 = shot(3, l);
  return `<section class="section" id="how">
<div class="wrap">
<div class="section-head">
<p class="eyebrow">${esc(pick(how.eyebrow, l))}</p>
<h2>${esc(pick(how.title, l))}</h2>
</div>
<ol class="steps">${how.steps
    .map((s, i) => {
      const withShot = s.id === "debrief" && s3;
      const fig = withShot
        ? `<figure class="phone"><img src="${p.rel}${s3}" alt="${esc(pick(s.screenshotAlt, l))}" width="1170" height="2532" loading="lazy"></figure>`
        : "";
      return `<li class="step${withShot ? " has-shot" : ""}"${s.id ? ` id="${s.id}"` : ""}>
<span class="num" aria-hidden="true">0${i + 1}</span>
<div><h3>${esc(pick(s.title, l))}</h3><p>${esc(pick(s.body, l))}</p></div>${fig}
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
<div class="section-head">
<p class="eyebrow">${esc(pick(trust.eyebrow, l))}</p>
<h2>${esc(pick(trust.title, l))}</h2>
</div>
<div class="stats">${trust.stats
    .map((s) => `<div class="stat"><div class="n">${s.n}</div><div class="l">${esc(pick(s.label, l))}</div></div>`)
    .join("")}</div>
<p class="stats-note">${esc(pick(trust.statsNote, l))}</p>
<p class="sources">${esc(pick(trust.sourcesLabel, l))}${l === "zh" ? "：" : ": "}${trust.sources.map((s) => `<i>${esc(s)}</i>`).join(l === "zh" ? "、" : ", ")}${l === "zh" ? "。" : "."}</p>
<div class="cards">${trust.cards
    .map((c) => `<div class="card"><h3>${esc(pick(c.title, l))}</h3><p>${esc(pick(c.body, l))}</p></div>`)
    .join("")}</div>
</div>
</section>`;
};

const faqHtml = (p) => {
  const l = p.lang;
  return `<section class="section" id="faq">
<div class="wrap">
<div class="section-head">
<p class="eyebrow">${esc(pick(faq.eyebrow, l))}</p>
<h2>${esc(pick(faq.title, l))}</h2>
</div>
<div class="faq">${faq.items
    .map((it) => `<details><summary>${esc(pick(it.q, l))}</summary><p class="a">${esc(pick(it.a, l))}</p></details>`)
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
<div class="section-head">
<p class="eyebrow">${esc(pick(research.eyebrow, l))}</p>
<h2>${esc(pick(research.title, l))}</h2>
</div>
<div class="paper">
<div>
<p class="paper-title" lang="en">${esc(research.paperTitle)}</p>
<p class="authors" lang="en">${authors}</p>
<p class="affs" lang="en">${affs}</p>
<p class="venue">${esc(pick(research.venue, l))}</p>
<div class="links">
<a class="btn btn-ghost btn-sm" href="${site.arxivUrl}">${esc(pick(research.links.arxiv, l))}</a>
<a class="btn btn-ghost btn-sm" href="${p.rel}${site.localPdf}">${esc(pick(research.links.pdf, l))}</a>
<a class="btn btn-ghost btn-sm" href="${site.repoUrl}">${esc(pick(research.links.code, l))}</a>
<a class="btn btn-ghost btn-sm" href="#bibtex">${esc(pick(research.links.bibtex, l))}</a>
</div>
</div>
<div>
<p class="lead">${esc(pick(research.lead, l))}</p>
<h3 style="margin-top:1.75rem;font-size:1.1rem">${esc(pick(research.coversTitle, l))}</h3>
<ul class="covers">${research.covers.map((c) => `<li>${esc(pick(c, l))}</li>`).join("")}</ul>
<div class="boundary"><span class="eyebrow">${esc(pick(research.boundaryLabel, l))}</span>${esc(pick(research.boundary, l))}</div>
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
<a class="brand" href="${p.rel || "./"}" aria-label="SocialCoach">${mark(30, "m-foot")}<span><span class="word">SocialCoach</span><span class="zh" style="display:block">${l === "zh" ? "社交教练" : "SOCIAL COACH"}</span></span></a>
<p class="tag">${esc(pick(footer.tagline, l))}</p>
</div>
<nav aria-label="${l === "zh" ? "页脚链接" : "Footer"}">
<a href="${site.appUrl}">${esc(pick(footer.links.app, l))}</a>
<a href="${site.repoUrl}">${esc(pick(footer.links.repo, l))}</a>
<a href="${site.arxivUrl}">${esc(pick(footer.links.paper, l))}</a>
<a href="${p.other}" hreflang="${l === "zh" ? "en" : "zh-CN"}" lang="${l === "zh" ? "en" : "zh-CN"}">${esc(pick(nav.switchLabel, l))}</a>
</nav>
</div>
<p class="disc">${esc(pick(footer.disclaimer, l))}</p>
<div class="copy"><span>${esc(pick(footer.copyright, l))}</span><span>arXiv:${site.arxivId}</span></div>
</div>
</footer>
<script>
(function(){var b=document.querySelector('[data-copy]');if(!b||!navigator.clipboard)return;b.addEventListener('click',function(){var t=document.getElementById(b.getAttribute('data-copy')).textContent;navigator.clipboard.writeText(t).then(function(){var o=b.textContent;b.textContent=b.getAttribute('data-done');setTimeout(function(){b.textContent=o},1600)})})})();
</script>`;
};

const page = (p) => `<!doctype html>
<html lang="${p.htmlLang}">
<head>
${head(p)}
</head>
<body>
<a class="skip" href="#main">${esc(pick(nav.skip, p.lang))}</a>
${navHtml(p)}
<main id="main">
${heroHtml(p)}
${gapHtml(p)}
${howHtml(p)}
${trustHtml(p)}
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
  `# SocialCoach · 社交教练

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
