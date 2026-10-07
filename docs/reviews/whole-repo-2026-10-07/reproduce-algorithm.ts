import {estimateProficiency} from '../../../app/src/lib/proficiency';
import {reservedTokens} from '../../../app/src/lib/shared-budget';
import type {Session} from '../../../app/src/lib/types';
const quoteFor=(level:number)=>level===3?'我今晚不能加班，明早可以先做最急的部分。':'好吧，我取消晚餐留下来。';
// Minimal function-boundary fixture: only estimateProficiency's input fields; not a wire-schema fixture.
const session=(id:string,at:number,practiceId:string,level:number)=>{const quote=quoteFor(level);return ({id,startedAt:at,sceneContext:{practiceId},scenario:{skills:['communication']},messages:[{role:'learner',text:quote}],report:{scoringVersion:2,ratings:[{skill:'communication',level,reason:level===3?'表达具体边界':'放弃自己明确的安排',evidence:quote}]}} as unknown as Session);};
const earlier=[session('A-old',1,'00000000-0000-4000-8000-000000000001',0),...Array.from({length:8},(_,i)=>session('other-'+i,i+2,'00000000-0000-4000-8000-'+String(i+2).padStart(12,'0'),0))];
const latest=session('A-new',10,'00000000-0000-4000-8000-000000000001',3);
console.log(JSON.stringify({case:'latest continuation among nine independent practices',actual:estimateProficiency([...earlier,latest],{}),expected_communication:1.7,latest_rating:3,old_ratings:0}));
console.log(JSON.stringify({case:'conservative reservation',zero_input_roleplay:reservedTokens({system:'',messages:[],maxTokens:1800}),eight_20kb_assessment_calls:8*reservedTokens({system:'x'.repeat(20000),messages:[],maxTokens:7000}),no_usage_refund:true}));
