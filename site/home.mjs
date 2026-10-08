import { pick, site, hero, experience as copy } from './content.mjs';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const text = (v,l) => esc(pick(v,l));
const lines = (v,l) => text(v,l).replace(/\n/g,'<br>');
const arrow = '<span aria-hidden="true">↗</span>';
const image = (p,name,alt,width,height,eager=false) => `<img src="${p.rel}assets/${name}" alt="${text(alt,p.lang)}" width="${width}" height="${height}" loading="${eager?'eager':'lazy'}"${eager?' fetchpriority="high"':''} decoding="async">`;
const heading = (p,no,label,title,lead) => `<div class="section-head"><p class="eyebrow num"><span class="no">${no}</span>${text(label,p.lang)}</p><h2>${lines(title,p.lang)}</h2>${lead?`<p class="lead">${text(lead,p.lang)}</p>`:''}</div>`;

export function heroSection(p) {
  const l=p.lang;
  return `<section class="hero home-hero"><div class="wrap">
<div class="hero-copy"><a class="pill" href="#research"><span class="tag">arXiv</span>${text(hero.pill,l)} ${arrow}</a>
<p class="eyebrow">${text(hero.eyebrow,l)}</p>
<h1>${text(hero.h1,l).replace('，','，<br>')}</h1>
<p class="sub">${text(hero.sub,l)}</p>
<div class="ctas"><a class="btn btn-primary" href="${site.appDeepUrl}/arena">${text(hero.ctaPrimary,l)} ${arrow}</a><a class="btn btn-ghost" href="${site.appDeepUrl}/3d">${text(copy.open3d,l)} ${arrow}</a></div>
<a class="text-link rehearse-link" href="${site.appDeepUrl}/rehearse">${text(copy.rehearse,l)} ${arrow}</a>
<ul class="micro">${hero.micro.map(m=>`<li>${text(m.text,l)}</li>`).join('')}</ul></div>
<div class="hero-showcase"><div class="preview-heading"><span class="live-dot" aria-hidden="true"></span>${text(copy.updated,l)}</div>
<a class="scene-preview" href="${site.appDeepUrl}/3d" aria-label="${text(copy.open3d,l)}">${image(p,`scene-work-${l}.webp`,copy.previewAlt,1200,400,true)}<span class="preview-caption">${text(copy.preview,l)} ${arrow}</span><span class="preview-line">${text(copy.previewQuote,l)}</span></a>
<div class="coach-note">${image(p,'coach.webp',{zh:'',en:''},192,256,true)}<div><p class="eyebrow">SocialCoach</p><p>${text(copy.coach,l)}</p></div></div>
</div></div></section>`;
}

export function scenarioSection(p,scenarios,contexts) {
  const l=p.lang, selected=copy.paths.map(id=>scenarios.find(s=>s.id===id));
  if(selected.some(s=>!s)) throw new Error('Featured practice is missing from the corpus');
  return `<section class="starter-section"><div class="wrap"><div class="starter-head"><h2>${text(copy.pathsTitle,l)}</h2><a class="text-link" href="${site.appDeepUrl}/arena">${scenarios.length} ${text(copy.sceneCount,l)} ${arrow}</a></div><div class="starter-grid">${selected.map(s=>`<a class="starter" href="${site.appDeepUrl}/arena?q=${encodeURIComponent(s.title.en)}"><p class="eyebrow">${text(contexts[s.context],l)}</p><h3>${text(s.title,l)}</h3><p>${text(s.hook,l)}</p><span class="text-link">${text(copy.tryScene,l)} ${arrow}</span></a>`).join('')}</div></div></section>`;
}

