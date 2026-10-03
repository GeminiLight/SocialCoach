import type {Message} from './engine';
export type SpokenBeat={speakerId:string;text:string};
export type Playback={beats:SpokenBeat[];index:number;elapsed:number;finished:boolean};
export function spokenBeats(message?:Message):SpokenBeat[]{
 if(!message?.speakerId||message.role!=='npc')return [];
 return [{speakerId:message.speakerId,text:message.text},...(message.interjection?[message.interjection]:[])];
}
export function speechDuration(text:string){
 const count=/\p{Script=Han}/u.test(text)?[...text].length:text.trim().split(/\s+/u).length*2.4;
 return Math.max(1.8,Math.min(22,count*.18));
}
export const createPlayback=(beats:SpokenBeat[]):Playback=>({beats,index:0,elapsed:0,finished:!beats.length});
export function nextBeat(p:Playback){if(p.finished)return;if(p.index+1<p.beats.length){p.index++;p.elapsed=0;}else p.finished=true;}
/** A silent playback is still finite and pausable. No choices or transcript writes. */
export function stepPlayback(p:Playback,dt:number,paused=false){
 if(paused||p.finished)return;
 p.elapsed+=Math.min(.05,Math.max(0,dt));
 if(p.elapsed>=speechDuration(p.beats[p.index].text))nextBeat(p);
}
