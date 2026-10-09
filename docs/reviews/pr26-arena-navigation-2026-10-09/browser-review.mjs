const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
import {writeFile} from 'node:fs/promises';
const label=process.argv[2]??'baseline';const base=process.env.REVIEW_BASE_URL??'http://localhost:4322';const results=[];
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true});try{
 for(const width of [375,1440]){
 const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,locale:'zh-CN',serviceWorkers:'block'});
 await context.addInitScript(()=>{if(!localStorage.getItem('socialcoach.v1'))localStorage.setItem('socialcoach.v1',JSON.stringify({version:0,state:{profile:{name:'Review fixture',bio:'',goals:['communication'],contexts:[],lang:'zh',createdAt:1},proficiency:{},sessions:[],customScenarios:[],bookmarks:[],practiceDays:[],todaySessionId:null,todayDate:null,patternInsight:null,settings:{telemetry:false,tts:false,theme:'light'}}}));});
 await context.route('**/api/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({state:'available',serverKey:true,requireByok:false,available:false})}));
 let navigationRequests=0;
 await context.route('**/arena?**',async r=>{if(r.request().headers().rsc==='1'){navigationRequests++;await new Promise(resolve=>setTimeout(resolve,Number(process.env.REVIEW_NAV_DELAY??350)));}await r.continue();});
 const page=await context.newPage();page.setDefaultTimeout(10000);console.log('CASE',label,engine,width);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/arena');await page.locator('.arena-row').first().waitFor();await page.waitForTimeout(350);
 const initialCount=await page.locator('.arena-row').count();
 await page.locator('.arena-contexts button').filter({hasText:'职场'}).click();await page.waitForTimeout(650);
 const category={url:new URL(page.url()).search,selected:await page.locator('.arena-contexts button[aria-pressed=true]').allTextContents(),rows:await page.locator('.arena-row .arena-metadata').allTextContents()};
 await page.getByRole('button',{name:'清除筛选',exact:true}).click();await page.waitForTimeout(650);
 const search=page.locator('input[type=search]');await search.pressSequentially('manager',{delay:12});await page.waitForTimeout(1000);
 const typing={expected:'manager',actual:await search.inputValue(),query:new URL(page.url()).searchParams.get('q'),results:await page.locator('.arena-catalog [role=status]').textContent()};
 await page.goto(base+'/arena');await page.locator('.arena-row').first().waitFor();await page.waitForTimeout(350);
 await page.locator('.arena-contexts button').filter({hasText:'职场'}).click();
 await page.locator('.arena-contexts button').filter({hasText:'本次新增'}).click();await page.waitForTimeout(1000);
 const combined={context:new URL(page.url()).searchParams.get('context'),collection:new URL(page.url()).searchParams.get('collection'),selected:await page.locator('.arena-contexts button[aria-pressed=true]').allTextContents()};
 results.push({label,engine,width,initialCount,category,typing,combined,navigationRequests,errors});await context.close();
 }}finally{await browser.close();}
}
await writeFile('/tmp/socialcoach-pr26-'+label+'.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
