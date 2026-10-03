import { useEffect, useRef, useState } from 'react';
import { idleSpeech, SpeechSession } from './speech';
import { muteForSpeech } from './sound';

export function useSpeechInput(lang: 'zh' | 'en', scene: string, enabled: boolean, writeDraft: (draft: string) => void) {
  const [state, setState] = useState(idleSpeech);
  const session = useRef<SpeechSession | null>(null);
  useEffect(() => {
    const current = new SpeechSession(next => { muteForSpeech(next.phase !== 'idle'); setState(next); }, writeDraft);
    session.current = current;
    const leave = () => { if (document.hidden) current.cancel(); };
    const unload = () => current.cancel(true);
    document.addEventListener('visibilitychange', leave); window.addEventListener('pagehide', unload);
    return () => { current.dispose(); muteForSpeech(false); session.current = null; document.removeEventListener('visibilitychange', leave); window.removeEventListener('pagehide', unload); };
  }, [writeDraft]);
  useEffect(() => { session.current?.cancel(true); }, [lang, scene, enabled]);
  return {
    ...state, active: state.phase !== 'idle',
    start: (base: string) => { if (enabled) session.current?.start(base, lang); },
    stop: () => session.current?.stop(), cancel: () => session.current?.cancel(true),
    edit: () => session.current?.edit(),
    discardInterim: () => session.current?.cancel(), isActive: () => session.current?.active ?? false,
  };
}
