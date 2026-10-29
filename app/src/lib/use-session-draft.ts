"use client";
import { useCallback, useState } from "react";

/** Drafts belong to a tab and session, never to a server or analytics event. */
export function useSessionDraft(sessionId: string,initialText="") {
  const key = `socialcoach.draft.${sessionId}`;
  const [draft, setDraft] = useState(() => {
    try {
      const text = sessionStorage.getItem(key) ?? initialText;
      return { text, saved: !!text };
    } catch { return { text: initialText, saved: false }; }
  });
  const setText = useCallback((text: string) => {
    let saved = false;
    try {
      if (text) sessionStorage.setItem(key, text);
      else sessionStorage.removeItem(key);
      saved = !!text;
    } catch { /* Storage restrictions must not prevent typing or sending. */ }
    setDraft({ text, saved });
  }, [key]);
  return [draft.text, setText, draft.saved] as const;
}
