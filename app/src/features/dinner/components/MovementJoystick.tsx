import {useCallback,useEffect,useRef,useState,type CSSProperties,type RefObject} from 'react';
import {Move} from 'lucide-react';
import {pick,ui,type Lang} from '../lib/content';
import type {Point} from '../lib/room';
import {joystickInput,joystickKeys} from '../lib/joystick';

export function MovementJoystick({inputRef,lang}:{inputRef:RefObject<Point>;lang:Lang}) {
  const [offset,setOffset]=useState<Point>({x:0,z:0});
  const drag=useRef<{id:number;x:number;y:number;radius:number}|null>(null);
  const keys=useRef(new Set<string>());
  const stop=useCallback(()=>{drag.current=null;keys.current.clear();inputRef.current={x:0,z:0};setOffset({x:0,z:0});},[inputRef]);
  const move=(value:Point)=>{inputRef.current=value;setOffset(value);};
  useEffect(()=>{
    const hidden=()=>{if(document.hidden)stop();};
    window.addEventListener('blur',stop);document.addEventListener('visibilitychange',hidden);
    return()=>{window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',hidden);inputRef.current={x:0,z:0};};
  },[inputRef,stop]);
  return <div className="movement-joystick">
    <button type="button" className="joystick-pad" aria-label={pick(ui.joystick,lang)} aria-describedby="joystick-hint" data-x={offset.x.toFixed(2)} data-z={offset.z.toFixed(2)}
      onPointerDown={e=>{if(e.button!==0||drag.current)return;e.preventDefault();const r=e.currentTarget.getBoundingClientRect();drag.current={id:e.pointerId,x:r.left+r.width/2,y:r.top+r.height/2,radius:r.width*.28};e.currentTarget.setPointerCapture(e.pointerId);move(joystickInput(e.clientX-drag.current.x,e.clientY-drag.current.y,drag.current.radius));}}
      onPointerMove={e=>{const d=drag.current;if(d?.id===e.pointerId)move(joystickInput(e.clientX-d.x,e.clientY-d.y,d.radius));}}
      onPointerUp={e=>{if(drag.current?.id===e.pointerId)stop();}} onPointerCancel={e=>{if(drag.current?.id===e.pointerId)stop();}} onLostPointerCapture={e=>{if(drag.current?.id===e.pointerId)stop();}} onBlur={stop}
      onKeyDown={e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();keys.current.add(e.key);move(joystickKeys(keys.current));}}
      onKeyUp={e=>{if(!keys.current.has(e.key))return;e.preventDefault();e.stopPropagation();keys.current.delete(e.key);move(joystickKeys(keys.current));}}>
      <span className="joystick-track" aria-hidden="true"/><span className="joystick-knob" aria-hidden="true" style={{'--joystick-x':`${offset.x*28}px`,'--joystick-y':`${-offset.z*28}px`} as CSSProperties}><Move size={18}/></span>
    </button>
    <span id="joystick-hint">{pick(ui.joystickHint,lang)}</span>
  </div>;
}