export function practiceSection(p) {
  const l=p.lang;
  return `<section class="section practice-section" id="how"><div class="wrap">
${heading(p,'01',copy.practiceEyebrow,copy.practiceTitle,copy.practiceLead)}
<div class="practice-layout"><figure class="product-screen">${image(p,`arena-${l}.webp`,copy.arenaAlt,1152,820)}<figcaption>${text(copy.arenaCaption,l)}</figcaption></figure>
<ol class="practice-steps">${copy.flow.map((s,i)=>`<li><span class="step-number">0${i+1}</span><div><h3>${text(s.title,l)}</h3><p>${text(s.body,l)}</p></div></li>`).join('')}</ol></div>
<div class="evidence-layout" id="debrief"><div class="quote-sheet"><p class="eyebrow">${text(copy.evidenceLabel,l)}</p><blockquote>${text(copy.evidenceQuote,l)}</blockquote><p class="caption">${text(copy.evidenceNote,l)}</p></div>
<div class="evidence-reading"><h3>${lines(copy.evidenceTitle,l)}</h3><p>${text(copy.evidenceBody,l)}</p><a class="text-link" href="${p.rel}assets/screenshot-03-evidence-debrief-${l}.png" target="_blank" rel="noopener">${text(copy.evidenceLink,l)} ${arrow}</a></div></div>
<div class="coach-followup"><h3>${text(copy.nextTitle,l)}</h3><p>${text(copy.nextBody,l)}</p></div>
</div></section>`;
}

export function scenesSection(p) {
  const l=p.lang;
  return `<section class="section immersive-section" id="scenes"><div class="wrap immersive-layout"><div>
${heading(p,'02',copy.nav3d,copy.sceneTitle,copy.sceneLead)}
<ul class="scene-points">${copy.scenePoints.map(v=>`<li>${text(v,l)}</li>`).join('')}</ul>
<a class="btn btn-primary" href="${site.appDeepUrl}/3d">${text(copy.open3d,l)} ${arrow}</a></div>
<figure class="scene-frame">${image(p,`scene-elevator-${l}.webp`,copy.sceneImageAlt,1440,510)}<figcaption>${text(copy.sceneCaption,l)}</figcaption></figure>
</div></section>`;
}

export function videosSection(p) {
  const l=p.lang;
  return `<section class="section video-section" id="videos"><div class="wrap">
${heading(p,'03',copy.navVideos,copy.videoTitle,copy.videoLead)}
<div class="video-grid">${copy.videos.map(v=>`<article class="video-card"><a class="video-cover" href="${site.appDeepUrl}/learn" aria-label="${text(copy.watch,l)}: ${text(v.title,l)}">${image(p,`video-${v.id}.webp`,v.title,540,960)}<span class="play-symbol" aria-hidden="true">▶</span><span class="duration">${v.duration}</span></a><div class="video-copy"><h3>${text(v.title,l)}</h3><p>${text(v.body,l)}</p><a class="text-link" href="${site.appDeepUrl}/learn">${text(copy.watch,l)} ${arrow}</a><a class="video-practice" href="${site.appDeepUrl}/3d?scene=${v.scene}&amp;opening=${v.opening}">${text(copy.videoPractice,l)} ${arrow}</a></div></article>`).join('')}</div>
<div class="video-foot"><p class="caption">${text(copy.videoNote,l)}</p><a class="text-link" href="${site.appDeepUrl}/learn">${text(copy.library,l)} ${arrow}</a></div>
</div></section>`;
}

export function closingSection(p) {
 const l=p.lang;
 return `<section class="section closing-section"><div class="wrap closing-layout"><div><h2>${lines(copy.closeTitle,l)}</h2><p class="lead">${text(copy.closeBody,l)}</p><div class="ctas"><a class="btn btn-primary" href="${site.appDeepUrl}/arena">${text(hero.ctaPrimary,l)} ${arrow}</a><a class="text-link" href="${site.appDeepUrl}/rehearse">${text(copy.rehearse,l)} ${arrow}</a></div></div>${image(p,'coach.webp',copy.coachAlt,192,256)}</div></section>`;
}

