import type { Actor, World, ViewMode } from './room';
import { castEyeHeight } from './cast';
import { LIFT_GATE_Z } from './spaces';

export const wrapAngle=(value:number)=>Math.atan2(Math.sin(value),Math.cos(value));
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export const eyeHeight=(actor:Actor)=>castEyeHeight(actor.id,actor.seated);
export const playerEyeHeight=(actor:Actor)=>castEyeHeight('player',actor.seated);
/** Aim at the usable scene, above the dialogue, instead of the full canvas.
 * Projection shifts the frame without moving the player or rotating their gaze. */
export function dialogueFraming(width:number,height:number,hudHeight:number) {
  const header=height<=560?60:width<=600?64:82,bottom=height<=560?3:width<=600?8:17;
  const sceneBottom=Math.max(header+120,height-hudHeight-bottom);
  return clamp(height*.5-(header+sceneBottom)*.5,0,height*.28);
}
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
/** Keep the camera on the player's side of the elevator walls. A broad room
 * clamp alone places a shoulder camera inside the solid lobby facade. */
export function constrainCamera(world:World,position:number[]) {
  const result=[clamp(position[0],-6.1,6.1),Math.min(position[1],5.35),Math.max(position[2],-4.85)];
  if(world.layout.kind==='elevator') {
    if(world.player.z>=LIFT_GATE_Z)result[2]=Math.max(result[2],-1.8);
    else {
      result[0]=clamp(result[0],-1.72,1.72);
      result[1]=Math.min(result[1],4.45);
      result[2]=clamp(result[2],-4.5,-2.55);
    }
  }
  return result;
}
export function cameraPose(world:World,view:ViewMode,aspect:number,lookOffset=0) {
  const p=world.player,subject=attentionSubject(world),yaw=world.viewYaw+(view==='first'?lookOffset:0),pitch=world.viewPitch;
  const forward={x:Math.sin(yaw),z:Math.cos(yaw)},right={x:-Math.cos(yaw),z:Math.sin(yaw)};
  const portrait=aspect<=1.25;
  const closeDinner=world.layout.profile==='compact-work'&&p.seated;
  const fov=view==='first'?(closeDinner?Math.min(portrait?60:52,2*Math.atan(Math.tan(Math.PI*15.5/180)*(16/9)/aspect)*180/Math.PI):portrait?Math.min(p.seated?75:80,2*Math.atan(Math.tan(Math.PI*33/180)/aspect)*180/Math.PI):world.layout.kind==='dinner'?48:68):(portrait?2*Math.atan(Math.tan(Math.PI*19/180)/aspect)*180/Math.PI:48);
  if(view==='first') {
    const eye=playerEyeHeight(p);
    return {position:[p.x,eye,p.z],target:[p.x+forward.x*6,eye+Math.tan(pitch)*6,p.z+forward.z*6],fov};
  }
  const d=closeDinner?(portrait?4.8:4.1):portrait?6.2:5.2,shoulder=closeDinner?(portrait?2.4:2.2):portrait?3.3:2.8;
  const height=p.seated?4.5:5.3;
  const candidates=[1,-1].map(side=>[p.x-forward.x*d+right.x*shoulder*side,height,p.z-forward.z*d+right.z*shoulder*side]);
  const correction=(position:number[])=>{
    const safe=constrainCamera(world,position);
    return Math.hypot(safe[0]-position[0],safe[2]-position[2]);
  };
  // Use the other shoulder when the preferred side is compressed by a wall;
  // keeping the original shoulder in that case makes the player hide the face.
  const position=correction(candidates[0])>correction(candidates[1])+.2?candidates[1]:candidates[0];
  // Frame the person and the player together; the shoulder offset keeps one face from hiding the other.
  const target=subject?[p.x+(subject.x-p.x)*.56,1.85+(eyeHeight(subject)-1.85)*.56,p.z+(subject.z-p.z)*.56]:[p.x+forward.x*2.6,2.1+Math.tan(pitch)*2.6,p.z+forward.z*2.6];
  const safePosition=constrainCamera(world,position);
  if(lookOffset){const dx=target[0]-safePosition[0],dz=target[2]-safePosition[2];target[0]=safePosition[0]+dx*Math.cos(lookOffset)+dz*Math.sin(lookOffset);target[2]=safePosition[2]+dz*Math.cos(lookOffset)-dx*Math.sin(lookOffset);}
  return {position:safePosition,target,fov};
}
