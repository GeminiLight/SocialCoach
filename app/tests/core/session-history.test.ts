import assert from 'node:assert/strict';
import {test} from 'node:test';
import {SCENARIOS} from '../../src/data/corpus';
import {buildSession,historyFor} from '../../src/lib/session-utils';
import type {Session} from '../../src/lib/types';

const practiceId='0967cab7-f8f7-48a7-bddc-03a183de3b77';
function completed(at:number,sharedPractice?:string):Session{
 return {
  ...buildSession(SCENARIOS[0],'arena','zh'),
  id:`session-${at}`,startedAt:at,status:'ended',
  ...(sharedPractice?{sceneContext:{kind:'3d' as const,practiceId:sharedPractice,sceneId:'work',openingId:'work-toast',observations:[]}}:{}),
 };
}

test('a resumed practice is the newest scheduling history item',()=>{
 const original=completed(1,practiceId),intervening=completed(2),continued=completed(3,practiceId);
 continued.reflections=[{question:'接下来怎么做？',answer:'先确认双方的时间。'}];
 const history=historyFor([continued,intervening,original],'zh');
 assert.deepEqual(history.map(h=>h.sessionId),[intervening.id,continued.id]);
 assert.deepEqual(history.at(-1)?.reflections,continued.reflections);
});

test('the newest continuation survives the twelve-practice recommendation limit',()=>{
 const original=completed(1,practiceId),continued=completed(14,practiceId);
 const intervening=Array.from({length:12},(_,i)=>completed(i+2));
 const history=historyFor([continued,...intervening.reverse(),original],'zh');
 assert.deepEqual(history.map(h=>h.at),Array.from({length:12},(_,i)=>i+3));
 assert.equal(history.at(-1)?.sessionId,continued.id);
 assert.equal(history.filter(h=>h.practiceId===practiceId).length,1);
});

test('repeated snapshots do not displace independent practices from history',()=>{
 const independent=Array.from({length:12},(_,i)=>completed(i+1));
 const snapshots=Array.from({length:15},(_,i)=>completed(i+13,practiceId));
 const history=historyFor([...snapshots.reverse(),...independent.reverse()],'en');
 assert.deepEqual(history.map(h=>h.at),[2,3,4,5,6,7,8,9,10,11,12,27]);
 assert.equal(history.at(-1)?.title,SCENARIOS[0].title.en);
});

test('restored history is ordered by time without mutating stored sessions',()=>{
 const original=completed(1,practiceId),continued=completed(4,practiceId);
 const independent=completed(2),other=completed(3);
 const active={...completed(5,practiceId),status:'active' as const};
 const briefing={...completed(6),status:'briefing' as const};
 const sessions=[original,active,other,briefing,continued,independent];
 const before=JSON.stringify(sessions);
 Object.freeze(sessions);
 for(const input of [sessions,[...sessions].reverse()]){
  assert.deepEqual(historyFor(input,'zh').map(h=>h.sessionId),[independent.id,other.id,continued.id]);
 }
 assert.equal(JSON.stringify(sessions),before);
 assert.deepEqual(historyFor([active,briefing],'zh'),[]);
});
