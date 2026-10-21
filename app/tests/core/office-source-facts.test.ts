import assert from 'node:assert/strict';
import {test} from 'node:test';
import {roleplaySpeechGuard} from '../../src/lib/roleplay-facts';
import {roleplayOutput} from '../../src/lib/roleplay-output';
import {scenarioById} from '../../src/data/corpus';

const guard=roleplaySpeechGuard('office-quick-favor',[])!;
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
