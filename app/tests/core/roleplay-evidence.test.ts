import assert from 'node:assert/strict';
import {test} from 'node:test';
import {scenarioById} from '../../src/data/corpus';
import {roleplayOutput} from '../../src/lib/roleplay-output';
import {parseRoleplay} from '../../src/lib/client-api';
import type {ChatMessage} from '../../src/lib/types';

// Captured 2026-11-09 in a real lunar-new-year-relatives replay: two quotes for one objective
// made objectiveEvidence longer than the objective list, and a correct reply was rejected as incomplete.
const scenario=scenarioById('lunar-new-year-relatives')!;
const history:ChatMessage[]=[
 {id:'o',role:'npc',characterId:'aunt',text:scenario.opening.text.zh,ts:0},
 {id:'l1',role:'learner',text:'大姨，工资这个我就不在饭桌上报数啦，够我自己在那边过得挺好。',ts:1},
 {id:'l2',role:'learner',text:'对象的事我自己有数，真有了一定第一个带回来，现在还没到那一步。',ts:2},
 {id:'l3',role:'learner',text:'妈，你跟大姨说「快了」，是怎么回事呀？我不怪你，就想知道咱俩以后对外怎么说。',ts:3},
];
const reply=(evidence:{index:number;learnerQuote:string;npcQuote?:string}[])=>JSON.stringify({meta:{objectives:[true,true],objectiveEvidence:evidence,ended:false,stance:40,revealed:true,disclosures:[{characterId:'mother',quote:'我就随口说了个“快了”，应付一下'}]},utterances:[{characterId:'mother',text:'哎呀……你大姨每回都问，我就随口说了个“快了”，应付一下，其实妈也没催你。这个回头咱娘俩再商量，啊，先吃饭。'}]});

test('several quotes for one objective are kept instead of failing the reply',()=>{
 const raw=reply([
  {index:0,learnerQuote:'工资这个我就不在饭桌上报数啦'},
  {index:0,learnerQuote:'对象的事我自己有数'},
  {index:1,learnerQuote:'就想知道咱俩以后对外怎么说',npcQuote:'这个回头咱娘俩再商量'},
 ]);
 const parsed=parseRoleplay(roleplayOutput(scenario,'you','zh',undefined,history).complete(raw),['aunt','mother']);
 assert.deepEqual(parsed.meta?.objectives,[true,true]);
 assert.equal(parsed.meta?.revealed,true);
});

test('evidence stays bounded and unquoted claims are still discarded',()=>{
 const many=Array.from({length:7},()=>({index:0,learnerQuote:'工资这个我就不在饭桌上报数啦'}));
 assert.throws(()=>roleplayOutput(scenario,'you','zh',undefined,history).complete(reply(many)));
 const invented=parseRoleplay(roleplayOutput(scenario,'you','zh',undefined,history).complete(reply([{index:0,learnerQuote:'我一个月挣三万'},{index:1,learnerQuote:'我下个月就带对象回来'},{index:1,learnerQuote:'从未说过的话'}])),['aunt','mother']);
 assert.deepEqual(invented.meta?.objectives,[false,false]);
});
