import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDinnerInput} from '../../src/features/dinner/lib/director';
import {opening} from '../../src/features/dinner/lib/engine';
import {scenarios} from '../../src/features/dinner/lib/content';
import {captureDinnerContent} from '../../src/features/dinner/lib/review';

const scene=scenarios.find(s=>s.id==='family')!;
const input=(contentSnapshot:unknown)=>({scenarioId:'family',variantId:'family-introduction',contentSnapshot,maxTurns:12,lang:'en',text:'What bothers you?',history:[opening(scene,'en','family-introduction')]});

test('a frozen 3D snapshot is accepted only in the shape of its own scene',()=>{
 const content=captureDinnerContent('family','family-introduction',12,1);
 assert.doesNotThrow(()=>parseDinnerInput(input(content)),'the real snapshot of an older practice still plays');
 const recast=structuredClone(content);recast.direction.cast[0].id='intruder';
 assert.throws(()=>parseDinnerInput(input(recast)),'the cast cannot be replaced');
 const prompt=structuredClone(content);prompt.direction.setup.en='x'.repeat(5000);
 assert.throws(()=>parseDinnerInput(input(prompt)),/snapshot/,'a snapshot cannot carry an arbitrary long prompt');
 const facts=structuredClone(content);facts.direction.facts.en=Array.from({length:40},(_,i)=>`fact ${i}`);
 assert.throws(()=>parseDinnerInput(input(facts)),/snapshot/);
});
