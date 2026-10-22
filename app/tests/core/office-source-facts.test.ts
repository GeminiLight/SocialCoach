import assert from 'node:assert/strict';
import {test} from 'node:test';
import {roleplaySpeechGuard} from '../../src/lib/roleplay-facts';
import {roleplayOutput} from '../../src/lib/roleplay-output';
import {scenarioById} from '../../src/data/corpus';

const guard=roleplaySpeechGuard('office-quick-favor',[])!;
test('short replay keeps the reasoning disclosure private until asked for original feedback',()=>{
 const reply=[{characterId:'tang',text:'老板原话说我的论证站不住。'}];
 for(const text of ['行，我先帮你改吧。','哪一页最要紧？','I can list questions for one page.'])assert.ok(roleplaySpeechGuard('office-quick-favor',[{id:'u',role:'learner',text,ts:1}],true)!(reply));
 for(const text of ['老板原话怎么说的？','What did your boss say?'])assert.equal(roleplaySpeechGuard('office-quick-favor',[{id:'u',role:'learner',text,ts:1}],true)!(reply),undefined);
 assert.equal(roleplaySpeechGuard('office-quick-favor',[],true)!([{characterId:'tang',text:'第三页最要紧，其他几页我自己处理。'}]),undefined);
});
test('short replay cannot invent reciprocal debts or relative urgency',()=>{
 const strict=roleplaySpeechGuard('office-quick-favor',[],true)!;
 for(const text of ['上次我可是二话不说就帮你救过急的。','具体几点没说死，但肯定早于你那个16:30。','I helped you last week.','My deadline is before yours.'])assert.ok(strict([{characterId:'tang',text}]),text);
 for(const text of ['之前你都帮我的，这次真的不行吗？','我还得确认自己的截止时间。'])assert.equal(strict([{characterId:'tang',text}]),undefined,text);
});
test('Tang cannot invent a clock deadline or contradict her known boss feedback',()=>{
 for(const text of ['我四点前要拿去给老板看的。','我下午三点左右来拿就行。','我下午三点就得交了。','I need it by 4:00.','I will pick it up at 3 pm.','My boss wants it before 3 pm.','老板具体没细说。','My boss did not specify anything.'])assert.ok(guard([{characterId:'tang',text}]),text);
});
test('the learner deadline, conditional handoffs and uncertain Tang timing remain valid',()=>{
 for(const text of ['你16:30要交报告，我知道。','我下午要用，具体几点还得确认。','你能三点给我吗？','I know your report is due at 4:30.','Could you send your questions by 4?','My deadline is not confirmed.','老板说第三页的论证不成立。'])assert.equal(guard([{characterId:'tang',text}]),undefined,text);
});
test('Tang cannot convert her own six-slide demand into an established boss requirement',()=>{
 for(const text of ['老板是要看全稿的。','老板下午要看。','My boss needs all six slides.'])assert.ok(guard([{characterId:'tang',text}]),text);
 for(const text of ['我还是想让你帮我改六页。','老板只说第三页的论证不成立。','I want all six done.','My boss never asked for all six.'])assert.equal(guard([{characterId:'tang',text}]),undefined,text);
});
test('office NPC cannot invent an already available purchase order or source sheet',()=>{
 for(const text of ['数字我自己核吧，采购单我手里有。','我已经找到来源表。','I have the purchase order.','The source spreadsheet is with me.'])assert.ok(guard([{characterId:'tang',text}]),text);
});
test('source questions, unknown availability and future checks remain playable',()=>{
 for(const text of ['采购单在哪里？','我还没有找到采购单。','如果我有采购单就能先查。','我会先找采购单，再看看能不能核实。','I do not have the purchase order.','If I have the purchase order, I can check.','I will look for the source spreadsheet.'])assert.equal(guard([{characterId:'tang',text}]),undefined,text);
});
test('an NPC invention cannot become its own supporting history',()=>{
 const text='采购单我手里有。';
 assert.ok(roleplaySpeechGuard('office-quick-favor',[{id:'n',role:'npc',text,ts:1}])!([{characterId:'tang',text}]));
});
test('only an actual handoff can establish Tang possession, not learner possession or a hypothetical',()=>{
 const reply=[{characterId:'tang',text:'采购单我手里有。'}];
 for(const text of ['采购单我手里有。','如果采购单给你了，你就能核实吗？','我没有把采购单给你了。'])assert.ok(roleplaySpeechGuard('office-quick-favor',[{id:'u',role:'learner',text,ts:1}])!(reply));
 for(const text of ['我把采购单给你了。','I gave you the purchase order.'])assert.equal(roleplaySpeechGuard('office-quick-favor',[{id:'u',role:'learner',text,ts:1}])!(reply),undefined);
});
test('the reproduced purchase-order claim stays invisible and cannot become durable evidence',()=>{
 const scene=scenarioById('office-quick-favor')!;
 const raw=JSON.stringify({meta:{objectives:[false,false],ended:false,stance:50,revealed:false,disclosures:[]},utterances:[{characterId:'tang',text:'好好好，数字我自己核吧，采购单我手里有。'}]});
 const output=roleplayOutput(scene,'you','zh',guard);
 assert.equal(output.preview(raw),'');assert.throws(()=>output.complete(raw));
});
