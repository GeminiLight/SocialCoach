/** Real-model debriefs for text-play replays.
 *  npx tsx scripts/eval-replay-debriefs.ts --replay /tmp/socialcoach-text-play/replay.json --output /tmp/socialcoach-debriefs [--case id[,id]]
 *  Rebuilds each recorded conversation, runs the production assessment (including its own verification),
 *  and flags any learner quote in the report that the learner never said. Read the reports as well: a quote
 *  check is not a semantic review. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {scenarioById} from '../src/data/corpus';
import {hasServerCredential,serverLLM,SMART_MODEL} from '../src/lib/llm';
import {runAssess} from '../src/lib/tasks/assess';
import {hasQuote} from '../src/lib/practice-policy';
import type {ChatMessage,Report} from '../src/lib/types';
import type {Lang} from '../src/data/taxonomy';

type ReplayRecord={label:string;id:string;route:string;lang:Lang;turn:number;learner:string;npc?:{characterId:string;text:string}[];error?:string};
const arg=(name:string)=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:undefined;};

/** Every field in a report that claims to be the learner's own words. */
function learnerQuotes(r:Report){
 return [
  ['verdictEvidence',r.verdictEvidence],
  ...(r.ratings??[]).map(x=>['rating',x.evidence] as const),
  ...r.strengths.map(x=>['strength',x.evidence] as const),
  ...r.weaknesses.map(x=>['weakness',x.evidence] as const),
  ...r.alternatives.map(x=>['alternative',x.original] as const),
  ...(r.objectiveResults??[]).filter(x=>x.status==='met').map(x=>['objective',x.evidence] as const),
 ].filter(([,q])=>typeof q==='string'&&q.trim()) as [string,string][];
}

async function main(){
 assert(hasServerCredential(),'No model credential configured');
 const replay=arg('--replay'),out=arg('--output'),only=arg('--case')?.split(',');
 assert(replay&&out,'--replay and --output are required');
 await mkdir(out,{recursive:true});
 const records=(JSON.parse(await readFile(replay,'utf8')).records as ReplayRecord[]).filter(r=>r.label==='current'&&!r.error&&(!only||only.includes(r.id)));
 const paths=[...new Map(records.map(r=>[`${r.id}:${r.lang}:${r.route}`,r])).keys()];
 assert(paths.length,'No replayed conversations found');
 const results:unknown[]=[];let next=0;
 await Promise.all(Array.from({length:3},async()=>{for(;;){
  const key=paths[next++];if(!key)return;
  const [id,lang,route]=key.split(':') as [string,Lang,string];
  const scenario=scenarioById(id)!,turns=records.filter(r=>`${r.id}:${r.lang}:${r.route}`===key).sort((a,b)=>a.turn-b.turn);
  const messages:ChatMessage[]=[{id:'opening',role:'npc',characterId:scenario.opening.characterId,text:scenario.opening.text[lang],ts:0}];
  turns.forEach((t,i)=>{messages.push({id:'u'+i,role:'learner',text:t.learner,ts:i*2+1});(t.npc??[]).forEach((u,n)=>messages.push({id:`n${i}-${n}`,role:'npc',characterId:u.characterId,text:u.text,ts:i*2+2}));});
  const learnerWords=messages.filter(m=>m.role==='learner').map(m=>m.text),start=Date.now();
  try{
   const report=await runAssess({scenario,learnerCharacterId:'you',messages,goals:scenario.skills,lang},serverLLM,SMART_MODEL);
   const unquoted=learnerQuotes(report).filter(([,q])=>!hasQuote(q,learnerWords));
   const value={id,lang,route,ms:Date.now()-start,outcome:report.outcome,stars:report.stars,unquoted,report};
   results.push(value);console.log(`${key} ${value.ms}ms outcome=${report.outcome} stars=${report.stars} unquoted=${unquoted.length}`);
  }catch(error){results.push({id,lang,route,error:String(error)});console.log(`${key} ERROR ${String(error)}`);}
 }}));
 await writeFile(join(out,'debriefs.json'),JSON.stringify(results,null,2)+'\n');
 const bad=results.filter(r=>'error' in (r as object)||((r as {unquoted:unknown[]}).unquoted?.length));
 console.log(JSON.stringify({debriefs:results.length,problems:bad.length}));if(bad.length)process.exitCode=1;
}
void main();
