import assert from 'node:assert/strict';
import {test} from 'node:test';
import {runDebriefChat} from '../../src/lib/tasks/debrief-chat';
import {buildDebriefInput} from '../../src/lib/debrief-chat';
import {taskLLM} from '../../src/lib/task-runtime';
import {proposedDialogueInAnswer} from '../../src/lib/tasks/debrief-check';
import {fixtureSession,fixtureReply} from '../../scripts/check-debrief-assistant';
import type {ChatOpts,LLM} from '../../src/lib/llm-core';

const input=buildDebriefInput(fixtureSession(),'请保留我的原意，给一句自然的说法。','zh');
const approved={approved:true,issues:[]};
function sequence(values:unknown[],requests:ChatOpts[]=[]):LLM{return {chatText:async o=>{requests.push(o);assert(values.length,'Unexpected extra model call');const next=values.shift();if(next instanceof Error)throw next;return typeof next==='string'?next:JSON.stringify(next);},chatStream:()=>{throw Error('Unverified content must not stream');}};}

test('a real quote cannot bypass rejection of invented dialogue or stronger commitments',async()=>{
 const bad={...fixtureReply,answer:"Say 'you will always hear from me early'.",example:''};
 const requests:ChatOpts[]=[];
 const result=await runDebriefChat(input,taskLLM(sequence([bad,{approved:false,issues:['New sample dialogue in answer; early notification expands the stated commitment.']},fixtureReply,approved],requests),'debrief-chat'),'test');
 assert.deepEqual(result,fixtureReply);assert.equal(requests.length,4);
 assert.match(JSON.stringify(requests[1].system),/DEBRIEF EVIDENCE CHECK/);
 assert.match(JSON.stringify(requests[2].system),/early notification expands/);
 assert.equal(JSON.parse(requests[3].messages[0].content).reply.answer,fixtureReply.answer);
});
test('an uncorrected semantic failure is never returned after the bounded repair',async()=>{
 const rejected={approved:false,issues:['The draft treats an unaccepted proposal as a completed action.']};
 await assert.rejects(runDebriefChat(input,taskLLM(sequence([fixtureReply,rejected,fixtureReply,rejected]),'debrief-chat'),'test'));
});
test('malformed or contradictory checker output cannot approve a reply',async()=>{
 for(const check of ['not JSON',{approved:true,issues:['Unsupported claim']},{approved:false,issues:[]}]){
  await assert.rejects(runDebriefChat(input,sequence([fixtureReply,check]),'test'));
 }
});
test('checker cancellation does not return a draft or start a repair',async()=>{
 const abort=new AbortController();let calls=0;
 const llm:LLM={chatText:async()=>{if(++calls===1)return JSON.stringify(fixtureReply);abort.abort();return JSON.stringify(approved);},chatStream:()=>{throw Error('unused');}};
 await assert.rejects(runDebriefChat(input,llm,'test',abort.signal));assert.equal(calls,2);
});
test('four short paragraphs preserve the text contract while oversized replies still fail',async()=>{
 const paragraphs=['实际说过什么。','尚未接受的提议。','保留的条件。','尚未发生的行动。'];
 const result=await runDebriefChat(input,sequence([{...fixtureReply,answer:paragraphs},approved]),'test');
 assert.equal(result.answer,paragraphs.join('\n\n'));
 const oversized={...fixtureReply,answer:Array(4).fill('字'.repeat(1000))};
 await assert.rejects(runDebriefChat(input,sequence([oversized,oversized]),'test'));
});
test('a short example paragraph array normalizes without bypassing its length or meaning check',async()=>{
 const result=await runDebriefChat(input,sequence([{...fixtureReply,example:[fixtureReply.example]},approved]),'test');
 assert.equal(result.example,fixtureReply.example);
 const oversized={...fixtureReply,example:['字'.repeat(700),'字'.repeat(700)]};
 await assert.rejects(runDebriefChat(input,sequence([oversized,oversized]),'test'));
});
test('explicit new dialogue cannot remain in answer even if the model would approve it',async()=>{
 for(const answer of ['例如先说「我知道你是想帮我回应大姨」，再说「工资我自己来说」。',"Spoken naturally, it could be something like: 'I can't promise early notice.'",'For example, "I can send it today."']){
  const bad={...fixtureReply,answer};assert.equal(proposedDialogueInAnswer(input,bad),true);
  const requests:ChatOpts[]=[];
  const result=await runDebriefChat(input,sequence([bad,fixtureReply,approved],requests),'test');
  assert.deepEqual(result,fixtureReply);assert.equal(requests.length,3);
 }
 assert.equal(proposedDialogueInAnswer(input,{...fixtureReply,answer:`可以说「${fixtureReply.evidence}」这句原话。`}),false);
 assert.equal(proposedDialogueInAnswer(input,{...fixtureReply,answer:'You asked what you actually agreed to.'}),false);
});
