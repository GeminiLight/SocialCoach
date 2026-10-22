const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true}),results=[];
 try{for(let run=0;run<3;run++){
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/health',r=>r.fulfill({json:{state:'available',serverKey:true,requireByok:false}}));
  await page.route('**/api/track',r=>r.fulfill({json:{available:false}}));
  await page.route('**/api/roleplay',r=>r.abort());await page.route('**/api/assess',r=>r.abort());
  await context.addInitScript(()=>{if(!localStorage.getItem('socialcoach.v1'))localStorage.setItem('socialcoach.v1',JSON.stringify({version:0,state:{profile:{name:'Synthetic recipient',bio:'Private biography',goals:['communication'],contexts:[],lang:'en',createdAt:1},sessions:[],settings:{tts:false,telemetry:false}}}));});
  await page.goto('http://127.0.0.1:4339/challenge/office-quick-favor/v1/zh');
  await page.getByRole('button',{name:'我也想邀请朋友',exact:true}).click();
  await page.locator('#invite-card img').waitFor();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'我来试试',exact:true}).evaluate(b=>{b.click();b.click()});
  await page.waitForURL('**/practice/*');await page.locator('textarea').waitFor();
  const check=()=>page.evaluate(()=>({url:location.pathname,count:JSON.parse(localStorage.getItem('socialcoach.v1')).state.sessions.length,name:JSON.parse(localStorage.getItem('socialcoach.v1')).state.profile.name}));
  const first=await check();assert.equal(first.count,1);assert.equal(first.name,'Synthetic recipient');
  await page.goBack();await page.getByRole('button',{name:'继续我的这场挑战',exact:true}).waitFor();
  await page.getByRole('button',{name:'继续我的这场挑战',exact:true}).click();await page.waitForURL('**/practice/*');await page.locator('textarea').waitFor();
  assert.deepEqual(await check(),first);await page.reload();await page.locator('textarea').waitFor();assert.deepEqual(await check(),first);assert.deepEqual(errors,[]);
  results.push({run:run+1,doubleClickOneSession:true,browserBackResume:true,refreshRetained:true,privateProfileRetained:true,pageErrors:0});await context.close();
 }
 fs.writeFileSync('/tmp/socialcoach-invite-navigation.json',JSON.stringify({engine:'independent Playwright Chromium',build:'production',models:'blocked; no inference',groups:results},null,2));console.log('3 independent navigation groups passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
