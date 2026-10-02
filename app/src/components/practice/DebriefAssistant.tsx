"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { ArrowUp, MessageCircle, Square } from "lucide-react";
import { CASES, THEORIES } from "@/data/corpus";
import { Button, Spinner } from "@/components/ui";
import { useApp, useLang } from "@/store/useApp";
import { ApiError, debriefChat } from "@/lib/client-api";
import { buildDebriefInput, DEBRIEF_QUESTION_LIMIT } from "@/lib/debrief-chat";
import { uid } from "@/lib/format";
import { t, pick } from "@/lib/i18n";
import { useSessionDraft } from "@/lib/use-session-draft";
import type { Session, DebriefReply } from "@/lib/types";

export interface DebriefAssistantHandle { ask: (question?: string) => void }

export function DebriefAssistant({ session, ref }: { session: Session; ref?: Ref<DebriefAssistantHandle> }) {
  const lang = useLang();
  const [text, setText] = useSessionDraft(`${session.id}.debrief`);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const section = useRef<HTMLElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const exchanges = session.debriefChat ?? [];

  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
  useEffect(() => {
    const container = log.current;
    const latest = container?.lastElementChild;
    if (!container || !latest) return;
    if (pending) container.scrollTop = container.scrollHeight;
    else container.scrollTop += latest.getBoundingClientRect().top - container.getBoundingClientRect().top;
  }, [exchanges.length, pending]);

  function stop() {
    request.current?.abort(); request.current = null;
    setPending(null);
  }
  function ask(question?: string) {
    if (question) { stop(); setText(question); setError(null); }
    const target = exchanges.length ? input.current?.closest("form") : section.current;
    target?.scrollIntoView({ behavior: "instant", block: exchanges.length ? "center" : "start" });
    input.current?.focus({ preventScroll: true });
  }
  useImperativeHandle(ref, () => ({ ask }));

  async function submit() {
    const question = text.trim();
    if (!question || question.length > DEBRIEF_QUESTION_LIMIT || request.current) return;
    const current = useApp.getState().sessions.find(s => s.id === session.id);
    if (!current?.report || current.status !== "assessed") return;
    const controller = new AbortController();
    request.current = controller;
    setPending(question); setError(null);
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 55_000);
    try {
      const reply = await debriefChat(buildDebriefInput(current, question, lang), controller.signal);
      if (controller.signal.aborted || request.current !== controller) return;
      const exchange = { id: uid(), question, reply, at: Date.now() };
      useApp.getState().updateSession(session.id, s => ({ debriefChat: [...(s.debriefChat ?? []), exchange] }));
      setText("");
    } catch (e) {
      if (request.current !== controller) return;
      if (timedOut) setError(t(lang, "da_timeout"));
      else if (!controller.signal.aborted) setError(e instanceof ApiError ? e.message : t(lang, "da_error"));
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) { request.current = null; setPending(null); }
    }
  }

  return (
    <section id="review-assistant" ref={section} className="card p-5 sm:p-6 flex flex-col gap-5 scroll-mt-20" aria-labelledby="review-assistant-title">
      <div className="flex gap-3 items-start">
        <span className="shrink-0 h-10 w-10 rounded-full bg-teal-soft text-teal flex items-center justify-center"><MessageCircle size={19} aria-hidden /></span>
        <div className="min-w-0 flex flex-col gap-1.5">
          <h2 id="review-assistant-title" className="display text-[20px]">{t(lang, "da_title")}</h2>
          <p className="text-[13px] text-ink-3 leading-relaxed">{t(lang, "da_sub")}</p>
        </div>
      </div>
      {exchanges.length === 0 && !pending && (
        <div className="flex flex-wrap gap-2">
          {([["da_concept", "da_concept_question"], ["da_rewrite", "da_rewrite_question"], ["da_try", "da_try_question"]] as const).map(([label, question]) => (
            <button key={label} onClick={() => ask(t(lang, question))} className="press min-h-11 border border-line-strong rounded-full px-3 text-[12px] text-ink-2 hover:bg-inset">{t(lang, label)}</button>
          ))}
        </div>
      )}
      {(exchanges.length > 0 || pending) && (
        <div ref={log} role="log" aria-label={t(lang, "da_history")} aria-live="polite" aria-relevant="additions" tabIndex={0} className="max-h-[30dvh] lg:max-h-[28rem] overflow-y-auto overscroll-contain flex flex-col gap-5 pr-1">
          {exchanges.map(e => <div key={e.id} className="flex flex-col gap-3"><Question text={e.question} /><Reply reply={e.reply} /></div>)}
          {pending && <Question text={pending} />}
        </div>
      )}
      {pending && <p role="status" className="flex items-center gap-2 text-[13px] text-ink-3"><Spinner />{t(lang, "da_busy")}</p>}
      {error && <div role="alert" className="rounded-2xl bg-danger-soft p-3 text-[13px] text-danger leading-relaxed"><p>{error}</p><button onClick={submit} className="press min-h-11 underline underline-offset-4">{t(lang, "da_retry")}</button></div>}
      <form onSubmit={e => { e.preventDefault(); void submit(); }} className="flex flex-col gap-2">
        <label htmlFor="debrief-question" className="sr-only">{t(lang, "da_input")}</label>
        <div className="rounded-2xl bg-paper border border-line-strong focus-within:border-teal transition-colors p-3 flex flex-col gap-2">
          <textarea id="debrief-question" ref={input} value={text} onChange={e => { setText(e.target.value); setError(null); }} maxLength={DEBRIEF_QUESTION_LIMIT} rows={3} disabled={!!pending} aria-keyshortcuts="Control+Enter Meta+Enter" placeholder={t(lang, "da_placeholder")} className="resize-y min-h-20 max-h-48 w-full bg-transparent text-[14px] leading-relaxed placeholder:text-ink-3 focus:outline-none" onKeyDown={e => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); }
          }} />
          <div className="flex items-center justify-between gap-3">
            <span className="num text-[11px] text-ink-3" aria-live={text.length >= DEBRIEF_QUESTION_LIMIT ? "polite" : "off"}>{text.length} / {DEBRIEF_QUESTION_LIMIT}</span>
            {pending ? <Button key="stop" type="button" size="sm" variant="ghost" onClick={stop}><Square size={13} />{t(lang, "da_stop")}</Button> : <Button key="send" type="submit" size="sm" disabled={!text.trim() || text.length > DEBRIEF_QUESTION_LIMIT}><ArrowUp size={15} />{t(lang, "da_send")}</Button>}
          </div>
        </div>
        <p className="text-[11px] text-ink-3 leading-relaxed">{t(lang, "da_note")}</p>
      </form>
    </section>
  );
}

