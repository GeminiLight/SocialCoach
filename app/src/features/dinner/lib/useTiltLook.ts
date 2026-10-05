import { useEffect, useRef, useState } from 'react';
import { TiltSession, type TiltOutput, type TiltStatus } from './tilt';

export function useTiltLook(paused: boolean, resetKey: string, onActive: () => void) {
  const [status, setStatus] = useState<TiltStatus>('off');
  const session = useRef<TiltSession | null>(null);
  const output = useRef<TiltOutput>({ yaw: 0 });
  useEffect(() => {
    const current = new TiltSession(next => { setStatus(next); if (next === 'active') onActive(); }); session.current = current; output.current = current.output;
    return () => { current.dispose(); session.current = null; output.current = { yaw: 0 }; };
  }, [onActive]);
  useEffect(() => {
    const current = session.current;
    const sync = () => current?.suspend(paused || document.hidden || (document.activeElement instanceof HTMLElement && !!document.activeElement.closest('textarea,input,select,[contenteditable=true]')));
    const blur = () => current?.suspend(true);
    document.addEventListener('visibilitychange', sync); document.addEventListener('focusin', sync); document.addEventListener('focusout', sync);
    window.addEventListener('blur', blur); window.addEventListener('focus', sync); window.addEventListener('pagehide', blur);
    sync();
    return () => { document.removeEventListener('visibilitychange', sync); document.removeEventListener('focusin', sync); document.removeEventListener('focusout', sync); window.removeEventListener('blur', blur); window.removeEventListener('focus', sync); window.removeEventListener('pagehide', blur); };
  }, [paused]);
  useEffect(() => { session.current?.recenter(); }, [resetKey]);
  return { status, output, enabled: ['requesting', 'calibrating', 'active'].includes(status), toggle: () => session.current?.enabled ? session.current.stop() : void session.current?.start(), recenter: () => session.current?.recenter() };
}
