import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
const base=process.env.REVIEW_BASE_URL??'http://localhost:4322';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const label=process.argv[2]??'revision';const results=[];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]].filter(([engine])=>!process.env.REVIEW_ENGINE||process.env.REVIEW_ENGINE===engine)){
 const browser=await type.launch({headless:true});try{for(const width of [375,1440].filter(width=>!process.env.REVIEW_WIDTH||Number(process.env.REVIEW_WIDTH)===width))for(const lang of ['zh','en'].filter(lang=>!process.env.REVIEW_LANG||process.env.REVIEW_LANG===lang))for(let attempt=0;attempt<Number(process.env.REVIEW_REPEAT??1);attempt++){
  const c={work:lang==='zh'?'职场':'Workplace',recent:lang==='zh'?'本次新增':'New scenes',clear:lang==='zh'?'清除筛选':'Clear filters',back:lang==='zh'?'返回练习场':'Back to practice',more:lang==='zh'?/再看.*场景/:/Show.*more scenes/};
  const context=await browser.newContext({viewport:{width,height:900},locale:lang==='zh'?'zh-CN':'en-US',isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
  await context.addInitScript(lang=>{if(!localStorage.getItem('socialcoach.v1'))localStorage.setItem('socialcoach.v1',JSON.stringify({version:0,state:{profile:{name:'Review fixture',bio:'',goals:['communication'],contexts:[],lang,createdAt:1},proficiency:{},sessions:[],customScenarios:[],bookmarks:[],practiceDays:[],todaySessionId:null,todayDate:null,patternInsight:null,settings:{telemetry:false,tts:false,theme:'light'}}}));},lang);
  await context.route('**/api/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({state:'available',serverKey:true,requireByok:false,available:false})}));
  await context.route('**/arena?**',async r=>{if(r.request().headers().rsc==='1')await new Promise(resolve=>setTimeout(resolve,350));await r.continue();});
  const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/arena');await page.locator('.arena-row').first().waitFor();
  await page.locator('.arena-contexts button').filter({hasText:c.work}).click();await page.locator('.arena-contexts button').filter({hasText:c.recent}).click();
  await page.waitForFunction(()=>new URLSearchParams(location.search).get('context')==='workplace'&&new URLSearchParams(location.search).get('collection')==='recent'&&document.querySelectorAll('.arena-contexts button[aria-pressed=true]').length===2);
  const combined=new URL(page.url()).search;await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.arena-contexts button[aria-pressed=true]').length===2);assert.equal(new URL(page.url()).search,combined);
  await page.locator('nav a[href="/settings"]:visible').click();await page.waitForURL('**/settings');await page.goBack();await page.waitForURL('**/arena?**');await page.locator('.arena-row').first().waitFor();assert.equal(new URL(page.url()).search,combined);
  await page.goForward();await page.waitForURL('**/settings');await page.goBack();await page.waitForURL('**/arena?**');await page.locator('.arena-row').first().waitFor();
  await page.locator('.arena-row').first().click();await page.waitForURL('**/practice/**');await page.getByRole('button',{name:c.back,exact:true}).click();await page.waitForURL('**/arena?**');assert.equal(new URL(page.url()).search,combined);await page.locator('.arena-row').first().waitFor();
  await page.getByRole('button',{name:c.clear,exact:true}).click();assert.equal(new URL(page.url()).search,'');assert(await page.locator('input[type=search]').evaluate(e=>document.activeElement===e));
  await page.getByRole('button',{name:c.more}).click();await page.waitForFunction(()=>document.querySelectorAll('.arena-row').length===24);assert.equal(new URL(page.url()).searchParams.get('limit'),'24');
  await page.locator('.arena-contexts button').filter({hasText:c.work}).click();assert.equal(new URL(page.url()).searchParams.get('limit'),null);
  await page.getByRole('button',{name:c.clear,exact:true}).click();
  // Simulate the reported missing Next.js History notification while preserving its history state.
  await page.evaluate(()=>{window.history.replaceState=(data,unused,url)=>History.prototype.replaceState.call(history,history.state,unused,url);});
  await page.evaluate(()=>{window.__reviewInput=[];for(const type of ['keydown','input','focusin','focusout'])document.addEventListener(type,e=>{const target=e.target;window.__reviewInput.push({type,key:e.key,value:target.value,tag:target.tagName,url:location.search});});});const search=page.locator('input[type=search]');await search.pressSequentially('manager',{delay:12});const typing=await search.inputValue();if(typing!=='manager'){console.log('FAILURE_STATE',JSON.stringify(await page.evaluate(()=>({trace:window.__reviewInput,url:location.href,inputs:Array.from(document.querySelectorAll('input')).map(e=>({value:e.value,type:e.type,focused:e===document.activeElement,inert:e.closest('[inert]')!==null,rect:JSON.stringify(e.getBoundingClientRect())})),active:document.activeElement?.outerHTML,dialogs:Array.from(document.querySelectorAll('dialog')).map(e=>({open:e.open,text:e.innerText.slice(0,100)}))}))));await page.screenshot({path:'/tmp/socialcoach-pr26-input-failure.png'});}assert.equal(typing,'manager');assert.equal(new URL(page.url()).searchParams.get('q'),'manager');
  await search.fill('加薪');assert.equal(await search.inputValue(),'加薪');await page.waitForFunction(()=>document.querySelectorAll('.arena-row').length>0);assert.equal(new URL(page.url()).searchParams.get('q'),'加薪');
  await search.fill('zz-no-matching-scene-zz');await page.waitForFunction(()=>document.querySelectorAll('.arena-row').length===0);
  await page.getByRole('button',{name:c.clear,exact:true}).first().click();await page.waitForFunction(()=>document.querySelectorAll('.arena-row').length===12);
  await page.locator('.arena-contexts button').filter({hasText:c.work}).click();await page.locator('.arena-contexts button').filter({hasText:c.recent}).click();
  assert.equal(new URL(page.url()).search,combined);assert.equal(await page.locator('.arena-contexts button[aria-pressed=true]').count(),2);
  results.push({engine,width,lang,attempt,combinedFilters:true,refresh:true,backForward:true,sceneReturn:true,clearFocus:true,pagination:true,rapidTyping:true,chineseInput:true,emptyReset:true,missingRouterNotification:true,errors});console.log('PASS',label,engine,width,lang);await context.close();
 }}finally{await browser.close();}
}
await writeFile('/tmp/socialcoach-pr26-'+label+'.json',JSON.stringify(results,null,2)+'\n');console.log('Passed '+results.length+' cases, 11 behavior checks each.');
