import {pick} from '@/lib/i18n';

const L={
 loading:{zh:'正在打开你的练习场…',en:'Opening your practice space…'},
 title:{zh:'页面还没准备好',en:'The page is not ready yet'},
 detail:{zh:'如果按钮一直没有反应，可以重新加载。已保存在此浏览器的练习不会被清空。',en:'If the buttons are still unresponsive, reload the page. Practice already saved in this browser will stay here.'},
 reload:{zh:'重新加载页面',en:'Reload this page'},
 noScript:{zh:'请允许此网站运行 JavaScript，再重新加载，以开始练习。',en:'Allow JavaScript for this site, then reload to start practicing.'},
};

/** Both languages have identical server/client markup, including before the archive loads. */
function Copy({name}:{name:keyof typeof L}){
 return <>{(['zh','en'] as const).map(lang=><span key={lang} lang={lang} data-startup-language={lang}>{pick(L[name],lang)}</span>)}</>;
}

export function StartupPlaceholder(){
 return <div className="min-h-dvh flex flex-col items-center justify-center gap-3 px-6 text-center" role="status">
  <span className="display text-[26px]">SocialCoach</span>
  <p className="text-[14px] text-ink-2"><Copy name="loading"/></p>
 </div>;
}

/** Outside AppProviders: these native controls survive a failed application bundle. */
export function StartupRecovery(){
 return <aside id="startup-recovery" className="startup-recovery" aria-labelledby="startup-recovery-title" role="status">
  <h2 id="startup-recovery-title" className="text-[17px] font-semibold"><Copy name="title"/></h2>
  <p className="text-[14px] leading-relaxed text-ink-2 mt-2"><Copy name="detail"/></p>
  <noscript><p className="text-[14px] leading-relaxed mt-2">{pick(L.noScript,'zh')} / {pick(L.noScript,'en')}</p></noscript>
  {/* A normal navigation works even when React has not started. */}
  <a href="" className="press inline-flex min-h-11 items-center mt-3 text-[14px] font-semibold text-action underline underline-offset-4"><Copy name="reload"/></a>
 </aside>;
}
