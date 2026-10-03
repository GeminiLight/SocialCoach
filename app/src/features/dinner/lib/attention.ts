import type { Actor, World, ViewMode } from './room';
import { castEyeHeight } from './cast';

export const wrapAngle=(value:number)=>Math.atan2(Math.sin(value),Math.cos(value));
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export const eyeHeight=(actor:Actor)=>castEyeHeight(actor.id,actor.seated);
export const playerEyeHeight=(actor:Actor)=>actor.seated?2.58:2.98;
export function attentionSubject(world:World,speakerId=world.speakerId):Actor|undefined {
  if(world.attentionMode==='free')return;
  return world.npcs.find(n=>n.id===(world.attentionMode==='person'?world.lookTarget:speakerId));
}
export function bearing(from:{x:number;z:number},to:{x:number;z:number}) {
  return Math.atan2(to.x-from.x,to.z-from.z);
}
// Take the short turn across +/-pi, with a bounded turn speed and no frame-rate dependence.
export function turnToward(current:number,target:number,dt:number,reduced=false,rate=9,maxSpeed=4.2) {
  const delta=wrapAngle(target-current);
  const step=reduced?delta:clamp(delta*(1-Math.exp(-rate*Math.min(dt,.05))),-maxSpeed*dt,maxSpeed*dt);
  return wrapAngle(current+step);
}
export function trackAttention(world:World,dt:number,reduced=false) {
  const subject=attentionSubject(world);
  if(!subject)return;
  const p=world.player;
  const yaw=bearing(p,subject);
  const pitch=Math.atan2(eyeHeight(subject)-playerEyeHeight(p),Math.max(.01,Math.hypot(subject.x-p.x,subject.z-p.z)));
  world.viewYaw=turnToward(world.viewYaw,yaw,dt,reduced);
  world.viewPitch=reduced?pitch:world.viewPitch+(pitch-world.viewPitch)*(1-Math.exp(-10*Math.min(dt,.05)));
}
export function gazePose(actor:Actor,target:{x:number;z:number;eye:number},rootHeading=actor.heading) {
  const relative=wrapAngle(bearing(actor,target)-rootHeading);
  const torso=clamp(relative*.34,-.48,.48);
  const head=clamp(relative-torso,-1.08,1.08);
  const pitch=clamp(Math.atan2(eyeHeight(actor)-target.eye,Math.max(.1,Math.hypot(target.x-actor.x,target.z-actor.z))),-.28,.22);
  return {torso,head,pitch};
}
export function cameraPose(world:World,view:ViewMode,aspect:number) {
  const p=world.player,subject=attentionSubject(world),yaw=world.viewYaw,pitch=world.viewPitch;
  const forward={x:Math.sin(yaw),z:Math.cos(yaw)},right={x:-Math.cos(yaw),z:Math.sin(yaw)};
  const portrait=aspect<=1.25;
  const fov=view==='first'?(portrait?Math.min(p.seated?96:92,2*Math.atan(Math.tan(Math.PI*33/180)/aspect)*180/Math.PI):world.layout.kind==='dinner'?55:68):(portrait?2*Math.atan(Math.tan(Math.PI*19/180)/aspect)*180/Math.PI:50);
  if(view==='first') {
    const eye=playerEyeHeight(p);
    return {position:[p.x,eye,p.z],target:[p.x+forward.x*6,eye+Math.tan(pitch)*6,p.z+forward.z*6],fov};
  }
  const d=portrait?6.2:5.2,shoulder=portrait?3.3:2.8;
  const position=[p.x-forward.x*d+right.x*shoulder,p.seated?4.5:5.3,p.z-forward.z*d+right.z*shoulder];
  // Frame the person and the player together; the shoulder offset keeps one face from hiding the other.
  const target=subject?[p.x+(subject.x-p.x)*.56,1.85+(eyeHeight(subject)-1.85)*.56,p.z+(subject.z-p.z)*.56]:[p.x+forward.x*2.6,2.1+Math.tan(pitch)*2.6,p.z+forward.z*2.6];
  return {position,target,fov};
}
