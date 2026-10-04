import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SaveSchema,opening} from '../../src/features/dinner/lib/engine';
import {scenarios} from '../../src/features/dinner/lib/content';
import {dinnerPrompt} from '../../src/features/dinner/lib/director';
import {dinnerReviewContent} from '../../src/features/dinner/lib/review';
import {storyScenario,variantFor} from '../../src/features/dinner/lib/story';

test('new office practices carry the same usable project facts into generation and review',()=>{
 const scene=scenarios.find(s=>s.id==='office')!;
 const save=SaveSchema.parse({version:1,briefVersion:1,scenarioId:'office',variantId:'office-interruption',maxTurns:12,messages:[opening(scene,'zh','office-interruption'),{role:'user',text:'我想先讲清方案的风险。'},{role:'npc',speakerId:'he',text:'你说，具体是什么风险？'}],started:true,complete:false,lang:'zh',draft:''});
 assert.equal(save.briefVersion,1);
 const prompt=dinnerPrompt({scenarioId:'office',variantId:'office-interruption',briefVersion:save.briefVersion,maxTurns:12,lang:'zh',text:'先试用再推广。',history:save.messages});
 const review=dinnerReviewContent(save);
 assert.ok(prompt.includes('客服工单'));
 assert.ok(review.scenario.background.zh.includes('客服工单'));
 assert.ok(review.scenario.characters[0].role.zh.includes('方案'));
 assert.ok(review.scenario.background.zh.includes('何主管没有作决定'));
 assert.ok(review.scenario.background.en.includes('He has made no decision'));
});

test('older saved practices do not acquire a new fictional project halfway through',()=>{
 const scene=scenarios.find(s=>s.id==='office')!;
 const save=SaveSchema.parse({version:1,scenarioId:'office',variantId:'office-interruption',messages:[opening(scene,'zh','office-interruption')],started:false,complete:false,lang:'zh',draft:''});
 assert.equal(save.briefVersion,undefined);
 const review=dinnerReviewContent(save);
 assert.ok(!review.scenario.background.zh.includes('客服工单'));
});

test('public cast descriptions stay inside their own opening rather than leaking another scene',()=>{
 const office=storyScenario(scenarios.find(s=>s.id==='office')!,variantFor('office','office-interruption'));
 assert.ok(!office.characters.some(c=>/今晚|tonight|send the material/.test(c.description.zh+' '+c.description.en)));
 const privacy=storyScenario(scenarios.find(s=>s.id==='elevator')!,variantFor('elevator','elevator-privacy'));
 assert.ok(!privacy.characters.some(c=>/演示交接|demo handoff/.test(c.description.zh+' '+c.description.en)));
 const blame=storyScenario(scenarios.find(s=>s.id==='elevator')!,variantFor('elevator','elevator-blame'));
 assert.ok(blame.characters[0].description.zh.includes('账号'));
 const prompt=dinnerPrompt({scenarioId:'office',variantId:'office-interruption',briefVersion:1,maxTurns:12,lang:'en',text:'May I finish?',history:[opening(office,'en','office-interruption')]});
 for(const character of office.characters)assert.ok(prompt.includes(character.description.en),`Generation must share ${character.id}'s public role with the UI`);
});
