/** Display-only timing. Never changes dialogue, world attention, or saved state. */
export type Presence = { time:number; elapsed:number; cue:string; duration:number };
export function createPresence(id=''):Presence {const phase=[...id].reduce((n,c)=>n*31+c.charCodeAt(0),0)>>>0;return {time:id?(phase%490)/100:0,elapsed:0,cue:'',duration:0};}
const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
/** An ordinary spoken toast rests again; only explicit physical moments own longer holds. */
export const conversationalRaise=(elapsed:number)=>smooth(elapsed/.6)*(1-smooth((elapsed-5.5)/1.2));
export function advancePresence(state:Presence,{dt,line,speakerId,paused=false}:{dt:number;line:string;speakerId:string;paused?:boolean}) {
  const cue=`${speakerId}\u0000${line}`;
  if(cue!==state.cue){state.cue=cue;state.elapsed=0;state.duration=line.trim()?Math.min(7,Math.max(2,line.length*.075)):0;}
  if(!paused){const step=Math.min(.05,Math.max(0,dt));state.time+=step;state.elapsed+=step;}
  return state;
}
export function presencePose(state:Presence,{index,active,reduced=false,event=false,playback=false}:{index:number;active:boolean;reduced?:boolean;event?:boolean;playback?:boolean}) {
  if(reduced)return {breath:0,speech:0,emphasis:0,nod:0,blink:1,speakerAttention:0,tableAttention:0};
  const e=state.elapsed,d=state.duration;
  const envelope=smooth(e/.25)*(playback&&active?1:1-smooth((e-d+.55)/.55));
  const phrase=.5+.5*Math.sin(e*2.15-.8);
  const speech=active&&d>0?envelope*Math.max(0,Math.sin(e*10.7))*(.35+.65*phrase):0;
  // A single acknowledgement per utterance, offset between listeners; never random scanning.
  const start=.28+index*.16,returnAt=Math.min(2.4,d*.58);
  const speakerAttention=!active&&index>0&&!event&&d>0?smooth((e-start)/.42)*(1-smooth((e-returnAt)/.65)):0;
  // One small look toward the listener's own place after the line, then return.
  const restAt=d+.7+index*.35;
  const tableAttention=!active&&index>0&&!event&&d>0?smooth((e-restAt)/.7)*(1-smooth((e-restAt-1.3)/.8))*.7:0;
  const phase=(state.time+1.3+index*1.19)%(4.9+index*.43);
  const blink=phase<.19?1-.94*Math.sin(Math.PI*phase/.19):1;
  // A requested nod belongs to a listener too. Offset listeners slightly,
  // finish once per line, and let explicit physical moments own their pose.
  const nodProgress=Math.max(0,Math.min(1,(e-(active?0:.2+index*.12))/1.25));
  const nod=!event&&nodProgress>0&&nodProgress<1?Math.sin(Math.PI*nodProgress)**2*.045:0;
  return {breath:Math.sin(state.time*(1.25-index*.07)+index*.91)*.0025,speech,emphasis:active?Math.sin(Math.min(1,e/1.8)*Math.PI)*envelope:0,nod,blink,speakerAttention,tableAttention};
}
