/** Runs before application chunks. No archive writes, network calls, or automatic reloads. */
export const STARTUP_SCRIPT=`(function(){
 var root=document.documentElement,lang=/\\/(zh|en)\\/?$/.exec(location.pathname),stored;
 try{stored=JSON.parse(localStorage.getItem('socialcoach.v1')||'{}').state;}catch(e){}
 var chosen=location.pathname.indexOf('/challenge/')===0&&lang?lang[1]:stored&&stored.profile&&stored.profile.lang;
 root.dataset.startupLanguage=chosen==='zh'||chosen==='en'?chosen:navigator.language.indexOf('zh')===0?'zh':'en';
 function stalled(){if(root.dataset.appReady!=='true')root.dataset.startupStalled='true';}
 function failed(event){var node=event.target;if(node&&node.tagName==='SCRIPT'&&node.src&&node.src.indexOf('/_next/static/')!==-1)stalled();}
 var timer=setTimeout(stalled,12000);
 window.addEventListener('error',failed,true);
 window.addEventListener('socialcoach:ready',function(){clearTimeout(timer);window.removeEventListener('error',failed,true);delete root.dataset.startupStalled;},{once:true});
})();`;
