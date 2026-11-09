import assert from 'node:assert/strict';
import {test} from 'node:test';
import {tCount} from '../../src/lib/i18n';

const progress={one:'pr_turn_progress_one',other:'pr_turn_progress'} as const;
const budget={one:'pr_segment_budget_one',other:'pr_segment_budget'} as const;

test('a count of one reads singular in English',()=>{
 assert.equal(tCount('en',progress,1),'1 turn · finish when ready');
 assert.equal(tCount('en',progress,2),'2 turns · finish when ready');
});

test('zero takes the plural wording',()=>{
 assert.equal(tCount('en',budget,0),'Start with 0 turns · extend anytime');
 assert.equal(tCount('en',budget,1),'Start with 1 turn · extend anytime');
 assert.equal(tCount('en',budget,4),'Start with 4 turns · extend anytime');
});

test('Chinese reads the same either way',()=>{
 assert.equal(tCount('zh',progress,1),'已聊 1 回合 · 随时可收尾');
 assert.equal(tCount('zh',progress,2),'已聊 2 回合 · 随时可收尾');
	assert.equal(tCount('zh',budget,1),'先练 1 回合，可继续');
});
