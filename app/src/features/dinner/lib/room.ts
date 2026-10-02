import { z } from 'zod';
import { l, pick, type Lang, type Scenario, type Emotion } from './content';

export type Point = { x:number; z:number };
export type ViewMode = 'first'|'third';
export const PLAYER_HOME:Point={x:0,z:3.55};
export const SEATS=[{x:0,z:-3.05,heading:0},{x:-2.65,z:-1.55,heading:1.04},{x:2.65,z:-1.55,heading:-1.04}];
const TABLE=3.08, CELL=.25, MIN_X=-5.75, MAX_X=5.75, MIN_Z=-4.5, MAX_Z=5.5;
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const PointSchema=z.object({x:z.number().finite().min(MIN_X).max(MAX_X),z:z.number().finite().min(MIN_Z).max(MAX_Z)});
const PoseSchema=PointSchema.extend({heading:z.number().finite().min(-Math.PI*2).max(Math.PI*2),seated:z.boolean()});
const AttentionSchema=z.object({mode:z.enum(['conversation','person','free']),characterId:z.string().max(30).optional(),yaw:z.number().finite().min(-Math.PI).max(Math.PI),pitch:z.number().finite().min(-1.2).max(1.2)}).refine(a=>a.mode!=='person'||!!a.characterId,'A person focus needs a character');
export const RoomSaveSchema=z.object({player:PoseSchema,npcs:z.array(PoseSchema.extend({id:z.string().min(1).max(30)})).length(3),attention:AttentionSchema.optional()}).refine(s=>[s.player,...s.npcs].every(a=>a.seated||Math.hypot(a.x,a.z)>=TABLE-.02),'Standing actors cannot be inside the table');
export type RoomSave=z.infer<typeof RoomSaveSchema>;
export const RoomContextSchema=z.object({posture:z.enum(['seated','standing']),zone:z.enum(['table','side','door']),nearbyCharacterId:z.string().max(30).optional(),invitedCharacterId:z.string().max(30).optional(),npcs:z.array(z.object({characterId:z.string().max(30),posture:z.enum(['seated','standing','walking'])})).length(3)});
export type RoomContext=z.infer<typeof RoomContextSchema>;
export type RoomEvent={key:'stand'|'walking'|'returning'|'seated'|'invited'|'refused'|'stays'|'acknowledged'|'npcReturn'|'arrived';characterId?:string};
export type Actor=Point & {id:string;heading:number;seated:boolean;home:Point;homeHeading:number;path:Point[];intent:'idle'|'invited'|'approach'|'home';moving:boolean;canLeaveSeat:boolean;invitationSpot:Point|null;respondAt:number;awaySince:number|null};
export type World={player:Actor;npcs:Actor[];clock:number;revision:number;event:RoomEvent;destination:Point|null;lastPlan:number;viewYaw:number;viewPitch:number;attentionMode:'conversation'|'person'|'free';speakerId:string;lookTarget:string|null};
const angle=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
export function createWorld(scene:Scenario,saved?:RoomSave):World {
  const actor=(id:string,home:Point,heading:number,pose?:z.infer<typeof PoseSchema>):Actor=>({...home,...pose,id,home:{...home},homeHeading:heading,heading:pose?.heading??heading,seated:pose?.seated??true,path:[],intent:'idle',moving:false,canLeaveSeat:true,invitationSpot:null,respondAt:0,awaySince:null});
  return {player:actor('player',PLAYER_HOME,Math.PI,saved?.player),npcs:scene.characters.map((c,i)=>({...actor(c.id,SEATS[i],SEATS[i].heading,i===0?undefined:saved?.npcs.find(n=>n.id===c.id)),canLeaveSeat:i!==0})),clock:0,revision:0,event:{key:saved?.player.seated===false?'stand':'seated'},destination:null,lastPlan:-10,viewYaw:saved?.attention?.yaw??Math.atan2(-(saved?.player.x??0),-(saved?.player.z??PLAYER_HOME.z)),viewPitch:saved?.attention?.pitch??-.08,attentionMode:saved?.attention?.mode??'conversation',speakerId:scene.characters[0].id,lookTarget:saved?.attention?.characterId??null};
}
export function snapshot(world:World):RoomSave {
  const pose=(a:Actor)=>({x:a.x,z:a.z,heading:angle(a.heading),seated:a.seated});
  return {player:pose(world.player),npcs:world.npcs.map(a=>({...pose(a),id:a.id})),attention:{mode:world.attentionMode,characterId:world.attentionMode==='person'?world.lookTarget??undefined:undefined,yaw:angle(world.viewYaw),pitch:world.viewPitch}};
}
export function roomContext(world:World):RoomContext {
  const p=world.player,r=Math.hypot(p.x,p.z);const near=[...world.npcs].sort((a,b)=>distance(p,a)-distance(p,b))[0];
  return {posture:p.seated?'seated':'standing',zone:p.seated||r<4.2?'table':p.z>4.6?'door':'side',nearbyCharacterId:distance(p,near)<2.1?near.id:undefined,invitedCharacterId:world.npcs.find(n=>n.intent==='invited'||n.intent==='approach')?.id,npcs:world.npcs.map(n=>({characterId:n.id,posture:n.seated?'seated':n.moving?'walking':'standing'}))};
}
export function validRoomCast(context:RoomContext,ids:string[]) {return new Set(context.npcs.map(n=>n.characterId)).size===3&&context.npcs.every(n=>ids.includes(n.characterId))&&(!context.nearbyCharacterId||ids.includes(context.nearbyCharacterId))&&(!context.invitedCharacterId||ids.includes(context.invitedCharacterId));}
export function walkable(p:Point,ignoreChair=-1,actors:Point[]=[]) {
  if(p.x<MIN_X||p.x>MAX_X||p.z<MIN_Z||p.z>MAX_Z||Math.hypot(p.x,p.z)<TABLE)return false;
  const chairs=[PLAYER_HOME,...SEATS];
  if(chairs.some((c,i)=>i!==ignoreChair&&distance(p,c)<.86))return false;
  if(distance(p,{x:-4.75,z:-3.45})<.85||Math.abs(p.x-4.85)<.97&&Math.abs(p.z+3.8)<.72)return false;
  return actors.every(a=>distance(a,p)>=.95);
}
export function movePosition(from:Point,dx:number,dz:number,ignoreChair=-1,actors:Point[]=[]):Point {
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));let p={...from};
  for(let i=0;i<steps;i++) {const x={x:Math.max(MIN_X,Math.min(MAX_X,p.x+dx/steps)),z:p.z};if(walkable(x,ignoreChair,actors))p=x;const z={x:p.x,z:Math.max(MIN_Z,Math.min(MAX_Z,p.z+dz/steps))};if(walkable(z,ignoreChair,actors))p=z;}
  return p;
}
// A small navigation grid covers the room. Diagonal steps cannot cut across furniture corners.
export function findPath(from:Point,to:Point,ignoreChair=-1,actors:Point[]=[]):Point[] {
  const width=Math.round((MAX_X-MIN_X)/CELL)+1,height=Math.round((MAX_Z-MIN_Z)/CELL)+1;
  const point=(i:number):Point=>({x:MIN_X+(i%width)*CELL,z:MIN_Z+Math.floor(i/width)*CELL});
  const available=(p:Point)=>walkable(p,ignoreChair)&&actors.every(a=>distance(a,p)>=1.1);
  const closest=(p:Point)=>{let best=-1,score=Infinity;for(let i=0;i<width*height;i++){const c=point(i),d=distance(p,c);if(d<score&&available(c)){best=i;score=d;}}return best;};
  const start=closest(from),end=closest(to);if(start<0||end<0)return [];
  const open=[start],cost=new Map([[start,0]]),came=new Map<number,number>(),closed=new Set<number>();
  const neighbors=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  while(open.length){open.sort((a,b)=>(cost.get(a)!+distance(point(a),point(end)))-(cost.get(b)!+distance(point(b),point(end))));const current=open.shift()!;if(current===end){const path=[point(end)];let node=end;while(came.has(node)){node=came.get(node)!;if(node!==start)path.unshift(point(node));}return path;}
    closed.add(current);const cx=current%width,cz=Math.floor(current/width);
    for(const [dx,dz] of neighbors){const x=cx+dx,z=cz+dz;if(x<0||x>=width||z<0||z>=height)continue;const n=z*width+x;if(closed.has(n)||!available(point(n)))continue;if(dx&&dz&&(!available(point(cz*width+x))||!available(point(z*width+cx))))continue;const next=cost.get(current)!+Math.hypot(dx,dz)*CELL;if(next<(cost.get(n)??Infinity)){cost.set(n,next);came.set(n,current);if(!open.includes(n))open.push(n);}}
  }
  return [];
}
function event(world:World,key:RoomEvent['key'],characterId?:string){world.event={key,characterId};world.revision++;}
function stand(actor:Actor){actor.seated=false;const r=Math.hypot(actor.x,actor.z);if(r<TABLE+.02){actor.x*= (TABLE+.03)/r;actor.z*=(TABLE+.03)/r;}}
export function focusConversation(world:World){world.attentionMode='conversation';world.lookTarget=null;world.revision++;}
export function focusPerson(world:World,id:string){if(!world.npcs.some(n=>n.id===id))return;world.attentionMode='person';world.lookTarget=id;world.revision++;}
export function freeLook(world:World){if(world.attentionMode==='free')return;world.attentionMode='free';world.lookTarget=null;world.revision++;}
export function standPlayer(world:World){if(world.player.seated){stand(world.player);event(world,'stand');}}
export function walkPlayer(world:World,to:Point){standPlayer(world);world.player.intent='idle';world.player.path=findPath(world.player,to,0,world.npcs);world.destination=world.player.path.at(-1)??null;event(world,'walking');}
function returnNpc(world:World,n:Actor){n.intent='home';n.invitationSpot=null;n.awaySince=null;n.path=findPath(n,n.home,world.npcs.indexOf(n)+1,[world.player,...world.npcs.filter(a=>a!==n)]);}
export function goHome(world:World){focusConversation(world);if(!world.player.seated){world.player.intent='home';world.player.path=findPath(world.player,PLAYER_HOME,0,world.npcs);world.destination={...PLAYER_HOME};}event(world,'returning');world.npcs.forEach(n=>{if(n.intent==='invited'){n.intent='idle';n.invitationSpot=null;}else if(!n.seated)returnNpc(world,n);});}
export function goNear(world:World,id:string){
  const n=world.npcs.find(n=>n.id===id);if(!n)return;
  const candidates=[] as {path:Point[];cost:number}[];
  // Stand beside the person, on the accessible side of their chair, rather than behind their back.
  for(const radius of [1.65,1.9])for(const side of [-1,1])for(const offset of [Math.PI*.43,Math.PI*.5,Math.PI*.55]){
    const heading=n.homeHeading+offset*side;
    const goal={x:n.x+Math.sin(heading)*radius,z:n.z+Math.cos(heading)*radius};
    if(!walkable(goal,0,world.npcs))continue;
    const path=findPath(world.player,goal,0,world.npcs),end=path.at(-1);
    if(!end||distance(end,n)<1.35||distance(end,goal)>.3)continue;
    let length=0,previous:Point=world.player;for(const point of path){length+=distance(previous,point);previous=point;}
    candidates.push({path,cost:length+Math.abs(offset-Math.PI/2)*.3});
  }
  candidates.sort((a,b)=>a.cost-b.cost);
  if(!candidates.length)return;
  standPlayer(world);world.player.intent='idle';world.player.path=candidates[0].path;world.destination=world.player.path.at(-1)??null;focusPerson(world,id);event(world,'walking');
}
export function inviteNpc(world:World,id:string,emotion:Emotion){
  const n=world.npcs.find(n=>n.id===id);if(!n)return;
  if(!n.canLeaveSeat){event(world,'stays',id);return;}
  if(emotion==='annoyed'){n.intent='idle';n.path=[];n.invitationSpot=null;event(world,'refused',id);return;}
  if(distance(world.player,n)<2.2){event(world,'acknowledged',id);return;}
  n.intent='invited';n.invitationSpot={x:world.player.x,z:world.player.z};n.respondAt=world.clock+.55;n.awaySince=null;event(world,'acknowledged',id);
}
function planApproach(world:World,n:Actor){
  const spot=n.invitationSpot;if(!spot)return;
  const chair=world.npcs.indexOf(n)+1;
  const candidates=Array.from({length:32},(_,i)=>({x:spot.x+Math.sin(i*Math.PI/16)*1.7,z:spot.z+Math.cos(i*Math.PI/16)*1.7})).filter(c=>walkable(c,chair,[world.player,...world.npcs.filter(a=>a!==n)]));
  candidates.sort((a,b)=>distance(a,n)-distance(b,n));n.path=candidates.length?findPath(n,candidates[0],chair,[world.player,...world.npcs.filter(a=>a!==n)]):[];
}
function advance(actor:Actor,world:World,dt:number,chair:number,speed:number){actor.moving=false;if(!actor.path.length)return;const next=actor.path[0],d=distance(actor,next);if(d<.12){actor.path.shift();return;}const step=Math.min(d,speed*dt),dx=(next.x-actor.x)/d*step,dz=(next.z-actor.z)/d*step;const others=[world.player,...world.npcs].filter(a=>a!==actor);const result=movePosition(actor,dx,dz,chair,others);actor.moving=distance(actor,result)>.0001;actor.heading=angle(Math.atan2(dx,dz));actor.x=result.x;actor.z=result.z;}
export function stepWorld(world:World,dt:number,input:Point,viewYaw:number,reactions:{characterId:string;emotion:Emotion}[],paused=false){
  if(paused)return;dt=Math.min(Math.max(0,dt),.05);world.clock+=dt;const p=world.player;const manual=Math.hypot(input.x,input.z)>.01;
  if(manual){standPlayer(world);p.path=[];p.intent='idle';world.destination=null;const length=Math.max(1,Math.hypot(input.x,input.z));const x=input.x/length,z=input.z/length;const dx=(-Math.cos(viewYaw)*x+Math.sin(viewYaw)*z)*2.1*dt,dz=(Math.sin(viewYaw)*x+Math.cos(viewYaw)*z)*2.1*dt;const result=movePosition(p,dx,dz,0,world.npcs);p.moving=distance(p,result)>.001;if(p.moving)p.heading=angle(Math.atan2(dx,dz));p.x=result.x;p.z=result.z;}
  else {advance(p,world,dt,0,2.1);if(!p.path.length&&p.intent==='home'&&distance(p,PLAYER_HOME)<.4){p.x=PLAYER_HOME.x;p.z=PLAYER_HOME.z;p.seated=true;p.heading=Math.PI;p.intent='idle';world.destination=null;event(world,'seated');}else if(!p.path.length){p.moving=false;if(world.destination&&world.event.key==='walking')event(world,'arrived');world.destination=null;}}
  for(const n of world.npcs){
    if(n.intent==='invited'&&reactions.find(r=>r.characterId===n.id)?.emotion==='annoyed'){n.intent='idle';n.invitationSpot=null;event(world,'refused',n.id);}
    if((n.intent==='invited'||n.intent==='approach')&&n.invitationSpot){
      const departed=distance(p,n.invitationSpot)>2.4;
      n.awaySince=departed?n.awaySince??world.clock:null;
      if(n.awaySince!==null&&world.clock-n.awaySince>1.4){
        if(n.seated){n.intent='idle';n.invitationSpot=null;}else returnNpc(world,n);
        event(world,'npcReturn',n.id);
      }else if(n.intent==='invited'&&!departed&&world.clock>=n.respondAt){
        planApproach(world,n);
        if(n.path.length){stand(n);n.intent='approach';event(world,'invited',n.id);}
        else {n.intent='idle';n.invitationSpot=null;event(world,'refused',n.id);}
      }
    }
  }
  if(world.clock-world.lastPlan>.9){
    world.npcs.forEach(n=>{
      if(n.intent==='approach'&&n.invitationSpot&&distance(n,n.invitationSpot)>2)planApproach(world,n);
      else if(n.intent==='home'&&!n.moving&&distance(n,n.home)>.4)returnNpc(world,n);
    });
    if(!p.moving&&world.destination&&(p.path.length||p.intent==='home'&&distance(p,PLAYER_HOME)>.4))p.path=findPath(p,world.destination,0,world.npcs);
    world.lastPlan=world.clock;
  }
  for(const n of world.npcs){
    if(n.intent==='approach'&&n.invitationSpot&&distance(n,n.invitationSpot)<1.8){n.path=[];n.moving=false;}
    else advance(n,world,dt,world.npcs.indexOf(n)+1,1.15);
    if(n.intent==='home'&&!n.path.length&&distance(n,n.home)<.4){n.x=n.home.x;n.z=n.home.z;n.seated=true;n.heading=n.homeHeading;n.intent='idle';}
    if(!n.seated&&!n.moving)n.heading=Math.atan2(p.x-n.x,p.z-n.z);
  }
  if(world.event.key==='returning'&&p.seated&&world.npcs.every(n=>n.seated))event(world,'seated');
}
export function eventText(e:RoomEvent,scene:Scenario,lang:Lang){const name=pick(scene.characters.find(c=>c.id===e.characterId)?.name??l('同桌的人','Someone at the table'),lang);const lines={stand:l('你站了起来，桌上的人抬头看向你。','You stand up. The people at the table look up at you.'),walking:l('你开始走动，目光跟着你的位置移动。','You move through the room. Their gaze follows you.'),returning:l('大家准备回到各自的座位，继续这一桌的对话。','Everyone heads back to their seats to continue the conversation.'),seated:l('你坐在桌前，话题还在等你接下去。','You are at the table. The conversation is still waiting.'),invited:l(`${name}起身，绕过饭桌向你走来。`,`${name} gets up and walks around the table toward you.`),refused:l(`${name}没有响应你的招呼，仍保持着距离。`,`${name} ignores your invitation and keeps their distance.`),stays:l(`${name}留在自己的座位上，转头回应你的招呼。`,`${name} stays seated and turns toward your invitation.`),acknowledged:l(`${name}看向你，留意到你的招呼。`,`${name} looks toward you and notices your invitation.`),npcReturn:l(`${name}收回招呼，回到自己的座位。`,`${name} lets the invitation go and returns to their own seat.`),arrived:l('你停在了新的位置。','You stop at your new position.')};return pick(lines[e.key],lang);}
