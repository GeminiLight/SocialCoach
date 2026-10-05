/** Geometry shared by rendering, navigation and save validation. Units match the character rig. */
import dinnerGeometry from './dinnerGeometry.json';
export type SpaceKind = 'dinner' | 'elevator' | 'office';
export type Placement = { x:number; z:number; heading:number; seated:boolean };
export type Obstacle = { x:number; z:number; radius:number } | { x:number; z:number; width:number; depth:number };
export type Zone = 'table' | 'side' | 'door' | 'lobby' | 'cabin' | 'desk' | 'board';
export type SpaceLayout = { kind:SpaceKind; profile?:'compact-work'; tableClearance?:number; player:Placement; people:Placement[]; chairs:Placement[]; obstacles:Obstacle[] };
const diner = (x:number,z:number,heading:number):Placement => ({x,z,heading,seated:true});
const dinnerPeople=[diner(0,-3.05,0),diner(-2.65,-1.55,1.04),diner(2.65,-1.55,-1.04)];
const officePlayer=diner(0,3.55,Math.PI),officeColleague=diner(-3.7,-1.25,0);
export const LIFT_GATE_Z=-2.3;
export const LIFT_PANEL={x:2.4,z:-1.3};
export const LIFT_INNER_PANEL={x:1.25,z:-3.5};
export const liftPanelFor=(p:{z:number})=>p.z<LIFT_GATE_Z?LIFT_INNER_PANEL:LIFT_PANEL;
export const OFFICE_BOARD={x:4.4,z:-2.4};
export const layouts:Record<SpaceKind,SpaceLayout>={
  dinner:{kind:'dinner',player:diner(0,3.55,Math.PI),people:dinnerPeople,chairs:[diner(0,3.55,Math.PI),...dinnerPeople],obstacles:[{x:0,z:0,radius:3.08},{x:-4.75,z:-3.45,radius:.85},{x:4.85,z:-3.8,width:1.94,depth:1.44}]},
  elevator:{kind:'elevator',player:{x:0,z:3.55,heading:Math.PI,seated:false},people:[{x:0,z:-.35,heading:0,seated:false},{x:-2.8,z:.3,heading:.8,seated:false},{x:3.1,z:.2,heading:-1,seated:false}],chairs:[],obstacles:[{x:-2.1,z:-3.5,width:.7,depth:2.4},{x:2.1,z:-3.5,width:.7,depth:2.4},{x:-4,z:LIFT_GATE_Z,width:4.5,depth:.65},{x:4,z:LIFT_GATE_Z,width:4.5,depth:.65},{x:-4.8,z:3.6,width:1.8,depth:.9}]},
  office:{kind:'office',player:officePlayer,people:[{x:0,z:-1.15,heading:0,seated:false},officeColleague,{x:2.8,z:-.65,heading:-.7,seated:false}],chairs:[officePlayer,{x:0,z:-1.15,heading:0,seated:false},officeColleague,{x:2.8,z:-.65,heading:-.7,seated:false}],obstacles:[{x:0,z:2.05,width:3.35,depth:1.75},{x:-3.7,z:.2,width:3.3,depth:1.65},{x:-4.9,z:-3.65,width:1.5,depth:1.65},{x:4.85,z:-3.85,width:1.6,depth:1.3}]},
};
const compact=dinnerGeometry.work;
const workLayout:SpaceLayout={...layouts.dinner,profile:'compact-work',tableClearance:compact.clearance,player:compact.player,people:compact.people,chairs:[compact.player,...compact.people],obstacles:[{x:0,z:0,radius:compact.clearance},...layouts.dinner.obstacles.slice(1)]};
export function spaceFor(scene:{id?:string;space?:SpaceKind}):SpaceLayout{return scene.id==='work'&&!scene.space?workLayout:layouts[scene.space??'dinner'];}
export function zoneFor(layout:SpaceLayout,p:{x:number;z:number;seated:boolean}):Zone{
  if(layout.kind==='elevator')return p.z<LIFT_GATE_Z?'cabin':p.z>4.6?'door':'lobby';
  if(layout.kind==='office')return p.x>3.6&&p.z<-.8?'board':p.z>4.6?'door':p.seated||p.z>1?'desk':'side';
  return p.seated||Math.hypot(p.x,p.z)<4.2?'table':p.z>4.6?'door':'side';
}
