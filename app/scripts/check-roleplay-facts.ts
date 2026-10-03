/** Synthetic transcript checks. No provider calls or private browser data. */
import assert from 'node:assert/strict';
import {scenarioById} from '../src/data/corpus';
import {roleplaySpeechGuard} from '../src/lib/roleplay-facts';
import {roleplayOutput,RoleplayFactError} from '../src/lib/roleplay-output';
import {runRoleplay} from '../src/lib/tasks/roleplay';
import {parseRoleplay} from '../src/lib/client-api';
import type {ChatMessage} from '../src/lib/types';
import type {LLM} from '../src/lib/llm-core';

const scenario=scenarioById('office-quick-favor')!;
const learner=(text:string):ChatMessage=>({id:text,role:'learner',text,ts:1});
const initial=[learner('我自己的报告16:30要交。我最多只看一页，不替你重做。'),learner('你听到的承诺是什么？')];
const bad='我听到的：你16:30前交你的报告；交完之后只聊第三页，六页归我。';
const good='我听到的是只讨论第三页，不接六页。具体什么时候看，还没约定。';
const utterances=(text:string)=>[{characterId:'tang',text}];
const guard=roleplaySpeechGuard(scenario.id,initial)!;
let checks=0;
function check(label:string,fn:()=>void){fn();checks++;console.log('PASS',label);}
check('a report deadline and limited help do not establish a post-report appointment',()=>{
 assert.ok(guard(utterances(bad)));assert.equal(guard(utterances(good)),undefined);
 assert.ok(guard(utterances('After you finish your report, you will help me with page three.')));
 assert.ok(guard(utterances('你16:30前忙自己的报告，完了只看第三页的逻辑问题，指出来就行。')));
 assert.ok(guard(utterances('没误解：你16:30前只忙你自己的报告，之后也只帮我看第三页的问题。')));
});
check('a recap cannot move the report deadline onto help before the deadline either',()=>{
 const before='我听到了：你16:30前只帮我看第三页，剩下我改。';
 assert.ok(guard(utterances(before)));
 assert.equal(roleplaySpeechGuard(scenario.id,[...initial,learner('我16:30前可以帮你看一页。')])!(utterances(before)),undefined);
 assert.equal(roleplaySpeechGuard(scenario.id,[...initial,learner('16:30前我看一页。')])!(utterances(before)),undefined);
 assert.ok(roleplaySpeechGuard(scenario.id,[...initial,learner('你说我16:30前会帮你，我还没答应。')])!(utterances(before)));
 assert.ok(roleplaySpeechGuard(scenario.id,[...initial,learner('我16:30后可以帮你看一页。')])!(utterances(before)));
});
check('an explicit proposal or denial stays playable',()=>{
 for(const text of ['要不你交完报告后帮我看看？','你交完报告之后能看一页吗？','你报告之后帮忙，没有约定。','你不需要交完报告后帮我看，这还没定。','Could you help me after you finish your report?'])assert.equal(guard(utterances(text)),undefined);
});
check('the learner may actually offer that time, including rejecting a larger scope',()=>{
 const zh=roleplaySpeechGuard(scenario.id,[...initial,learner('我16:30后可以帮你看一页，不替你重做六页。')]);
 assert.equal(zh!(utterances(bad)),undefined);
 const en=roleplaySpeechGuard(scenario.id,[learner('After I submit my report, I can review one page.')]);
 assert.equal(en!(utterances('After you finish your report, you will help me with page three.')),undefined);
});
check('NPC suggestions are not consent and later revocation is retained',()=>{
 assert.ok(roleplaySpeechGuard(scenario.id,[...initial,{id:'n',role:'npc',characterId:'tang',text:'交完报告后再帮我吧。',ts:2}])!(utterances(bad)));
 assert.ok(roleplaySpeechGuard(scenario.id,[...initial,learner('我报告交完后可以看一页。'),learner('我撤回报告交完后帮忙的承诺。')])!(utterances(bad)));
});
check('a conditional offer or a question about an assignment is not an unconditional appointment',()=>{
 for(const text of ['如果我报告交完后有空，可以讨论一页。','你说我16:30后会帮你吗？我没答应。','If I have time after my report, I could review a page.'])
  assert.ok(roleplaySpeechGuard(scenario.id,[...initial,learner(text)])!(utterances(bad)));
});
check('other scenes retain their existing streaming path',()=>assert.equal(roleplaySpeechGuard('class-chat-screenshot',initial),undefined));

const meta={objectives:[false,false],ended:false,stance:40,revealed:false,note:''};
const raw=(text:string)=>JSON.stringify({meta,utterances:utterances(text)});
check('an unconfirmed appointment never flashes as a visible preview',()=>{
 const output=roleplayOutput(scenario,'you','zh',guard);
 for(let i=1;i<=raw(bad).length;i++)assert.equal(output.preview(raw(bad).slice(0,i)),'');
 assert.throws(()=>output.complete(raw(bad)),RoleplayFactError);
 assert.equal(output.preview(raw(good)),output.complete(raw(good)));
});
async function main(){
 let repairs=0,visible='';
 const fake:LLM={chatStream:()=>({deltas:(async function*(){const text=raw(bad);for(let i=0;i<text.length;i+=7)yield text.slice(i,i+7);})(),text:()=>raw(bad),refused:()=>false}),chatText:async opts=>{
  repairs++;assert.equal(opts.messages.at(-1)?.content,initial.at(-1)!.text);
  assert.match(JSON.stringify(opts.system),/deadline is not a help appointment/);return raw(good);
 }};
 const complete=await runRoleplay({scenario,learnerCharacterId:'you',lang:'zh',messages:initial},fake,'fixture',d=>visible+=d);
 assert.equal(repairs,1);assert.equal(visible,complete);assert(!visible.includes('交完之后'));
 assert.equal(parseRoleplay(complete,['tang']).utterances[0].text,good);checks++;console.log('PASS one bounded repair keeps the same player turn and only shows the corrected reply');
 let failedVisible='',attempts=0;
 await assert.rejects(runRoleplay({scenario,learnerCharacterId:'you',lang:'en',messages:initial},{...fake,chatText:async()=>{attempts++;return raw(bad);}},'fixture',d=>failedVisible+=d),RoleplayFactError);
 assert.equal(attempts,1);assert.equal(failedVisible,'');checks++;console.log('PASS a second invalid draft remains unseen and unsaved');
 console.log(`${checks} roleplay fact checks passed.`);
}
void main();
