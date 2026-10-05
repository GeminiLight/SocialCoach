import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advancePresence,createPresence,presencePose} from '../../src/features/dinner/lib/presence';
const cue={line:'We should discuss the delivery date before agreeing.',speakerId:'lin'};
test('presence freezes while paused and resumes without a wall-clock jump',()=>{
 const state=createPresence();advancePresence(state,{...cue,dt:.05});const before={...state};
 for(let i=0;i<500;i++)advancePresence(state,{...cue,dt:1,paused:true});assert.deepEqual(state,before);
 advancePresence(state,{...cue,dt:20});assert.equal(state.elapsed,before.elapsed+.05);
});
test('speech and listener glance finish once per line; new speaker retriggers the cue',()=>{
 const state=createPresence();advancePresence(state,{...cue,dt:0});
 state.elapsed=1;assert.ok(presencePose(state,{index:1,active:false}).speakerAttention>.8);
 state.elapsed=20;assert.equal(presencePose(state,{index:1,active:false}).speakerAttention,0);assert.equal(presencePose(state,{index:1,active:true}).speech,0);
 advancePresence(state,{...cue,dt:0});assert.equal(state.elapsed,20);
 advancePresence(state,{...cue,speakerId:'zhou',dt:0});assert.equal(state.elapsed,0);
});
test('lead pressure, event gaze, and reduced motion take precedence over listener glances',()=>{
 const state=createPresence();advancePresence(state,{...cue,dt:0});state.elapsed=1;
 assert.equal(presencePose(state,{index:0,active:false}).speakerAttention,0);
 assert.equal(presencePose(state,{index:2,active:false,event:true}).speakerAttention,0);
 assert.deepEqual(presencePose(state,{index:1,active:true,reduced:true}),{breath:0,speech:0,emphasis:0,nod:0,blink:1,speakerAttention:0,tableAttention:0});
});
test('brief downward listener attention ends and never overrides active speech or a dinner event',()=>{
 const state=createPresence();advancePresence(state,{...cue,dt:0});state.elapsed=state.duration+2;
 assert.ok(presencePose(state,{index:1,active:false}).tableAttention>.5);
 for(const options of [{index:0,active:false},{index:1,active:true},{index:1,active:false,event:true},{index:1,active:false,reduced:true}])assert.equal(presencePose(state,options).tableAttention,0);
 state.elapsed=30;assert.equal(presencePose(state,{index:1,active:false}).tableAttention,0);
});

test('a listening acknowledgment nods once, stays finite and yields to reduced motion or physical events',()=>{
 const state=createPresence();advancePresence(state,{...cue,dt:0});
 state.elapsed=.95;
 const options={index:1,active:false};
 const nod=(state:Parameters<typeof presencePose>[0],opts:Parameters<typeof presencePose>[1])=>(presencePose(state,opts) as ReturnType<typeof presencePose>&{nod?:number}).nod;
 assert.ok((nod(state,options)??0)>.025);
 assert.equal(nod(state,{...options,reduced:true}),0);assert.equal(nod(state,{...options,event:true}),0);
 state.elapsed=5;assert.equal(nod(state,options),0);
 assert.deepEqual(state.cue,`${cue.speakerId}\u0000${cue.line}`);
});
