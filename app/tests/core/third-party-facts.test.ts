import assert from 'node:assert/strict';
import {test} from 'node:test';
import {roleplaySpeechGuard} from '../../src/lib/roleplay-facts';

test('an unconfirmed teammate schedule cannot become a handoff arrangement',()=>{
 const guard=roleplaySpeechGuard('declining-extra-hours',[]);
 assert.ok(guard);
 for(const text of ['Lily 今天加班到七点，她明早能看剩下的。','Lily is available tomorrow and will handle the rest.',"This is the third night running the deck’s slipped.",'剩下的是他们下周才审的。'])assert.ok(guard([{characterId:'michael',text}]),text);
 for(const text of ['我先问 Lily 明早有没有空，不能直接把交付算到她头上。','Lily 今天加班到七点吗？','I can ask Lily whether she is available tomorrow.','Lily is new; I will not hand her a client deliverable blind.'])assert.equal(guard([{characterId:'michael',text}]),undefined,text);
 const known=roleplaySpeechGuard('declining-extra-hours',[{id:'known',role:'learner',text:'我刚确认，Lily 今天加班到七点。',ts:1}]);
 assert.equal(known?.([{characterId:'michael',text:'Lily 今天加班到七点。'}]),undefined);
});
