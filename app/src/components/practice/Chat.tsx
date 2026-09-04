"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";
import { ArrowUp, Lightbulb, Mic, MicOff, X, LogOut } from "lucide-react";
import { Avatar, Button, IconButton, Marginalia, Sheet, Spinner } from "@/components/ui";
import { useApp, useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";
import { hint as hintApi, parseRoleplay, roleplayStream } from "@/lib/client-api";
import { npcsOf } from "@/lib/session-utils";
import { uid } from "@/lib/format";
import type { ChatMessage, Session } from "@/lib/types";
import type { Character } from "@/data/corpus/types";
import type { Lang } from "@/data/taxonomy";
import { canListen, recognitionError, speak, stopSpeaking, unlockSpeech } from "@/lib/speech";

export function Chat({ session }: { session: Session }) {
  const lang = useLang();
  const router = useRouter();
  const { profile, settings, setSettings, appendMessage, updateLastNpc, updateSession } = useApp();
  const sc = session.scenario;
  const npcs = useMemo(() => npcsOf(sc, session.learnerCharacterId), [sc, session.learnerCharacterId]);
  const npcIds = useMemo(() => npcs.map((c) => c.id), [npcs]);
  const learnerName = profile?.name || sc.characters.find((c) => c.id === session.learnerCharacterId)?.name[lang] || "";

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());

  const learnerTurns = session.messages.filter((m) => m.role === "learner").length;
  const remaining = Math.max(0, sc.maxTurns - learnerTurns);
  const objectives = session.adaptation?.objectives ?? sc.objectives.map((o) => o[lang]);

  // opening line (idempotent: read the live store so a double-invoked effect can't duplicate it)
  useEffect(() => {
    const live = useApp.getState().sessions.find((x) => x.id === session.id);
    if (live && live.messages.length === 0) {
      appendMessage(session.id, { id: `${session.id}-opening`, role: "npc", characterId: sc.opening.characterId, text: sc.opening.text[lang], ts: Date.now() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autoscroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [session.messages, busy, note]);

  // Lines already on screen when this mounted are history — a resumed session
  // must not read its whole transcript aloud. The opening line is appended by
  // the effect above, after this ref is initialised, so it still gets read.
  const historyRef = useRef<Set<string>>(new Set(session.messages.filter((m) => m.role === "npc").map((m) => m.id)));

  // TTS for completed NPC lines. Every unspoken line is queued, in order: a turn
  // can contain more than one character speaking.
  useEffect(() => {
    if (!settings.tts) {
      stopSpeaking();
      return;
    }
    if (busy) return;
    for (const m of session.messages) {
      if (m.role !== "npc" || !m.text) continue;
      if (historyRef.current.has(m.id) || spokenRef.current.has(m.id)) continue;
      spokenRef.current.add(m.id);
      speak(m.text, lang);
    }
  }, [session.messages, busy, settings.tts, lang]);

  // ── fix: leaving mid-sentence used to keep talking, and the mic could stay open ──
  useEffect(
    () => () => {
      stopSpeaking();
      try {
        recRef.current?.stop();
      } catch {}
    },
    [],
  );

  // iOS blocks speech until a gesture has unlocked it; spend the first one here
  // so the opening line of a resumed session can play.
  useEffect(() => {
    if (!settings.tts) return;
    const prime = () => unlockSpeech();
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, [settings.tts]);

  const finish = useCallback(
    (objectiveDone: boolean[], outcome: "success" | "partial" | "failure", noteText?: string) => {
      updateSession(session.id, { objectiveDone, outcome, outcomeNote: noteText, status: "ended", endedAt: Date.now() });
    },
    [session.id, updateSession],
  );

  const send = useCallback(
    async (textRaw: string) => {
      const text = textRaw.trim();
      if (!text || busy) return;
      setErr(null);
      setNote(null);
      setInput("");
      if (taRef.current) taRef.current.style.height = "auto";
      const learnerMsg: ChatMessage = { id: uid(), role: "learner", text, ts: Date.now() };
      appendMessage(session.id, learnerMsg);
      setBusy(true);
      const ids: string[] = [];
      const history = [...session.messages, learnerMsg];
      try {
        const full = await roleplayStream(
          { scenario: sc, learnerCharacterId: session.learnerCharacterId, messages: history, lang, learnerName },
          (acc) => {
            const parsed = parseRoleplay(acc, npcIds);
            parsed.utterances.forEach((u, i) => {
              if (!ids[i]) ids[i] = uid();
              updateLastNpc(session.id, u.text, u.characterId, ids[i]);
            });
            setSpeaking(parsed.utterances.at(-1)?.characterId ?? null);
          },
        );
        const parsed = parseRoleplay(full, npcIds);
        if (parsed.error) throw new Error(parsed.error);
        parsed.utterances.forEach((u, i) => {
          if (!ids[i]) ids[i] = uid();
          updateLastNpc(session.id, u.text, u.characterId, ids[i]);
        });
        const meta = parsed.meta;
        const done = meta?.objectives?.length === sc.objectives.length ? meta.objectives : session.objectiveDone;
        if (done.some((d, i) => d && !session.objectiveDone[i]) && typeof navigator !== "undefined" && "vibrate" in navigator) {
          try { navigator.vibrate(12); } catch {}
        }
        const turnsUsed = learnerTurns + 1;
        if (meta?.note) setNote(meta.note);
        if (meta?.ended || turnsUsed >= sc.maxTurns) {
          const n = done.filter(Boolean).length;
          const outcome = meta?.outcome ?? (n === done.length ? "success" : n > 0 ? "partial" : "failure");
          // brief pause so the last line can be read
          setTimeout(() => finish(done, outcome, meta?.note), 1400);
        } else {
          updateSession(session.id, { objectiveDone: done });
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : t(lang, "pr_error"));
      } finally {
        setBusy(false);
        setSpeaking(null);
      }
    },
    [busy, session, sc, lang, learnerName, npcIds, appendMessage, updateLastNpc, updateSession, learnerTurns, finish],
  );

  const askHint = async () => {
    if (hintBusy || busy) return;
    setHintBusy(true);
    try {
      const { hint } = await hintApi({ scenario: sc, learnerCharacterId: session.learnerCharacterId, messages: session.messages, lang, learnerName });
      appendMessage(session.id, { id: uid(), role: "coach", text: hint, ts: Date.now(), kind: "hint" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t(lang, "error_generic"));
    } finally {
      setHintBusy(false);
    }
  };

  const startListening = () => {
    type SR = new () => { lang: string; interimResults: boolean; continuous: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: (e: { error?: string }) => void; start: () => void; stop: () => void };
    const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang === "zh" ? "zh-CN" : "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    const base = input;
    rec.onresult = (e) => {
      const txt = Array.from(e.results as ArrayLike<ArrayLike<{ transcript: string }>>).map((r) => r[0].transcript).join("");
      setInput((base ? base + " " : "") + txt);
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      setVoiceNote(recognitionError(e?.error, lang));
    };
    recRef.current = rec;
    setVoiceNote(null);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      setVoiceNote(recognitionError(undefined, lang));
    }
  };

  const toggleVoice = () => {
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {}
      return;
    }
    // The browser sends the audio to its vendor to transcribe. Say so once,
    // because everything else in this app stays on the device.
    if (!settings.voiceNoticeSeen) {
      setVoiceNotice(true);
      return;
    }
    startListening();
  };
  const voiceSupported = canListen();

  const endEarly = () => {
    const n = session.objectiveDone.filter(Boolean).length;
    finish(session.objectiveDone, n === session.objectiveDone.length ? "success" : n > 0 ? "partial" : "failure");
  };

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 132) + "px";
  };

  return (
    <div className="h-dvh flex flex-col pt-safe lg:grid lg:grid-cols-[680px_var(--margin-w)] lg:justify-center lg:gap-10 lg:px-6 xl:grid-cols-[800px_var(--margin-w)] xl:px-10">
      <div className="flex-1 flex flex-col min-h-0 lg:min-w-0">
      {/* header */}
      <header className="px-3 pt-2 pb-3 border-b border-line bg-paper/95 backdrop-blur flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <IconButton label={t(lang, "pr_end_early")} onClick={() => setEndOpen(true)}><X size={20} /></IconButton>
          <div className="flex-1 min-w-0 px-1">
            <p className="text-[14px] font-semibold truncate">{sc.title[lang]}</p>
            <p className="text-[12px] text-ink-3 num">{remaining <= 1 ? t(lang, "pr_last_turn") : t(lang, "pr_turns_left", { n: remaining })}</p>
          </div>
          <div className="flex -space-x-2 pr-1 lg:hidden">
            {npcs.map((c) => (
              <span key={c.id} className={clsx("rounded-full ring-2 ring-paper transition-transform duration-300", speaking === c.id && "scale-110 ring-accent")}>
                <Avatar name={c.name[lang]} hue={c.hue} size={32} />
              </span>
            ))}
          </div>
        </div>
        {/* objectives as ink cells */}
        <Objectives items={objectives} done={session.objectiveDone} label={t(lang, "pr_objectives")} layout="strip" className="lg:hidden" />
      </header>

      {/* messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <p className="text-center text-[12px] text-ink-4 px-6 leading-snug">{sc.hook[lang]}</p>
        {session.messages.map((m, i) => {
          if (m.role === "coach") {
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bubble-coach px-3.5 py-2.5 text-[13.5px] leading-relaxed flex gap-2 self-stretch">
                <Lightbulb size={15} className="mt-0.5 shrink-0 text-accent-deep" />
                <span>{m.text}</span>
              </motion.div>
            );
          }
          if (m.role === "learner") {
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25 }} className="self-end max-w-[82%] bubble-me px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
                {m.text}
              </motion.div>
            );
          }
          const c = sc.characters.find((x) => x.id === m.characterId) ?? npcs[0];
          const prevSame = session.messages[i - 1]?.role === "npc" && session.messages[i - 1]?.characterId === m.characterId;
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="self-start max-w-[86%] flex gap-2 items-end">
              <span className={clsx("shrink-0", prevSame && "invisible")}><Avatar name={c?.name[lang] ?? "?"} hue={c?.hue ?? 40} size={28} /></span>
              <div className="flex flex-col gap-1">
                {!prevSame && <span className="text-[11px] text-ink-3 pl-1">{c?.name[lang]}</span>}
                <div className="bubble-npc px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">{m.text || <Spinner />}</div>
              </div>
            </motion.div>
          );
        })}
        {busy && !session.messages.some((m) => m.role === "npc" && m.text === "" ) && (
          <div className="self-start flex gap-2 items-end">
            <Avatar name={npcs[0]?.name[lang] ?? "?"} hue={npcs[0]?.hue ?? 40} size={28} />
            <div className="bubble-npc px-4 py-3"><Spinner /></div>
          </div>
        )}
        <AnimatePresence>
          {note && !busy && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-[11.5px] text-ink-4 italic px-8">{note}</motion.p>
          )}
        </AnimatePresence>
        {err && (
          <div className="self-center flex items-center gap-2 text-[13px] text-danger bg-danger-soft rounded-full px-3 py-1.5">
            {err}
            <button onClick={() => { const last = [...session.messages].reverse().find((m) => m.role === "learner"); if (last) { updateSession(session.id, (s) => ({ messages: s.messages.filter((m) => m.id !== last.id && !(m.role === "npc" && m.text === "")) })); setInput(last.text); } setErr(null); }} className="press underline font-medium">{t(lang, "retry")}</button>
          </div>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-line bg-paper px-3 pt-2 pb-safe pb-3 shrink-0">
        {voiceNote && <p className="text-[12px] text-ink-3 px-1 pb-1.5">{voiceNote}</p>}
        <div className="flex items-end gap-2">
          <button onClick={askHint} disabled={busy || hintBusy} aria-label={t(lang, "pr_hint")} title={t(lang, "pr_hint")} className="press h-11 w-11 shrink-0 rounded-full border border-line-strong inline-flex items-center justify-center text-ink-2 disabled:opacity-40">
            {hintBusy ? <Spinner /> : <Lightbulb size={19} />}
          </button>
          <div className={clsx("flex-1 min-w-0 flex items-end gap-1 rounded-[22px] border bg-card px-3 py-1.5 transition-colors", listening ? "border-accent" : "border-line focus-within:border-ink")}>
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); grow(e.target); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(input); } }}
              rows={1}
              placeholder={listening ? t(lang, "pr_listening") : t(lang, "pr_input_ph")}
              className="flex-1 min-w-0 bg-transparent outline-none text-[15px] leading-[1.5] py-1.5 max-h-[132px] placeholder:text-ink-4"
              disabled={busy}
              enterKeyHint="send"
            />
            {voiceSupported && (
              <button onClick={toggleVoice} aria-label={t(lang, "pr_voice")} className={clsx("press h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0", listening ? "bg-accent text-accent-ink" : "text-ink-3")}>
                {listening ? <MicOff size={17} /> : <Mic size={17} />}
              </button>
            )}
          </div>
          <button onClick={() => send(input)} disabled={!input.trim() || busy} aria-label={t(lang, "rp_send")} className="press h-11 w-11 shrink-0 rounded-full bg-ink text-paper inline-flex items-center justify-center disabled:opacity-30">
            <ArrowUp size={20} />
          </button>
        </div>
      </div>

      </div>

      {/* the margin: what you are trying to do, and who you are up against */}
      <Marginalia lgOnly className="lg:min-h-0 lg:overflow-y-auto lg:py-6">
        <section className="flex flex-col gap-3">
          <span className="eyebrow">{t(lang, "pr_objectives")}</span>
          <Objectives items={objectives} done={session.objectiveDone} label={t(lang, "pr_objectives")} layout="stack" />
        </section>
        <div className="dotted" />
        <section className="flex flex-col gap-3">
          <span className="eyebrow">{t(lang, "pr_characters")}</span>
          <NpcStack npcs={npcs} lang={lang} speaking={speaking} />
        </section>
      </Marginalia>

      <Sheet open={voiceNotice} onClose={() => setVoiceNotice(false)} title={t(lang, "pr_voice_notice_title")}>
        <div className="flex flex-col gap-3 pt-2">
          <p className="text-[14px] text-ink-2 leading-relaxed">{t(lang, "pr_voice_notice")}</p>
          <Button
            block
            variant="ink"
            onClick={() => {
              setSettings({ voiceNoticeSeen: true });
              setVoiceNotice(false);
              startListening();
            }}
          >
            {t(lang, "pr_voice_notice_ok")}
          </Button>
          <Button block variant="ghost" onClick={() => setVoiceNotice(false)}>{t(lang, "cancel")}</Button>
        </div>
      </Sheet>

      <Sheet open={endOpen} onClose={() => setEndOpen(false)} title={t(lang, "pr_end_early")}>
        <div className="flex flex-col gap-3 pt-2">
          <p className="text-[14px] text-ink-2">{t(lang, "pr_end_confirm")}</p>
          <Button block variant="ink" onClick={() => { setEndOpen(false); endEarly(); }} disabled={learnerTurns === 0}><LogOut size={16} />{t(lang, "pr_end_early")}</Button>
          <Button block variant="ghost" onClick={() => { setEndOpen(false); router.push("/"); }}>{t(lang, "back")}</Button>
        </div>
      </Sheet>
    </div>
  );
}

/**
 * Objective progress: ink fills a cell as each objective lands. One source of
 * truth, two shapes — a strip across the phone header, a stack down the
 * desktop margin where each objective gets its full text.
 */
function Objectives({ items, done, label, layout, className }: { items: string[]; done: boolean[]; label: string; layout: "strip" | "stack"; className?: string }) {
  if (layout === "strip") {
    return (
      <ol className={clsx("flex gap-1.5 px-1", className)} aria-label={label}>
        {items.map((o, i) => {
          const on = done[i];
          return (
            <li key={i} className="flex-1 min-w-0" title={o}>
              <div className="relative h-1.5 rounded-full bg-line overflow-hidden">
                {on && <span className="absolute inset-0 bg-ink inkfill rounded-full" />}
              </div>
              <p className={clsx("text-[11px] leading-tight mt-1 line-clamp-2 transition-colors", on ? "text-ink" : "text-ink-4")}>{o}</p>
            </li>
          );
        })}
      </ol>
    );
  }
  return (
    <ol className={clsx("flex flex-col gap-4", className)} aria-label={label}>
      {items.map((o, i) => {
        const on = done[i];
        return (
          <li key={i}>
            <div className="relative h-2 rounded-full bg-line overflow-hidden">
              {on && <span className="absolute inset-0 bg-ink inkfill rounded-full" />}
            </div>
            <p className={clsx("text-[13px] leading-snug mt-2 transition-colors", on ? "text-ink" : "text-ink-3")}>{o}</p>
          </li>
        );
      })}
    </ol>
  );
}

/** Who is in the room, with names — the desktop margin has space for them. */
function NpcStack({ npcs, lang, speaking }: { npcs: Character[]; lang: Lang; speaking: string | null }) {
  return (
    <ul className="flex flex-col gap-3">
      {npcs.map((c) => (
        <li key={c.id} className="flex items-start gap-2.5">
          <span className={clsx("rounded-full transition-transform duration-300", speaking === c.id && "scale-110 ring-2 ring-accent")}>
            <Avatar name={c.name[lang]} hue={c.hue} size={32} />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[13px] font-semibold text-ink truncate">{c.name[lang]}</p>
            <p className="text-[12px] text-ink-3 leading-snug">{c.role[lang]}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
