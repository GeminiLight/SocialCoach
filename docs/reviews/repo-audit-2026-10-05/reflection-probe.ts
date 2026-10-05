// Isolated browser, synthetic records and intercepted model/telemetry requests.
import {execFileSync} from 'node:child_process';
import {SCENARIOS} from '../../../app/src/data/corpus';
import {buildSession} from '../../../app/src/lib/session-utils';
const name=`socialcoach-review-reflection-${process.pid}`;
const browser=(args:string[],input?:string)=>{const r=JSON.parse(execFileSync('agent-browser',['--session',name,'--json',...args],{input,encoding:'utf8',timeout:45000}));if(!r.success)throw Error(JSON.stringify(r.error));return r.data;};
const evaluate=(code:string)=>browser(['eval','--stdin'],code).result;
const wait=(code:string)=>browser(['wait','--fn',code]);
const scene=SCENARIOS.find(s=>s.skills.includes('communication'))!;
const question='你当时如何理解对方？',oldAnswer='我以为他只是随口问问。',newAnswer='我意识到这会影响我的周末安排。';
const message='我现在不能答应，需要先确认自己的安排。';
const report={scoringVersion:2,ratings:[{skill:'communication',level:1,evidence:message,reason:'表达仍需澄清'}],stars:1,outcome:'partial',verdictEvidence:message,verdict:'先保留决定',summary:'你先核实安排。',strengths:[],weaknesses:[],alternatives:[],knowledge:{theoryIds:[],caseIds:[],whyThis:''},reflectionQuestions:[question],nextStep:'明确安排。',deltas:{}};
const practice={...buildSession(scene,'arena','zh'),id:'review-reflection',status:'assessed',revealSeen:true,messages:[{id:'l',role:'learner',text:message,ts:0}],report,reflections:[{question,answer:oldAnswer}]};
const state={profile:{name:'Audit Fixture',bio:'',goals:['communication'],contexts:[],lang:'zh',createdAt:1},sessions:[practice],proficiency:{communication:2.5},customScenarios:[],bookmarks:[],practiceDays:[],settings:{tts:false,telemetry:false,theme:'light'},todaySessionId:null,todayDate:null,patternInsight:null};
try{
 browser(['open','about:blank']);
 browser(['network','route','**/api/health*','--body','{"state":"available","serverKey":true,"requireByok":false}']);
 browser(['network','route','**/api/track','--body','{}']);
 browser(['network','route','**/api/feedback','--body','{"available":false}']);
 browser(['network','route','**/api/reflect','--body','你意识到了周末安排，这能帮助你把自己的边界说清楚。']);
 browser(['open','http://localhost:3101/onboarding']);wait("document.querySelector('h1')!==null");
 evaluate(`localStorage.setItem('socialcoach.v1',${JSON.stringify(JSON.stringify({state,version:0}))});true`);
 browser(['open','http://localhost:3101/practice/review-reflection']);
 wait(`document.querySelector('textarea[aria-label="${question}"]')!==null`);
 browser(['fill',`textarea[aria-label="${question}"]`,newAnswer]);
 evaluate(`document.querySelector('textarea[aria-label="${question}"]').parentElement.querySelector('button').click();true`);
 wait("JSON.parse(localStorage.getItem('socialcoach.v1')).state.sessions[0].reflections[0].coachReply!==undefined");
 const reflection=evaluate("JSON.parse(localStorage.getItem('socialcoach.v1')).state.sessions[0].reflections[0]");
 console.log(JSON.stringify({reflection,newAnswer,oldAnswer,savedAnswerMatchesSubmitted:reflection.answer===newAnswer}));
 browser(['screenshot',process.env.REVIEW_SCREENSHOT??'/tmp/socialcoach-review-reflection.png','--full']);
}finally{browser(['close']);}
