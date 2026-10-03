import type {Point} from './room';

export function joystickInput(dx:number,dy:number,radius:number):Point {
  if(radius<=0||!Number.isFinite(radius)||!Number.isFinite(dx)||!Number.isFinite(dy))return {x:0,z:0};
  const distance=Math.hypot(dx,dy);
  if(distance<radius*.12)return {x:0,z:0};
  const scale=Math.max(radius,distance);
  return {x:dx/scale,z:-dy/scale};
}

export function joystickKeys(keys:ReadonlySet<string>):Point {
  const x=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft'));
  const z=Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown'));
  const length=Math.max(1,Math.hypot(x,z));
  return {x:x/length,z:z/length};
}
