/** Local browser checks. Provider and shared API responses are fixtures. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fixtureSession } from './check-debrief-assistant';
import { buildSession } from '../src/lib/session-utils';
import { scenarioById } from '../src/data/corpus';

const base = process.env.UX_BASE_URL ?? 'http://localhost:3101';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const session = `model-access-${process.pid}`;
const artifacts = join(tmpdir(), session); mkdirSync(artifacts, { recursive: true });
function browser(args: string[], input?: string) {
  const result = JSON.parse(execFileSync('agent-browser', ['--session', session, '--json', ...args], { input, encoding: 'utf8', timeout: 60000 }));
  assert(result.success, JSON.stringify(result.error)); return result.data;
}
const evaluate = (code: string) => browser(['eval', '--stdin'], code).result;
const wait = (code: string) => browser(['wait', '--fn', code]);
const button = (name: string) => browser(['find', 'role', 'button', 'click', '--name', name, '--exact']);
let checks = 0; const check = (name: string, condition: unknown) => { assert(condition, name); checks++; console.log(`PASS ${name}`); };
const report = fixtureSession();
const smartPending = { ...report, id: 'model-smart-failure', status: 'ended', report: undefined, revealSeen: true, debriefChat: undefined };
const scenario = scenarioById('declining-extra-hours')!;
const active = { ...buildSession(scenario, 'arena', 'zh'), id: 'model-active', status: 'active', timed: true, adaptation: { learnerCharacterId: 'you', briefing: scenario.background.zh, objectives: scenario.objectives.map(o => o.zh), focus: '', why: '' }, messages: [{ id: 'opening', role: 'npc', characterId: scenario.opening.characterId, text: scenario.opening.text.zh, ts: 1 }] };
const state = { profile: { name: 'Connection fixture', bio: '', goals: ['communication'], contexts: [], lang: 'zh', createdAt: 1 }, sessions: [report, active, smartPending], settings: { theme: 'light', telemetry: false, tts: false }, proficiency: { communication: 2 }, practiceDays: [], customScenarios: [], bookmarks: [], todaySessionId: null, todayDate: null, patternInsight: null };
const saved = () => JSON.parse(evaluate("localStorage.getItem('socialcoach.v1')")).state;
const health = (body: object) => { browser(['network', 'unroute', '**/api/health*']); return browser(['network', 'route', '**/api/health*', '--body', JSON.stringify(body)]); };
function open(path: string) { browser(['open', base + path]); wait("document.querySelector('h1') !== null || document.querySelector('textarea') !== null"); }
const mockProvider = () => evaluate(`window.__calls=[]; window.__mode='auth'; window.__originalFetch ??= window.fetch; window.fetch=async (url, init)=>{
 if(!String(url).includes('/models')) return window.__originalFetch(url,init);
 window.__calls.push({url:String(url),method:init?.method||'GET'});
 if(window.__mode==='auth') return Response.json({error:{message:'Fixture key invalid',type:'invalid_request_error',code:'invalid_api_key'}},{status:401});
 if(window.__mode==='unsupported') return Response.json({error:{message:'Not found'}},{status:404});
 return Response.json({data:[{id:'gpt-4.1-mini',object:'model',created:1,owned_by:'fixture'}]});
}; true`);
try {
  browser(['open', 'about:blank']);
  browser(['network', 'route', '**/api/track', '--body', '{}']);
  browser(['network', 'route', '**/api/feedback', '--body', '{"available":false}']);
  health({ state: 'available', serverKey: true, requireByok: false });
  browser(['open', base + '/onboarding']);
  evaluate(`localStorage.setItem('socialcoach.v1', ${JSON.stringify(JSON.stringify({ state, version: 0 }))}); localStorage.removeItem('socialcoach.llm.v1'); true`);
  health({ state: 'unavailable', issue: 'setup', serverKey: false, requireByok: false });
  open('/arena'); wait("document.body.innerText.includes('练习需要连接一个模型')");
  wait("document.querySelector('#model-key') !== null");
  const hydratedArchive=saved();
  check('confirmed shared failure automatically opens the configuration form', evaluate("document.querySelector('dialog[open]') !== null && document.querySelectorAll('h1').length === 1"));
  browser(['press', 'Escape']); wait("!document.querySelector('dialog[open]')");
  check('the automatic prompt can be dismissed to keep browsing', evaluate("document.querySelector('button').getClientRects().length > 0"));
  check('scenarios remain readable and searchable', evaluate("document.querySelector('input[type=search]') !== null || document.querySelectorAll('article').length > 0 || document.body.innerText.includes('临时加班')"));
  open(`/practice/${report.id}`); wait("document.querySelector('#review-assistant') !== null");
  check('the same shared failure does not reopen after a full navigation', evaluate("!document.querySelector('dialog[open]')"));
  check('saved report remains readable while assistant generation is disabled', evaluate("document.querySelector('#review-assistant button[type=submit]').disabled && document.body.innerText.includes('自我暴露')"));
  check('history and proficiency are unchanged', JSON.stringify(saved().sessions[0]) === JSON.stringify(hydratedArchive.sessions[0]) && JSON.stringify(saved().proficiency) === JSON.stringify(hydratedArchive.proficiency));
  open('/rehearse');wait("document.querySelector('#rehearsal-description') !== null");browser(['fill', '#rehearsal-description', '明天我要和同事讨论工作安排。']);
  button('检查背景并生成');wait("document.querySelector('dialog[open]') !== null");
  check('scenario generation is disabled without losing the draft', evaluate("Array.from(document.querySelectorAll('dialog button')).find(b=>b.textContent.includes('确认发送并生成')).disabled && document.querySelector('#rehearsal-description').value.includes('同事')"));
  button('关闭');wait("!document.querySelector('dialog[open]')");
  button('接入模型'); wait("document.querySelector('#model-key') !== null");
  check('key, editable model name and compatible base address are visible without opening advanced settings', evaluate("document.querySelector('#model-name')?.getClientRects().length>0 && document.querySelector('dialog input[type=url]')?.getClientRects().length>0 && !document.querySelector('dialog details').open"));
  button('OpenAI'); browser(['fill', '#model-key', 'f']); browser(['type', '#model-key', 'ixture-not-a-real-key']);
  check('provider examples are placeholders, not a forced model selection', evaluate("document.querySelector('#model-name').value==='' && document.querySelector('#model-name').placeholder==='gpt-4.1-mini'"));
  browser(['fill','#model-name','deepseek-flash']);button('清空模型名称');
  check('one tap clears the model name and keeps keyboard focus for a replacement',evaluate("document.querySelector('#model-name').value==='' && document.activeElement.id==='model-name'"));
  browser(['type','#model-name','gpt-4.1-mini']);
  check('key input remains editable after the first character', evaluate("document.querySelector('#model-key').value==='fixture-not-a-real-key' && document.querySelector('#model-key').type==='password'"));
  mockProvider(); button('检查并保存'); wait("document.querySelector('dialog')?.textContent.includes('密钥已失效')");
  check('failed check keeps the form and does not persist an invalid key', evaluate("document.querySelector('dialog[open]') !== null && !JSON.parse(localStorage.getItem('socialcoach.llm.v1'))?.state.apiKey"));
  evaluate("window.__mode='ok'; true"); button('检查并保存'); wait("!document.querySelector('dialog[open]')");
  button('检查背景并生成');wait("document.querySelector('dialog[open]') !== null");
  check('successful metadata check saves the key and restores generation', evaluate("JSON.parse(localStorage.getItem('socialcoach.llm.v1')).state.enabled && !Array.from(document.querySelectorAll('dialog button')).find(b=>b.textContent.includes('确认发送并生成')).disabled"));
  button('关闭');wait("!document.querySelector('dialog[open]')");
  check('connection checking never generates content', evaluate("window.__calls.length >= 2 && window.__calls.every(c=>c.method==='GET' && c.url.includes('/models'))"));
  // Return to the shared model without a paid call.
  open('/settings'); wait("document.body.innerText.includes('自己的 ·')");
  browser(['find', 'role', 'button', 'click', '--name', '自己的']);
  wait("document.querySelector('dialog[open]') !== null");
  mockProvider(); evaluate("window.__mode='unsupported'; true"); button('检查并保存');
  wait("document.querySelector('dialog')?.textContent.includes('不支持连接检查')");
  check('unsupported metadata is clearly marked unverified', evaluate("document.querySelector('dialog[open]') !== null"));
  button('保存并在练习中尝试'); wait("!document.querySelector('dialog[open]')");
  check('unverified compatible service can be saved without a paid test', evaluate("window.__calls.every(c=>c.method==='GET')"));
  browser(['find', 'role', 'button', 'click', '--name', '自己的']);
  wait("document.querySelector('dialog[open]') !== null");
  health({ state: 'available', serverKey: true, requireByok: false }); button('使用默认模型');
  wait("!document.querySelector('dialog[open]')");
  open('/practice/model-active'); wait("document.querySelector('textarea') !== null && !document.querySelector('button[aria-label=提示]').disabled");
  evaluate(`window.__originalFetch=window.fetch; window.__generated=0; window.fetch=async (url,init)=>{
    if(String(url)==='/api/roleplay'){window.__generated++;return new Response('\\n@@error\\n'+JSON.stringify({error:'Fixture quota',status:429,modelIssue:'quota'}));}
    return window.__originalFetch(url,init);
  }; true`);
  browser(['fill', 'textarea', '我先说清自己的安排。']); browser(['click', 'button[aria-label=发送]']);
  wait("document.body.innerText.includes('额度已用完')");
  wait("document.querySelector('#model-key') !== null");
  check('runtime quota failure opens the form with a brief recovery explanation', evaluate("document.querySelector('dialog[open]')?.textContent.includes('默认模型暂时不可用')"));
  browser(['click', 'button[aria-label=关闭]']); wait("!document.querySelector('dialog[open]')");
  check('streaming quota failure disables sending and hints', evaluate("document.querySelector('button[aria-label=发送]').disabled && document.querySelector('button[aria-label=提示]').disabled"));
  check('failed turn retains evidence and adds no fabricated NPC reply', saved().sessions.find((s: { id: string }) => s.id === active.id).messages.length === 2 && evaluate("window.__generated===1"));
  const messages = JSON.stringify(saved().sessions.find((s: { id: string }) => s.id === active.id).messages);
  browser(['wait', '1100']);
  check('unavailable model pauses the reply clock', JSON.stringify(saved().sessions.find((s: { id: string }) => s.id === active.id).messages) === messages);
  button('重新检查'); wait("Array.from(document.querySelectorAll('[role=alert] button')).some(b=>b.textContent.trim()==='重试' && !b.disabled)"); check('free retry restores model-dependent controls', true);
  browser(['network', 'route', '**/api/assess', '--body', '\n@@error\n'+JSON.stringify({error:'Fixture smart model unavailable',status:404,modelIssue:'model'})]);
  open(`/practice/${smartPending.id}`); wait("document.querySelector('#model-key') !== null");
  check('smart assessment failure opens configuration even after a working fast-model connection', evaluate("document.querySelector('dialog[open]')?.textContent.includes('默认模型暂时不可用') && document.body.innerText.includes('模型配置不可用')"));
  const pending = saved().sessions.find((s: { id: string }) => s.id === smartPending.id);
  check('smart-model failure preserves the completed transcript and adds no report or proficiency', JSON.stringify(pending.messages) === JSON.stringify(smartPending.messages) && !pending.report && JSON.stringify(saved().proficiency)===JSON.stringify(hydratedArchive.proficiency));
  browser(['click', 'dialog summary']); wait("document.querySelector('dialog details').open");
  check('the same form provides a separate review-model setting', evaluate("Array.from(document.querySelectorAll('dialog label')).some(l=>l.textContent.includes('复盘模型（可选）') && l.querySelector('input'))"));
  browser(['press', 'Escape']); wait("!document.querySelector('dialog[open]')");
  check('smart-model failure pauses retries while the original evidence stays readable', evaluate("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='重试' && b.disabled) && document.body.innerText.includes(" + JSON.stringify(smartPending.messages.find(m=>m.role==='learner')!.text) + ")"));
  health({ state: 'unavailable', issue: 'credentials', serverKey: true, requireByok: false });
  for (const [lang, theme, width] of [['zh','light',360], ['en','dark',1440]] as const) {
    const data = saved(); data.profile.lang=lang; data.settings.theme=theme;
    evaluate(`localStorage.setItem('socialcoach.v1', ${JSON.stringify(JSON.stringify({state:data,version:0}))}); true`);
    browser(['set', 'viewport', String(width), '900']); open('/settings');
    wait("document.body.innerText.includes(" + JSON.stringify(lang==='zh'?'密钥已失效':'The model key is invalid') + ")");
    if (lang==='zh') { wait("document.querySelector('dialog[open]') !== null"); check('new credentials failure opens a fresh prompt after successful recovery', true); }
    else check('language reload does not reopen the dismissed failure', evaluate("!document.querySelector('dialog[open]')"));
    if (!evaluate("document.querySelector('#model-key') !== null")) button(lang==='zh'?'接入模型':'Connect a model');
    wait("document.querySelector('#model-key') !== null");
    wait("!document.getAnimations().some(a=>a.playState==='running' && a.effect.getTiming().iterations!==Infinity)");
    check(`${lang}/${width}: form fits without horizontal overflow`, evaluate("document.documentElement.scrollWidth <= innerWidth && document.querySelector('dialog').scrollWidth <= document.querySelector('dialog').clientWidth"));
    check(`${lang}/${width}: controls remain reachable at touch size`, evaluate("Array.from(document.querySelectorAll('dialog button')).filter(b=>b.getClientRects().length).every(b=>b.getBoundingClientRect().height>=43)"));
    check(`${lang}/${width}: failure guidance is localized and the form is immediately usable`, evaluate("document.querySelector('dialog').textContent.includes(" + JSON.stringify(lang==='zh'?'默认模型暂时不可用':'The default model is unavailable') + ") && document.querySelector('#model-key').type==='password'"));
    browser(['screenshot', join(artifacts, `model-${lang}-${width}.png`)]);
    const scan=browser(['a11y','--tags','wcag2a,wcag2aa','--selector','dialog']); check(`${lang}/${width}: no automatic accessibility violations`, scan.counts.violations===0);
  }
  browser(['open', base + '/3d']); wait("document.querySelector('.take-seat .primary-button') !== null");
  check('3D model practice is disabled instead of switching to scripted replies', evaluate("document.querySelector('.take-seat .primary-button').disabled && document.body.innerText.includes('Connect a model')"));
  console.log(`${checks} browser checks passed. Artifacts: ${artifacts}`);
} catch (error) { console.error(evaluate('document.body.innerText.slice(0,1800)')); browser(['screenshot', join(artifacts, 'failure.png')]); throw error; } finally { browser(['close']); }
