import {useEffect,useRef,useState} from 'react';
import type {Message} from './engine';
import {castAppearance} from './cast';
import {createPlayback,nextBeat,spokenBeats,stepPlayback,type Playback} from './playback';
import {setDialogueReading} from './sound';

/** Optional browser narration and visual turn-taking share one sequence. */
export function useDinnerPlayback(message:Message|undefined,readAloud:boolean,paused:boolean,microphone:boolean){
 const beats=spokenBeats(message),key=JSON.stringify(beats);
 const [visible,setVisible]=useState({key,index:0,finished:!beats.length});
 const controls=useRef({paused,microphone});
 const session=useRef<{state:Playback;silence:()=>void;pause:()=>void}|null>(null);
 const carry=useRef<{key:string;state:Playback}|null>(null);
 useEffect(()=>{
  controls.current={paused,microphone};session.current?.pause();
  if(microphone)session.current?.silence();
 },[paused,microphone]);
 useEffect(()=>{
  // Muting keeps the current place instead of restarting an old line and its gestures.
  const state=!readAloud&&carry.current?.key===key?carry.current.state:createPlayback(JSON.parse(key)),synth=typeof speechSynthesis==='undefined'||typeof SpeechSynthesisUtterance==='undefined'?null:speechSynthesis;
  let disposed=false,frame=0,previous=0,audio=false,owned=false,audioElapsed=0,audioStarted=false,utterance:SpeechSynthesisUtterance|null=null,last='';
  const publish=()=>{
   const stamp=`${state.index}/${state.finished}`;
   if(!disposed&&stamp!==last){last=stamp;setVisible({key,index:state.index,finished:state.finished});}
  };
  const cancel=()=>{if(owned){owned=false;synth?.cancel();}utterance=null;setDialogueReading(false);};
  const silence=()=>{audio=false;cancel();state.finished=true;publish();};
  const pause=()=>{if(owned){if(controls.current.paused||document.hidden)synth?.pause();else synth?.resume();}};
  const speak=()=>{
   if(!synth||!readAloud||state.finished||controls.current.microphone)return;
   const beat=state.beats[state.index],index=state.index;
   const language=/\p{Script=Han}/u.test(beat.text)?'zh':'en',appearance=castAppearance(beat.speakerId);
   const voices=synth.getVoices().filter(v=>v.lang.toLowerCase().startsWith(language));
   const local=voices.filter(v=>v.localService),candidates=local.length?local:voices;
   utterance=new SpeechSynthesisUtterance(beat.text);utterance.lang=language==='zh'?'zh-CN':'en-US';
   const seed=[...beat.speakerId].reduce((n,c)=>n+c.charCodeAt(0),0);
   if(candidates.length)utterance.voice=candidates[seed%candidates.length];
   utterance.rate=appearance.age==='mature'?.96:1.02;utterance.pitch=appearance.feminine?1.04:appearance.age==='mature'?.94:1;utterance.volume=.95;
   audioElapsed=0;audioStarted=false;
   utterance.onstart=()=>{if(!disposed&&state.index===index&&audio){audioStarted=true;setDialogueReading(true);}};
   utterance.onend=()=>{if(disposed||state.index!==index||!audio)return;owned=false;setDialogueReading(false);nextBeat(state);publish();speak();};
   utterance.onerror=()=>{if(disposed||state.index!==index||!audio)return;audio=false;owned=false;utterance=null;setDialogueReading(false);};
   audio=true;owned=true;synth.speak(utterance);pause();
  };
  session.current={state,silence,pause};document.addEventListener('visibilitychange',pause);speak();
  const tick=(now:number)=>{
   if(disposed)return;const dt=previous?(now-previous)/1000:0;previous=now;
   const blocked=controls.current.paused||controls.current.microphone||document.hidden;
   if(audio&&!blocked){audioElapsed+=Math.min(.05,Math.max(0,dt));if(audioElapsed>(audioStarted?45:4)){audio=false;cancel();}}
   if(!audio)stepPlayback(state,dt,blocked);
   publish();frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>{carry.current={key,state};disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',pause);audio=false;cancel();session.current=null;};
 },[key,readAloud]);
 const current=visible.key===key?visible:{key,index:0,finished:!beats.length};
 return {beat:beats[current.index],index:current.index,speaking:!current.finished&&!paused&&!microphone};
}
