import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildRehearsalDescription,readRehearsalDraft,RehearsalDescriptionSchema,MAX_REHEARSAL_CHARS} from '../../src/lib/rehearsal-input';

test('optional fields supplement a short free description without inventing omitted facts',()=>{
 const draft={text:'明天谈排期。',fields:{who:'我是项目负责人，对方是客户。',aim:'商量试点范围',boundary:'我不能替测试承诺日期'}};
 const text=buildRehearsalDescription(draft,'zh');
 assert.ok(text.includes(draft.text));assert.ok(text.includes(draft.fields.boundary));
 assert.ok(text.includes('我想达成'));assert.ok(!text.includes('已知事实'));assert.ok(!text.includes('已通过'));
 assert.ok(buildRehearsalDescription(draft,'en').includes('My boundaries'));
});
test('legacy drafts restore and malformed drafts do not overwrite their only usable text',()=>{
 assert.deepEqual(readRehearsalDraft(null,'old usable text'),{text:'old usable text',fields:{}});
 assert.deepEqual(readRehearsalDraft('{invalid','old usable text'),{text:'old usable text',fields:{}});
 assert.deepEqual(readRehearsalDraft(JSON.stringify({text:'new',fields:{who:'a',unknown:'ignore'}})),{text:'new',fields:{who:'a'}});
});
test('the same context length boundary applies to server and browser task inputs',()=>{
 assert.ok(RehearsalDescriptionSchema.safeParse('a'.repeat(MAX_REHEARSAL_CHARS)).success);
 assert.equal(RehearsalDescriptionSchema.safeParse('a'.repeat(MAX_REHEARSAL_CHARS+1)).success,false);
 assert.equal(RehearsalDescriptionSchema.safeParse('       ').success,false);
 assert.equal(RehearsalDescriptionSchema.safeParse({text:'text'}).success,false);
});