function Question({ text }: { text: string }) {
  return <p className="self-end max-w-[92%] rounded-2xl bg-inset px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap break-words">{text}</p>;
}
function Reply({ reply }: { reply: DebriefReply }) {
  const lang = useLang();
  return <div className="flex flex-col gap-3 text-[14px] leading-relaxed break-words">
    {reply.evidence && <p className="text-ink-2"><span className="eyebrow mr-2">{t(lang, "rp_evidence")}</span><span className="mark-quote">“{reply.evidence}”</span></p>}
    <p className="whitespace-pre-wrap">{reply.answer}</p>
    {reply.example && <div className="rounded-2xl bg-teal-soft p-4 flex flex-col gap-2"><p className="eyebrow text-teal">{t(lang, "da_example")}</p><p className="whitespace-pre-wrap text-ink-2">{reply.example}</p><p className="text-[12px] text-ink-2">{t(lang, "da_example_note")}</p></div>}
    {reply.sources.length > 0 && <div className="border-t border-line pt-3 flex flex-col gap-1.5 text-[12px] text-ink-3"><p>{t(lang, "da_sources")}</p>{reply.sources.map(s => {
      const source = (s.kind === "theory" ? THEORIES : CASES).find(k => k.id === s.id);
      if (!source) return null;
      const content = <><span className="text-ink-2">{pick(source.title, lang)}</span><br />{source.source.author} · {source.source.book}</>;
      return source.source.url ? <a key={`${s.kind}:${s.id}`} href={source.source.url} target="_blank" rel="noreferrer" className="min-h-11 underline underline-offset-4">{content}</a> : <p key={`${s.kind}:${s.id}`}>{content}</p>;
    })}</div>}
  </div>;
}
