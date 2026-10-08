import {useEffect,useRef,useState} from 'react';
import type {Message} from './engine';
import {castAppearance} from './cast';
import {createPlayback,nextBeat,spokenBeats,stepPlayback,type Playback} from './playback';
import {setDialogueReading} from './sound';
import {playNpcLine} from '@/lib/speech';
import type {SpeechHandle} from '@/lib/speech-playback';
import {useApp} from '@/store/useApp';
import {useByok} from '@/lib/byok';

/** Optional browser narration and visual turn-taking share one sequence. */
export function useDinnerPlayback(message:Message|undefined,readAloud:boolean,paused:boolean,microphone:boolean){
 const beats=spokenBeats(message),key=JSON.stringify(beats);
 const voiceEngine=useApp(s=>s.settings.voiceEngine),ownModel=useByok(s=>s.enabled);
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
  const state=!readAloud&&carry.current?.key===key?carry.current.state:createPlayback(JSON.parse(key));
  let disposed=false,frame=0,previous=0,audio=false,audioElapsed=0,audioStarted=false,owned:SpeechHandle|undefined,last='';
  const publish=()=>{
   const stamp=`${state.index}/${state.finished}`;
   if(!disposed&&stamp!==last){last=stamp;setVisible({key,index:state.index,finished:state.finished});}
  };
  const cancel=()=>{const handle=owned;owned=undefined;handle?.cancel();setDialogueReading(false);};
  const silence=()=>{audio=false;cancel();state.finished=true;publish();};
  const pause=()=>owned?.pause(controls.current.paused||document.hidden);
  const speak=()=>{
   if(!readAloud||state.finished||controls.current.microphone)return;
   const beat=state.beats[state.index],index=state.index;
   const language=/\p{Script=Han}/u.test(beat.text)?'zh':'en',appearance=castAppearance(beat.speakerId);
   audioElapsed=0;audioStarted=false;audio=true;
   const handle=playNpcLine(beat.text,language,appearance,()=>{if(!disposed&&state.index===index&&audio){audioStarted=true;setDialogueReading(true);}});
   owned=handle;pause();
   void handle.done.then(()=>{
    if(disposed||owned!==handle||state.index!==index||!audio)return;
    owned=undefined;setDialogueReading(false);
    if(!audioStarted){audio=false;return;}
    nextBeat(state);publish();speak();
   });
  };
  session.current={state,silence,pause};document.addEventListener('visibilitychange',pause);speak();
  const tick=(now:number)=>{
   if(disposed)return;const dt=previous?(now-previous)/1000:0;previous=now;
   const blocked=controls.current.paused||controls.current.microphone||document.hidden;
   if(audio&&!blocked){audioElapsed+=Math.min(.05,Math.max(0,dt));if(audioElapsed>(audioStarted?45:8)){audio=false;cancel();}}
   if(!audio)stepPlayback(state,dt,blocked);
   publish();frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>{carry.current={key,state};disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',pause);audio=false;cancel();session.current=null;};
 },[key,readAloud,voiceEngine,ownModel]);
 const current=visible.key===key?visible:{key,index:0,finished:!beats.length};
 return {beat:beats[current.index],index:current.index,speaking:!current.finished&&!paused&&!microphone};
}
