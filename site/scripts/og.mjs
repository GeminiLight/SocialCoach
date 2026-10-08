// Generate the committed 1200 × 630 share previews with the app's installed sharp.
// Palette comes from globals.css; screenshots and coach come from the product.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { pick, hero, experience, L } from '../content.mjs';
import { hexToken } from '../design-tokens.mjs';
const sharp = createRequire(import.meta.url)(new URL('../../app/node_modules/.pnpm/node_modules/sharp', import.meta.url).pathname);
const assets = new URL('../assets/', import.meta.url);
const esc = v => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const C = Object.fromEntries(['paper','paper-deep','ink','ink-2','accent','line'].map(n=>[n,hexToken(`--${n}`)]));
const font = "'PingFang SC','Hiragino Sans GB','Noto Sans SC','Arial',sans-serif";
const wrap = (s,max) => s.split(' ').reduce((rows,w)=>{ const i=rows.length-1;if((rows[i]+' '+w).trim().length>max)rows.push(w);else rows[i]=(rows[i]+' '+w).trim();return rows; },['']);
const detail = L('对话排练 · 原话复盘 · 3D 现场 · 视频课堂', 'Conversation practice · Quoted feedback · 3D scenes');
for (const lang of ['zh','en']) {
  const title=pick(hero.h1,lang), rows=lang==='zh'?title.split(/(?<=，)/):wrap(title,22);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${C.paper}"/><path d="M60 130H1140" stroke="${C.line}"/><text x="60" y="85" fill="${C.ink}" font-family="${font}" font-size="32" font-weight="600">SocialCoach</text><text x="60" y="192" fill="${C.accent}" font-family="${font}" font-size="20">${esc(pick(hero.eyebrow,lang))}</text>${rows.map((r,i)=>`<text x="58" y="${285+i*76}" fill="${C.ink}" font-family="${font}" font-size="${lang==='zh'?64:52}" font-weight="600">${esc(r)}</text>`).join('')}<text x="60" y="495" fill="${C['ink-2']}" font-family="${font}" font-size="19">${esc(pick(detail,lang))}</text><text x="60" y="575" fill="${C.accent}" font-family="${font}" font-size="20">socialcoach.aurax.live</text><text x="680" y="485" fill="${C['ink-2']}" font-family="${font}" font-size="17">${esc(pick(experience.preview,lang))}</text></svg>`;
  const scene=await sharp(new URL(`scene-work-${lang}.webp`,assets).pathname).resize(460,288,{fit:'cover'}).png().toBuffer();
  const cat=await sharp(new URL('coach.webp',assets).pathname).resize(96,128,{fit:'inside'}).png().toBuffer();
  const png=await sharp(Buffer.from(svg)).composite([{input:scene,left:680,top:165},{input:cat,left:1040,top:490}]).png({compressionLevel:9}).toBuffer();
  writeFileSync(new URL(`og-${lang}.png`,assets),png);
  console.log(`og-${lang}.png: ${Math.round(png.length/1024)} KB`);
}