export const homeStyles = `
/* Current product, with an editorial hierarchy and real product imagery. */
.nav{border-bottom:0}.nav .wrap{min-height:76px}.brand .word{font-family:var(--font-sans);font-weight:600}.brand .zh{letter-spacing:.06em}.nav-links{gap:1.2rem;font-size:.88rem}
.btn{border-radius:var(--radius-sm);min-height:48px;justify-content:center}.btn-primary{color:var(--paper);box-shadow:none}.btn-primary:hover{box-shadow:var(--shadow-paper)}
.seg{border:0;border-radius:var(--radius-sm);background:var(--paper-deep)}.seg a{min-width:36px;min-height:40px;display:grid;place-items:center;border-radius:6px}.seg a.on{background:var(--card);color:var(--ink);box-shadow:var(--shadow-paper)}.seg .icon{display:none}.theme{width:44px;height:44px;border:0;border-radius:8px;background:transparent}
mark.ul{background:none;text-decoration:underline;text-decoration-color:var(--accent);text-decoration-thickness:2px;text-underline-offset:.22em}
.section{border-top:0;padding:88px 0}.section-head{margin-bottom:36px}.section h2{max-width:30ch;line-height:1.3;font-size:clamp(1.8rem,3vw,2.6rem)}.lead{font-size:1.04rem;line-height:1.8}
.text-link{display:inline-flex;align-items:center;gap:.55rem;color:var(--accent-deep);text-underline-offset:5px;font-weight:600;font-size:.95rem}.text-link span{transition:transform 160ms}.text-link:hover span{transform:translate(2px,-2px)}
.home-hero{padding:68px 0 48px;overflow:visible}.home-hero .wrap{grid-template-columns:minmax(0,1fr) minmax(0,1.03fr);gap:3.5rem;align-items:center}
.home-hero .pill{font-size:.8rem;margin-bottom:1.8rem;background:transparent;border:0;padding:0;gap:.65rem}.pill .tag{border-radius:4px;padding:.25rem .5rem}
.home-hero h1{font-size:clamp(2.6rem,4.7vw,4.2rem);line-height:1.23;margin:1rem 0 1.4rem;max-width:14ch}.home-hero h1:lang(zh-CN){max-width:none}
.home-hero .sub{font-size:1.06rem;line-height:1.9;max-width:44ch}.home-hero .ctas{margin-top:1.7rem;gap:.65rem}.home-hero .btn{font-size:.94rem;padding:.8rem 1.05rem}.rehearse-link{margin-top:1rem}
.micro{font-size:.8rem;gap:.6rem 1.1rem;color:var(--ink-3);margin-top:1.5rem}.micro li+li:before{content:'·';margin-right:.5rem}
.preview-heading{display:flex;align-items:center;gap:.6rem;margin-bottom:.8rem;font-size:.8rem;color:var(--ink-2)}.live-dot{width:7px;height:7px;border-radius:50%;background:var(--moss)}
.scene-preview{display:block;border-radius:var(--radius-lg);overflow:hidden;text-decoration:none;background:var(--card);box-shadow:var(--shadow-dialog);border:1px solid var(--line)}.scene-preview img{width:100%;height:auto}.preview-caption{display:flex;align-items:center;justify-content:space-between;padding:.8rem 1.1rem;font-size:.85rem;color:var(--ink-2)}
.preview-line{display:block;padding:0 1.1rem 1rem;font-size:1rem;line-height:1.75;color:var(--ink)}
.coach-note{display:flex;align-items:center;gap:1rem;margin:1rem 0 0 1.5rem;min-height:108px}.coach-note img{width:78px;height:104px;object-fit:contain}.coach-note p:last-child{font-size:.9rem;margin-top:.45rem;color:var(--ink-2)}
.starter-section{padding:18px 0 58px}.starter-head{display:flex;justify-content:space-between;gap:1rem;align-items:center;margin-bottom:1.4rem}.starter-head h2{font-size:1.05rem;font-weight:500;color:var(--ink-2)}
.starter-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.starter{display:flex;flex-direction:column;align-items:flex-start;gap:.75rem;padding:1.5rem;background:var(--surface-rest);border-radius:var(--radius);text-decoration:none;transition:background 160ms,transform 160ms}.starter:hover{background:var(--surface-hover);transform:translateY(-2px)}.starter h3{font-size:1.16rem;line-height:1.5}.starter>p:not(.eyebrow){font-size:.9rem;color:var(--ink-2);line-height:1.7}.starter .text-link{margin-top:auto;padding-top:.4rem;font-size:.83rem}.starter .eyebrow::before{display:none}
.practice-section{background:var(--paper-deep)}.practice-layout{display:grid;grid-template-columns:1.25fr 1fr;gap:3.4rem;align-items:center}.product-screen{margin:0;overflow:hidden;border-radius:var(--radius);background:var(--card);box-shadow:var(--shadow-paper)}.product-screen img{width:100%;height:auto}.product-screen figcaption,.scene-frame figcaption{font-size:.8rem;line-height:1.7;color:var(--ink-3);padding:1rem 1.2rem}
.practice-steps{list-style:none;padding:0;margin:0;display:grid;gap:1.8rem}.practice-steps li{display:flex;gap:1rem}.step-number{color:var(--accent);font-family:var(--font-serif);font-size:1.4rem}.practice-steps h3{font-size:1.06rem;line-height:1.6;margin-bottom:.5rem}.practice-steps p{font-size:.94rem;line-height:1.85;color:var(--ink-2)}
.evidence-layout{display:grid;grid-template-columns:1fr 1fr;gap:3.4rem;align-items:center;margin-top:64px;scroll-margin-top:100px}.quote-sheet{background:var(--card);padding:2rem;border-radius:var(--radius);box-shadow:var(--shadow-paper)}.quote-sheet blockquote{margin:1.3rem 0 1.5rem;padding-left:1rem;border-left:3px solid var(--accent);font-size:1.16rem;line-height:1.95}.caption{font-size:.78rem;color:var(--ink-3);line-height:1.65}.evidence-reading h3{font-size:1.45rem;line-height:1.5;margin-bottom:1rem}.evidence-reading>p{font-size:.96rem;line-height:1.9;color:var(--ink-2);margin-bottom:1rem}
.coach-followup{margin:48px 0 0;display:grid;grid-template-columns:1fr 1.7fr;gap:2rem;padding-top:32px;border-top:1px solid var(--line)}.coach-followup h3{font-size:1.25rem;line-height:1.6}.coach-followup p{color:var(--ink-2);font-size:.95rem;line-height:1.85}
.immersive-layout{display:grid;grid-template-columns:1fr 1.2fr;gap:3rem;align-items:center}.immersive-section .section-head{margin-bottom:1.3rem}.scene-points{padding:0;margin:0 0 1.8rem;list-style:none;display:grid;gap:.55rem;font-size:.92rem;color:var(--ink-2)}.scene-points li:before{content:'↳';color:var(--accent);margin-right:.6rem}.scene-frame{margin:0;overflow:hidden;background:var(--paper-deep);border-radius:var(--radius-lg)}.scene-frame img{width:100%;height:auto}
.video-section{padding-top:24px}.video-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem}.video-card{display:grid;grid-template-columns:155px 1fr;gap:1.5rem;padding:1.3rem;background:var(--surface-rest);border-radius:var(--radius-lg);align-items:center}.video-cover{position:relative;display:block;border-radius:var(--radius-sm);overflow:hidden}.video-cover img{width:100%;height:auto;aspect-ratio:9/16;object-fit:cover}.play-symbol{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:var(--card);color:var(--ink);box-shadow:var(--shadow-dialog);padding-left:3px}.duration{position:absolute;bottom:8px;right:8px;background:var(--card);color:var(--ink);padding:.1rem .4rem;font-size:.73rem;border-radius:4px}.video-copy h3{font-size:1.17rem;line-height:1.5;margin-bottom:.8rem}.video-copy p{font-size:.9rem;color:var(--ink-2);line-height:1.75;margin-bottom:1rem}.video-copy .text-link{font-size:.85rem}.video-practice{display:block;font-size:.8rem;color:var(--ink-2);text-underline-offset:4px;margin-top:.9rem}.video-foot{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:1.5rem}
#trust{background:var(--paper-deep);padding:56px 0}.stats{margin-top:1.5rem}.stat .n{font-family:var(--font-sans);font-size:2.5rem;letter-spacing:-.06em}.stat .icon,.inkrow{display:none}.stats-note,.sources{font-size:.9rem}#privacy{padding:64px 0}#privacy .card{background:transparent;border:0;padding:0 1.5rem 0 0;box-shadow:none;transform:none}#privacy .card .icon{background:none;padding:0;width:24px;height:24px;border-radius:0}.guide-more{padding-top:32px}.guide-more .cards{grid-template-columns:repeat(3,minmax(0,1fr))}.guide-card{border:0;background:var(--surface-rest)}
#faq{padding-top:40px}.faq summary{font-size:.97rem;line-height:1.65}.faq .a{font-size:.94rem;line-height:1.8}#research{background:var(--paper-deep);padding:72px 0}.paper>*{min-width:0}.paper-card{box-shadow:var(--shadow-paper)}.paper-title{font-size:1.6rem;overflow-wrap:anywhere}.paper .lead{font-size:.98rem}.covers{font-size:.92rem}.boundary{font-size:.88rem;background:var(--card);border:0}.bib{font-size:.85rem}.bib pre{max-height:190px}.closing-section h2{max-width:none}.closing-layout{display:grid;grid-template-columns:1fr 170px;gap:2rem;align-items:center}.closing-layout>.lead,.closing-layout .lead{margin-top:1.3rem;max-width:55ch}.closing-layout>img{width:170px;height:auto}.closing-layout .ctas{align-items:center;gap:1.5rem}
@media(min-width:1200px){.nav-links{gap:1.5rem}}
@media(max-width:1050px){.home-hero .wrap{gap:2rem}.nav .btn-sm .long{display:none}.nav .btn-sm .short{display:inline}.nav-links{display:none}.practice-layout,.immersive-layout{gap:2rem}.video-card{grid-template-columns:120px 1fr;gap:1rem;padding:1rem}}
@media(max-width:760px){.section{padding:56px 0}.home-hero{padding:36px 0 20px}.home-hero .wrap{grid-template-columns:1fr;gap:2rem}.home-hero h1{font-size:clamp(2.6rem,8vw,3.8rem);max-width:16ch}.home-hero .sub{max-width:52ch}.hero-showcase{max-width:600px;width:100%}.home-hero .pill{margin-bottom:1.4rem}.coach-note{margin-top:.25rem;min-height:92px}.coach-note img{width:64px;height:85px}.starter-grid{grid-template-columns:1fr}.starter{padding:1.1rem 1.3rem;gap:.4rem}.starter>.eyebrow{font-size:.7rem}.starter .text-link{padding-top:.3rem}.starter-section{padding:12px 0 40px}.starter-head{align-items:flex-start}.starter-head h2{max-width:17ch;line-height:1.6}.starter-head .text-link{white-space:nowrap;font-size:.82rem}.practice-layout,.evidence-layout,.immersive-layout{grid-template-columns:1fr;gap:2rem}.practice-steps{gap:1.4rem}.evidence-layout{margin-top:40px}.quote-sheet{padding:1.4rem}.quote-sheet blockquote{font-size:1.06rem}.evidence-reading h3{font-size:1.3rem}.coach-followup{grid-template-columns:1fr;gap:.7rem;margin-top:32px;padding-top:24px}.video-grid{grid-template-columns:1fr}.video-card{grid-template-columns:120px 1fr;gap:1.1rem}.video-foot{align-items:flex-start;flex-direction:column}.guide-more .cards{grid-template-columns:1fr}.closing-layout{grid-template-columns:1fr 85px;gap:1rem}.closing-layout>img{width:85px}.closing-layout .ctas{align-items:flex-start;gap:1rem}.closing-layout .lead{font-size:.95rem}.closing-section h2{font-size:1.8rem}.nav .wrap{min-height:64px}.brand .word{display:block;font-size:1.1rem}.brand .zh{display:none}.nav .btn-sm{display:none}.nav .ctrl{gap:.2rem}.brand{gap:.5rem}.seg a{padding:.4rem;min-width:32px}.stats{grid-template-columns:repeat(3,1fr);gap:1.7rem 1rem}.stat .n{font-size:2.1rem}.stat .l{font-size:.82rem}#privacy .cards{gap:1.6rem}.section-head{margin-bottom:28px}}
@media(max-width:390px){.video-card{grid-template-columns:100px 1fr}.video-copy h3{font-size:1.02rem}.video-copy p{font-size:.83rem}.home-hero .ctas{flex-direction:column;align-items:stretch}.closing-layout{grid-template-columns:1fr}.closing-layout>img{display:none}.micro{gap:.4rem .65rem}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}.starter:hover{transform:none}.text-link:hover span{transform:none}}
`;
