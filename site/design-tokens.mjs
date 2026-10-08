// Read the application's palette at build time: globals.css is the only colour source.
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../app/src/app/globals.css', import.meta.url), 'utf8');
const declarations = (block) => [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([,key,value]) => [key,value.trim()]);
const lightBlock = source.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1];
const darkBlock = source.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)?.[1];
if (!lightBlock || !darkBlock) throw new Error('Application design tokens could not be read');
export const lightTokens = Object.fromEntries(declarations(lightBlock));
export const darkTokens = Object.fromEntries(declarations(darkBlock));
const serialize = tokens => Object.entries(tokens).map(([key,value]) => `${key}:${value};`).join('\n');
export const siteTokens = `:root{${serialize(lightTokens)}
--font-sans:"Hanken Grotesk","PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;
--font-serif:Georgia,"Iowan Old Style","Palatino Linotype","Times New Roman",serif;
--content:1200px;--shadow:var(--shadow-dialog);--grain-opacity:.055;
--c-amber:var(--scene-ochre-color);--c-moss:var(--scene-olive-color);--c-teal:var(--scene-teal-color);--c-clay:var(--scene-clay-color);--c-indigo:var(--teal);--c-rose:var(--scene-rose-color);--c-ochre:var(--scene-ochre-color);
color-scheme:light}
:root[data-theme="light"]{color-scheme:light}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){${serialize(darkTokens)}color-scheme:dark}}
:root[data-theme="dark"]{${serialize(darkTokens)}color-scheme:dark}`;

// SVG and metadata need sRGB; derive them from the same OKLCH source.
export function hexToken(name, tokens = lightTokens) {
  let value = tokens[name];
  if (value?.startsWith('var(')) return hexToken(value.slice(4,-1), tokens);
  const match = value?.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)/);
  if (!match) throw new Error(`Expected OKLCH for ${name}`);
  const [L,C,h] = match.slice(1).map(Number);
  const a = C*Math.cos(h*Math.PI/180), b = C*Math.sin(h*Math.PI/180);
  const l = (L+.3963377774*a+.2158037573*b)**3;
  const m = (L-.1055613458*a-.0638541728*b)**3;
  const s = (L-.0894841775*a-1.291485548*b)**3;
  const rgb = [4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s];
  return '#'+rgb.map(v=>Math.round(Math.max(0,Math.min(1,v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055))*255).toString(16).padStart(2,'0')).join('');
}
