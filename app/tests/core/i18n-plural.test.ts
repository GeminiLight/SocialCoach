import assert from 'node:assert/strict';
import {test} from 'node:test';
import {t} from '../../src/lib/i18n';

test('English counts use the singular for one and the plural otherwise (#69)',()=>{
  assert.equal(t('en','pr_turn_progress',{n:1}),'1 turn · finish when ready');
  assert.equal(t('en','pr_turn_progress',{n:2}),'2 turns · finish when ready');
  assert.equal(t('en','pr_turn_progress',{n:0}),'0 turns · finish when ready');
  assert.equal(t('en','pr_segment_budget',{n:12}),'Start with 12 turns · extend anytime');
  assert.equal(t('en','pr_turns_left',{n:1}),'1 turn left');
  assert.equal(t('en','arena_results',{n:1}),'1 scenario');
  assert.equal(t('en','pr_clock_lapsed',{n:1}),'You were silent for 1 second.');
  assert.equal(t('en','pg_footprint_total',{n:1}),'1 day total');
  assert.equal(t('en','ln_results',{n:1}),'1 item to explore');
  assert.equal(t('en','ln_steps',{n:3}),'3 steps');
});

test('Chinese copy is unchanged and plural tokens never leak',()=>{
  assert.equal(t('zh','pr_turn_progress',{n:1}),'已聊 1 回合 · 随时可收尾');
  assert.equal(t('zh','ln_steps',{n:1}),'1 步做法');
  for(const n of [0,1,2,12])for(const lang of ['zh','en'] as const)for(const key of ['pr_turn_progress','pr_segment_budget','pr_turns_left','arena_results','pr_clock_lapsed','pg_footprint_total','ln_results','ln_steps'] as const)
    assert.doesNotMatch(t(lang,key,{n}),/[{}|]/,`${lang} ${key} ${n}`);
});
