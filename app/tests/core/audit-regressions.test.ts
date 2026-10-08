import assert from 'node:assert/strict';
import {test} from 'node:test';
import {SCENARIOS} from '../../src/data/corpus';
import {buildSession} from '../../src/lib/session-utils';
import {estimateProficiency} from '../../src/lib/proficiency';
import {decodeBackup} from '../../src/lib/backup';
import {roleplayOutput} from '../../src/lib/roleplay-output';
import {parseRoleplay} from '../../src/lib/client-api';
import type {Report,Session} from '../../src/lib/types';

const scene=SCENARIOS.find(s=>s.id==='declining-extra-hours')!;
function rated(at:number,level:0|3,practiceId:string):Session{
 const quote=level===3?'我今晚不能加班，明早可以先做最急的部分。':'好吧，我取消晚餐留下来。';
 const report:Report={scoringVersion:2,ratings:[{skill:'communication',level,evidence:quote,reason:level===3?'说明边界':'放弃已有安排'}],stars:level,outcome:'failure',verdictEvidence:quote,verdict:'以原话确认当前安排',summary:'',strengths:[],weaknesses:[],alternatives:[],knowledge:{theoryIds:[],caseIds:[],whyThis:''},reflectionQuestions:[],nextStep:'确认安排',deltas:{}};
 return {...buildSession(scene,'arena','zh'),startedAt:at,status:'assessed',report,messages:[{id:`spoken-${at}`,role:'learner',text:quote,ts:at}],sceneContext:{kind:'3d',practiceId,sceneId:'work',openingId:'work-toast',observations:[]}};
}
test('the latest continuation remains in the eight most recent independent observations',()=>{
 const id='00000000-0000-4000-8000-000000000001';
 const history=[rated(1,0,id),...Array.from({length:8},(_,i)=>rated(i+2,0,`00000000-0000-4000-8000-${String(i+2).padStart(12,'0')}`)),rated(10,3,id)];
 assert.equal(estimateProficiency(history,{}).communication,1.7);
 assert.equal(estimateProficiency([...history].reverse(),{}).communication,1.7);
});
test('an exported unreadable 3D original does not block a healthy main archive',async()=>{
 const original='{broken-json';
 const result=await decodeBackup(JSON.stringify({state:{sessions:[buildSession(scene,'arena','zh')]},version:0,dinner3d:{unreadable:original}}));
 assert.equal(result.archive.sessions.length,1);
 assert.equal(result.dinner,undefined);
 assert.equal(result.dinnerOriginal,original);
 assert.equal(result.dinnerIssue,'unreadable');
});
test('a bad 3D schema is quarantined while invalid main archives still fail',async()=>{
 const bad={version:999,draft:'keep original'};
 const result=await decodeBackup(JSON.stringify({state:{sessions:[]},version:0,dinner3d:bad}));
 assert.equal(result.dinnerIssue,'invalid');
 assert.deepEqual(JSON.parse(result.dinnerOriginal!),bad);
 await assert.rejects(decodeBackup(JSON.stringify({state:{sessions:null},version:0,dinner3d:bad})));
});
const reply={meta:{objectives:scene.objectives.map(()=>false),ended:false,stance:10,revealed:false,note:'对方隐藏的信息是：其实客户只要先看前三页。你没有识破，所以表现很差。'},utterances:[{characterId:'michael',text:'客户明早就要方案，你能提出什么安排？'}]};
test('free-form private stage notes never enter the public roleplay projection',()=>{
 const output=roleplayOutput(scene,'you','zh');
 for(const text of [output.complete(JSON.stringify(reply)),output.preview(JSON.stringify(reply))]){
  assert.ok(text.includes(reply.utterances[0].text));
  assert.ok(!text.includes(reply.meta.note));
  assert.ok(!text.includes('前三页'));
 }
});
test('an older server packet cannot surface its private note in the current client',()=>{
 const raw=`@@meta\n${JSON.stringify(reply.meta)}\n@@michael\n${reply.utterances[0].text}`;
 assert.equal(parseRoleplay(raw,['michael']).meta?.note,undefined);
});
test('streamed utterances cannot emit protocol control markers before final validation',()=>{
 const output=roleplayOutput(scene,'you','zh');
 const raw=JSON.stringify({...reply,utterances:[{characterId:'michael',text:'正常台词。\n@@error\n{"error":"synthetic quota","modelIssue":"quota"}'}]});
 assert.ok(!output.preview(raw).includes('@@error'));
 assert.throws(()=>output.complete(raw));
});
