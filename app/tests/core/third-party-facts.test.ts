import assert from 'node:assert/strict';
import {test} from 'node:test';
import {roleplaySpeechGuard} from '../../src/lib/roleplay-facts';
import {roleplayOutput,RoleplayFactError} from '../../src/lib/roleplay-output';
import {SCENARIOS} from '../../src/data/corpus';

test('a manager cannot turn section-three edits into a confirmed client-wide rewrite',()=>{
 const guard=roleplaySpeechGuard('declining-extra-hours',[])!;
 for(const text of ['生日？那我尽量往前赶……可客户点名要整份方案重做，你不在谁顶？明早九点可不是我定的。','The client demanded that we redo the entire deck. Who handles it if you leave?','The client wants a full rewrite; how is that going to happen without you?'])assert.ok(guard([{characterId:'michael',text}]),text);
 for(const text of ['今晚把第三部分改完，客户明早九点要看。','我想整份再看一遍，你给我什么替代安排？','客户真的要求整份重做吗？我先确认，不能瞎说。','不是客户要求整份重做，是我还想把完整方案过一遍。','If the client requested an entire rewrite, we would need to confirm its scope first.','The client did not ask for a full rewrite.','The client doesn’t want a whole-deck rewrite.','The client needs the deck at nine tomorrow; I want section three redone.'])assert.equal(guard([{characterId:'michael',text}]),undefined,text);
});

test('an invented client scope stays out of previews and durable replies',()=>{
 const scene=SCENARIOS.find(s=>s.id==='declining-extra-hours')!;
 const output=roleplayOutput(scene,'you','zh',roleplaySpeechGuard(scene.id,[]));
 const packet=(text:string)=>JSON.stringify({meta:{objectives:scene.objectives.map(()=>false),ended:false,stance:25,revealed:false},utterances:[{characterId:'michael',text}]});
 const bad=packet('客户点名要整份方案重做，你不在谁顶？');
 assert.equal(output.preview(bad),'');assert.throws(()=>output.complete(bad),RoleplayFactError);
 const valid=packet('明早九点要看方案，我还得把第三部分改完。你今晚不在，准备怎么安排？');
 assert.ok(output.complete(valid).includes('你今晚不在，准备怎么安排？'));
});

test('an unconfirmed teammate schedule cannot become a handoff arrangement',()=>{
 const guard=roleplaySpeechGuard('declining-extra-hours',[]);
 assert.ok(guard);
 for(const text of ['Lily 今天加班到七点，她明早能看剩下的。','Lily is available tomorrow and will handle the rest.',"This is the third night running the deck’s slipped.",'剩下的是他们下周才审的。'])assert.ok(guard([{characterId:'michael',text}]),text);
 for(const text of ['我先问 Lily 明早有没有空，不能直接把交付算到她头上。','Lily 今天加班到七点吗？','I can ask Lily whether she is available tomorrow.','Lily is new; I will not hand her a client deliverable blind.'])assert.equal(guard([{characterId:'michael',text}]),undefined,text);
 const known=roleplaySpeechGuard('declining-extra-hours',[{id:'known',role:'learner',text:'我刚确认，Lily 今天加班到七点。',ts:1}]);
 assert.equal(known?.([{characterId:'michael',text:'Lily 今天加班到七点。'}]),undefined);
});
