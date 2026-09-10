"use client";
import { FeedbackPrompt } from "@/components/Feedback";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";
import { ArrowLeft, Bookmark, ChevronDown, RotateCcw, Share2, Send } from "lucide-react";
import { BottomBar, Button, IconButton, Marginalia, Stages, Stars, Spinner, useToast } from "@/components/ui";
import { SkillTag, Level } from "@/components/SkillBits";
import { CaseBody, TheoryBody } from "@/components/Knowledge";
import { useApp, useLang } from "@/store/useApp";
import { t, tList } from "@/lib/i18n";
import { assessStream, reflectStream } from "@/lib/client-api";
import { track } from "@/lib/analytics/track";
import { buildSession } from "@/lib/session-utils";
import type { Report, Session } from "@/lib/types";
import type { Character } from "@/data/corpus/types";
import { TurnMap } from "./TurnMap";
import { caseById, theoryById } from "@/data/corpus";
import { skillById, SKILLS, type SkillId } from "@/data/taxonomy";
import { compColor } from "@/lib/format";

const skillIds = new Set(SKILLS.map((s) => s.id));

export function Debrief({ session }: { session: Session }) {
  const lang = useLang();
  const router = useRouter();
  const { profile, applyReport, addSession, updateSession } = useApp();
  const [err, setErr] = useState<string | null>(null);
  const [partial, setPartial] = useState<Partial<Report> | null>(null);
  const inflight = useRef(false);
  const sc = session.scenario;
  const report = session.report;

  const run = useCallback(async () => {
    if (!profile || inflight.current) return;
    inflight.current = true;
    try {
      const final = await assessStream(
        {
          scenario: sc,
          learnerCharacterId: session.learnerCharacterId,
          messages: session.messages,
          lang,
          goals: profile.goals,
          learnerName: profile.name,
          objectiveDone: session.objectiveDone,
          outcome: session.outcome,
        },
        (p) => setPartial(p),
      );
      applyReport(session.id, final);
      track({ name: "debrief_view", ts: Date.now(), session: session.id, scenario: sc.custom ? "custom" : sc.id, stars: final.stars, outcome: final.outcome });
      setPartial(null);
    } catch (e) {
      console.error("[assess]", e);
      const raw = e instanceof Error ? e.message : "";
      const friendly = /JSON|position|Unexpected|garbled|unexpectedly/i.test(raw) ? t(lang, "rp_failed") : raw || t(lang, "error_generic");
      setErr(friendly);
      setPartial(null);
    } finally {
      inflight.current = false;
    }
  }, [profile, sc, session, lang, applyReport]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kick off an async request on mount
    if (session.status === "ended" && !report) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status]);

  const again = () => {
    const s = buildSession(sc, session.origin, lang, session.adaptation ? { adaptation: session.adaptation } : undefined);
    addSession(s);
    router.push(`/practice/${s.id}`);
  };

  const n = session.objectiveDone.filter(Boolean).length;
  const outcomeKey = session.outcome === "success" ? "pr_ended_success" : session.outcome === "partial" ? "pr_ended_partial" : "pr_ended_failure";
  const hasPartial = !!partial && (!!partial.summary || (partial.strengths?.length ?? 0) > 0);

  /* ── phase: the reveal ──
     Every scene hides something the other side never says, and the model is
     told to give it up only when it is earned. Until now nothing on screen ever
     said whether the learner got there, which left a whole mechanic invisible.
     It holds the stage until dismissed rather than for as long as the report
     takes, because a moment that vanishes on a timer is not a moment. */
  const withHidden = sc.characters.filter((c) => c.id !== session.learnerCharacterId && c.hidden);
  if (withHidden.length > 0 && !session.revealSeen) {
    return (
      <HiddenReveal
        session={session}
        characters={withHidden}
        outcomeKey={outcomeKey}
        objectivesMet={n}
        ready={!!report || hasPartial}
        err={err}
        onRetry={() => { setErr(null); void run(); }}
        onDone={() => updateSession(session.id, { revealSeen: true })}
      />
    );
  }

  /* ── phase: ended, report not yet started streaming ── */
  if (!report && !hasPartial) {
    return (
      <div className="min-h-dvh pt-safe px-5 flex flex-col lg:mx-auto lg:w-full lg:max-w-[1000px] xl:max-w-[1120px] lg:px-6">
        <div className="pt-2 -ml-2"><IconButton label={t(lang, "back")} onClick={() => router.push("/")}><ArrowLeft size={20} /></IconButton></div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="flex-1 flex flex-col gap-8 pt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-x-12 lg:items-start lg:pt-14">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col items-center text-center gap-4 lg:items-start lg:text-left">
              <StarBurst n={n} of={sc.objectives.length} />
              <h1 className="display text-[32px] leading-tight">{t(lang, outcomeKey)}</h1>
              <p className="text-[14px] text-ink-3 max-w-[32ch]">{t(lang, "pr_ended_sub")}</p>
            </div>
            <div className="card p-5">
              {err ? (
                <div className="flex flex-col gap-3">
                  <p className="text-[14px] text-danger">{err}</p>
                  <Button variant="secondary" onClick={() => { setErr(null); void run(); }}>{t(lang, "retry")}</Button>
                </div>
              ) : (
                <Stages title={t(lang, "pr_assessing")} steps={tList(lang, "pr_assess_steps")} intervalMs={6000} slowAfterMs={60000} />
              )}
            </div>
          </div>
          <Marginalia className="lg:sticky lg:top-6 lg:h-[calc(100dvh-5rem)] lg:overflow-y-auto">
            <Transcript session={session} title={t(lang, "pr_reread")} />
          </Marginalia>
        </motion.div>
      </div>
    );
  }

  /* ── phase: streaming or final report ── */
  return <ReportView session={session} report={report ?? (partial as Partial<Report>)} streaming={!report} onAgain={again} />;
}

/* Stars that light up one by one. */
/** CJK sets a thin space against Latin, but not against more CJK. The reveal
 *  headline butts a character's name straight against 「一直没说的是」, so a
 *  Latin name needs the gap and 「妈妈」 must not get one. */
function cjkGap(name: string) {
  return /[A-Za-z0-9)\]]$/.test(name) ? name + "\u2009" : name;
}

/* ───────────── Hidden-motive reveal ───────────── */
/**
 * What the other side was actually protecting, and whether you got it out of
 * them. This is the only screen in the app that withholds something and then
 * hands it over, which makes it the one place the simulation reads as a game
 * with a solution rather than a conversation that happened.
 *
 * It doubles as the wait for the report: the assessment streams behind it, so
 * the slowest moment in the loop is spent on its most interesting content
 * instead of a spinner.
 */
function HiddenReveal({
  session,
  characters,
  outcomeKey,
  objectivesMet,
  ready,
  err,
  onRetry,
  onDone,
}: {
  session: Session;
  characters: Character[];
  outcomeKey: string;
  objectivesMet: number;
  ready: boolean;
  err: string | null;
  onRetry: () => void;
  onDone: () => void;
}) {
  const lang = useLang();
  const got = session.revealedAtTurn;
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <div className="min-h-dvh pt-safe px-5 flex flex-col lg:mx-auto lg:w-full lg:max-w-[760px] lg:px-6">
      <div className="flex-1 flex flex-col justify-center gap-7 py-14">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="flex flex-col gap-2">
          <Stars n={objectivesMet} of={session.objectiveDone.length} />
          <h1 className="display text-[26px] leading-tight text-ink-2">{t(lang, outcomeKey as "pr_ended_success")}</h1>
        </motion.div>

        {characters.map((c, i) => (
          <motion.section
            key={c.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 + i * 0.5, ease }}
            className="flex flex-col gap-3"
          >
            <span className="eyebrow text-accent-deep">{t(lang, "pr_reveal_eyebrow")}</span>
            <p className="display text-[21px] leading-snug">{t(lang, "pr_reveal_never", { name: cjkGap(c.name[lang]) })}</p>
            <blockquote className="bg-slab text-slab-ink rounded-2xl px-5 py-4 text-[17px] leading-relaxed">
              {c.hidden![lang]}
            </blockquote>
          </motion.section>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 + characters.length * 0.5 + 0.35 }}
          className="dotted pt-5 flex flex-col gap-1.5"
        >
          <p className={clsx("text-[15px] font-semibold", got ? "text-moss" : "text-ink")}>
            {got ? t(lang, "pr_reveal_got_it", { n: got }) : t(lang, "pr_reveal_missed")}
          </p>
          <p className="text-[13.5px] text-ink-3 leading-relaxed lg:max-w-[var(--measure)]">
            {t(lang, got ? "pr_reveal_got_why" : "pr_reveal_missed_why")}
          </p>
        </motion.div>
      </div>

      <BottomBar className="pb-safe pb-6 pt-3">
        {err ? (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-danger">{err}</p>
            <Button block variant="secondary" onClick={onRetry}>{t(lang, "retry")}</Button>
          </div>
        ) : (
          <Button block size="lg" variant="ink" onClick={onDone} disabled={!ready}>
            {ready ? t(lang, "pr_reveal_to_report") : <><Spinner />{t(lang, "pr_reveal_waiting")}</>}
          </Button>
        )}
      </BottomBar>
    </div>
  );
}


function StarBurst({ n, of }: { n: number; of: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`${n}/${of}`}>
      {Array.from({ length: of }).map((_, i) => (
        <motion.span key={i} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.25 + i * 0.18, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
          <Stars n={i < n ? 1 : 0} of={1} size={38} />
        </motion.span>
      ))}
    </div>
  );
}

function Transcript({ session, title }: { session: Session; title?: string }) {
  const lang = useLang();
  const sc = session.scenario;
  return (
    <section className="flex flex-col gap-3 pb-10">
      {title && <p className="eyebrow">{title}</p>}
      <ol className="flex flex-col gap-2.5">
        {session.messages.filter((m) => m.role !== "coach").map((m) => {
          if (m.role === "event") {
            return <li key={m.id} className="text-[12.5px] italic text-ink-4 pl-6">{m.text}</li>;
          }
          const c = sc.characters.find((x) => x.id === m.characterId);
          const mine = m.role === "learner";
          return (
            <li key={m.id} className={clsx("text-[14px] leading-relaxed", mine && "pl-6")}>
              <span className={clsx("font-semibold mr-1", mine ? "text-accent-deep" : "text-ink-2")}>{mine ? (lang === "zh" ? "你" : "You") : c?.name[lang]}：</span>
              <span className={mine ? "text-ink" : "text-ink-2"}>{m.text}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ReportView({ session, report, streaming, onAgain }: { session: Session; report: Partial<Report>; streaming: boolean; onAgain: () => void }) {
  const lang = useLang();
  const router = useRouter();
  const toast = useToast((s) => s.show);
  const { proficiency, bookmarks, toggleBookmark, addReflection, updateReflection } = useApp();
  const goals = useApp((s) => s.profile?.goals ?? []);
  const sc = session.scenario;
  const [showTranscript, setShowTranscript] = useState(false);
  const theories = (report.knowledge?.theoryIds ?? []).map(theoryById).filter(Boolean);
  const cases = (report.knowledge?.caseIds ?? []).map(caseById).filter(Boolean);
  const strengths = (report.strengths ?? []).filter((s) => s && s.behavior && skillIds.has(s.skill));
  const weaknesses = (report.weaknesses ?? []).filter((w) => w && w.behavior && skillIds.has(w.skill));
  const alternatives = (report.alternatives ?? []).filter((a) => a && a.original && a.better);
  const questions = (report.reflectionQuestions ?? []).filter(Boolean);
  const deltaEntries = (Object.entries(report.deltas ?? {}) as [SkillId, number][]).filter(([k, v]) => (v ?? 0) > 0 && (goals.includes(k) || sc.skills.includes(k)));
  const stars = report.stars ?? session.objectiveDone.filter(Boolean).length;

  const share = async () => {
    const lines = [
      lang === "zh" ? `我在「SocialCoach」练了《${sc.title.zh}》` : `I practiced "${sc.title.en}" on SocialCoach`,
      t(lang, "rp_stars_of", { n: stars, m: sc.objectives.length }),
      strengths[0] ? `${t(lang, "rp_strengths")}: ${strengths[0].behavior}` : "",
      report.nextStep ? `${t(lang, "rp_next_step")}: ${report.nextStep}` : "",
    ].filter(Boolean).join("\n");
    try {
      if (navigator.share) await navigator.share({ text: lines });
      else { await navigator.clipboard.writeText(lines); toast(t(lang, "rp_copied")); }
    } catch {}
  };

  return (
    <div className="min-h-dvh pt-safe pb-36 lg:pb-12 lg:mx-auto lg:w-full lg:max-w-[1000px] xl:max-w-[1120px] lg:px-6">
      <div className="px-3 pt-2 flex items-center justify-between lg:px-0">
        <IconButton label={t(lang, "back")} onClick={() => router.push("/")}><ArrowLeft size={20} /></IconButton>
        <div className="flex items-center gap-1">
          <AnimatePresence>
            {streaming && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2 text-[12px] text-ink-3 pr-2">
                <Spinner />{t(lang, "rp_writing")}
              </motion.span>
            )}
          </AnimatePresence>
          <IconButton label={t(lang, "rp_share")} onClick={share} disabled={streaming} className={streaming ? "opacity-40" : ""}><Share2 size={18} /></IconButton>
        </div>
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-x-12 lg:items-start">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="px-5 flex flex-col gap-9 lg:px-0">
        <header className="flex flex-col gap-3">
          <p className="eyebrow">{t(lang, "rp_title")} · {sc.title[lang]}</p>
          {/* The verdict carries the first screen. Stars and a tally are a score,
              and a score answers a question nobody was asking; they drop below it. */}
          {report.verdict ? (
            <h1 className="display text-[27px] leading-[1.24] text-ink lg:text-[31px]">
              {report.verdict}
              {streaming && !report.summary && <Caret />}
            </h1>
          ) : (
            streaming && <p className="display text-[27px] leading-[1.24] text-ink-4">…</p>
          )}
          <div className="flex items-center gap-3">
            <Stars n={stars} of={sc.objectives.length} size={20} />
            <span className="text-[12px] text-ink-3">{t(lang, "rp_stars_of", { n: stars, m: sc.objectives.length })}</span>
          </div>
          {report.summary && <p className="text-[15px] leading-[1.65] text-ink-2 lg:max-w-[var(--measure)]">{report.summary}{streaming && !strengths.length && <Caret />}</p>}
        </header>

        {(session.stanceTrail?.length ?? 0) > 0 && (
          <Section title={t(lang, "rp_map_title")}>
            <TurnMap session={session} lang={lang} />
          </Section>
        )}

        {strengths.length > 0 && (
          <Section title={t(lang, "rp_strengths")}>
            <ul className="flex flex-col gap-4">
              {strengths.map((s, i) => (
                <Reveal key={i}>
                  <li className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[15px] font-semibold leading-snug">{s.behavior}</p>
                      <SkillTag id={s.skill} lang={lang} small className="shrink-0 mt-0.5" />
                    </div>
                    <Quote text={s.evidence} good session={session} />
                  </li>
                </Reveal>
              ))}
            </ul>
          </Section>
        )}

        {weaknesses.length > 0 && (
          <Section title={t(lang, "rp_weaknesses")}>
            <ul className="flex flex-col gap-5">
              {weaknesses.map((w, i) => (
                <Reveal key={i}>
                  <li className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[15px] font-semibold leading-snug">{w.behavior}</p>
                      <SkillTag id={w.skill} lang={lang} small className="shrink-0 mt-0.5" />
                    </div>
                    <Quote text={w.evidence} session={session} />
                    {w.whyItMatters && <p className="text-[14px] text-ink-2 leading-relaxed">{w.whyItMatters}</p>}
                    {w.deficit && (
                      <div className={clsx("inline-flex items-center gap-2 self-start rounded-full pl-1 pr-3 h-7 text-[12px] font-medium", w.deficit === "acquisition" ? "bg-teal-soft text-teal" : "bg-accent-soft text-accent-deep")} title={t(lang, w.deficit === "acquisition" ? "rp_deficit_acq_hint" : "rp_deficit_perf_hint")}>
                        <span className={clsx("h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px] text-paper", w.deficit === "acquisition" ? "bg-teal" : "bg-accent")}>{w.deficit === "acquisition" ? "?" : "!"}</span>
                        {t(lang, w.deficit === "acquisition" ? "rp_deficit_acq" : "rp_deficit_perf")}
                      </div>
                    )}
                  </li>
                </Reveal>
              ))}
            </ul>
          </Section>
        )}

        {alternatives.length > 0 && (
          <Section title={t(lang, "rp_alternatives")}>
            <ul className="flex flex-col gap-4">
              {alternatives.map((a, i) => (
                <Reveal key={i}>
                  <li className="card p-4 flex flex-col gap-3">
                    <div><span className="eyebrow">{t(lang, "rp_you_said")}</span><p className="text-[14px] text-ink-3 mt-1 leading-relaxed">“{a.original}”</p></div>
                    <div className="hairline" />
                    <div><span className="eyebrow text-moss">{t(lang, "rp_try")}</span><p className="text-[15px] mt-1 leading-relaxed font-medium">“{a.better}”</p></div>
                    {a.why && <p className="text-[13px] text-ink-3 leading-relaxed">{a.why}</p>}
                  </li>
                </Reveal>
              ))}
            </ul>
          </Section>
        )}

        {!streaming && (theories.length > 0 || cases.length > 0) && (
          <Section title={t(lang, "rp_knowledge")} sub={report.knowledge?.whyThis}>
            <div className="flex flex-col gap-3">
              {theories.map((th) => th && <KnowledgeCard key={th.id} kind="theory" title={th.title[lang]} source={`${th.source.book} · ${th.source.author}`} saved={bookmarks.includes(th.id)} onSave={() => toggleBookmark(th.id)}><TheoryBody t={th} /></KnowledgeCard>)}
              {cases.map((c) => c && <KnowledgeCard key={c.id} kind="case" title={c.title[lang]} source={`${c.source.book} · ${c.source.author}`} saved={bookmarks.includes(c.id)} onSave={() => toggleBookmark(c.id)}><CaseBody c={c} /></KnowledgeCard>)}
            </div>
          </Section>
        )}

        {!streaming && questions.length > 0 && (
          <Section title={t(lang, "rp_reflect")} sub={t(lang, "rp_reflect_sub")}>
            <div className="flex flex-col gap-4">
              {questions.map((q, i) => (
                <ReflectItem key={i} session={session} question={q} idx={i} addReflection={addReflection} updateReflection={updateReflection} summary={report.summary ?? ""} />
              ))}
            </div>
          </Section>
        )}

        {!streaming && <FeedbackPrompt />}

        {!streaming && report.nextStep && (
          <section className="bg-slab text-slab-ink rounded-[var(--radius)] p-5 flex flex-col gap-2">
            <span className="eyebrow text-slab-ink/60">{t(lang, "rp_next_step")}</span>
            <p className="display text-[20px] leading-snug">{report.nextStep}</p>
          </section>
        )}

        {!streaming && deltaEntries.length > 0 && (
          <Section title={t(lang, "rp_growth")} sub={t(lang, "rp_growth_note")}>
            <ul className="card divide-y divide-line">
              {deltaEntries.map(([k, v]) => {
                const s = skillById(k);
                return (
                  <li key={k} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1"><p className="text-[14px] font-medium">{s.name[lang]}</p></div>
                    <span className="text-[12px] num text-moss">+{v.toFixed(1)}</span>
                    <Level value={proficiency[k]} color={compColor(s.competency)} />
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {streaming && (
          <div className="flex items-center gap-3 text-[13px] text-ink-3 py-2">
            <Spinner /> {t(lang, "rp_writing_more")}
          </div>
        )}

        {!streaming && (
          <section className="lg:hidden">
            <button onClick={() => setShowTranscript((x) => !x)} className="press inline-flex items-center gap-1.5 text-[13px] text-ink-3 h-8">
              {t(lang, "rp_transcript")} <ChevronDown size={14} className={clsx("transition-transform", showTranscript && "rotate-180")} />
            </button>
            <div className="grid transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: showTranscript ? "1fr" : "0fr" }}>
              <div className="overflow-hidden pt-2"><Transcript session={session} /></div>
            </div>
          </section>
        )}
        {!streaming && (
          <BottomBar className="px-5 pb-safe pb-6 pt-4 flex gap-2 lg:px-0 lg:pb-0">
            <Button block size="lg" variant="ink" onClick={() => router.push("/")}>{t(lang, "rp_back_home")}</Button>
            <Button size="lg" variant="secondary" onClick={onAgain} className="px-4" aria-label={t(lang, "rp_practice_again")}><RotateCcw size={18} /></Button>
          </BottomBar>
        )}
      </motion.div>

      {/* the margin: your own words, so every quoted line can be checked against the source */}
      <Marginalia lgOnly className="lg:sticky lg:top-6 lg:h-[calc(100dvh-5rem)] lg:overflow-y-auto">
        <Transcript session={session} title={t(lang, "rp_transcript")} />
      </Marginalia>
      </div>
    </div>
  );
}

function Caret() {
  return <span className="inline-block w-[2px] h-[1em] bg-accent align-[-0.15em] ml-0.5 animate-pulse" aria-hidden />;
}

function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="display text-[20px] leading-tight">{title}</h2>
        {sub && <p className="text-[13px] text-ink-3 leading-relaxed">{sub}</p>}
      </div>
      {children}
    </motion.section>
  );
}

function Quote({ text, good, session }: { text?: string; good?: boolean; session: Session }) {
  const lang = useLang();
  if (!text) return null;
  const norm = (x: string) => x.replace(/[\s“”"'‘’。，,.!！?？…—-]/g, "");
  const said = norm(text);
  const isQuote = said.length > 0 && session.messages.some((m) => m.role === "learner" && norm(m.text).includes(said.slice(0, Math.min(said.length, 12))));
  return (
    <p className="text-[14px] leading-relaxed text-ink-2">
      <span className="eyebrow mr-2">{t(lang, "rp_evidence")}</span>
      {isQuote ? <span className={good ? "mark-good" : "mark-quote"}>“{text}”</span> : <span className="italic text-ink-3">{text.replace(/^no attempt\s*[—-]*\s*/i, "")}</span>}
    </p>
  );
}

function KnowledgeCard({ kind, title, source, saved, onSave, children }: { kind: "theory" | "case"; title: string; source: string; saved: boolean; onSave: () => void; children: React.ReactNode }) {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="press w-full text-left p-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className={clsx("eyebrow", kind === "theory" ? "text-teal" : "text-accent-deep")}>{t(lang, kind === "theory" ? "rp_theory" : "rp_case")}</span>
          <ChevronDown size={16} className={clsx("text-ink-4 transition-transform", open && "rotate-180")} />
        </div>
        <p className="display text-[17px] leading-snug">{title}</p>
        <p className="text-[12px] text-ink-3">{t(lang, "rp_from")} {source}</p>
      </button>
      <div className="grid transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 flex flex-col gap-3">
            {children}
            <button onClick={onSave} className={clsx("press self-start h-8 px-3 rounded-full border text-[12px] font-medium inline-flex items-center gap-1.5", saved ? "bg-ink text-paper border-ink" : "border-line-strong")}>
              <Bookmark size={13} fill={saved ? "currentColor" : "none"} />{saved ? t(lang, "ln_bookmarked") : t(lang, "ln_bookmark")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReflectItem({ session, question, idx, addReflection, updateReflection, summary }: { session: Session; question: string; idx: number; addReflection: (id: string, r: { question: string; answer: string }) => void; updateReflection: (id: string, idx: number, patch: { coachReply?: string }) => void; summary: string }) {
  const lang = useLang();
  const existing = useMemo(() => session.reflections.find((r) => r.question === question), [session.reflections, question]);
  const rIdx = session.reflections.findIndex((r) => r.question === question);
  const [text, setText] = useState(existing?.answer ?? "");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<string | null>(null);
  const strip = (x: string) => x.replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|\s)\*(\S.*?)\*/g, "$1$2");

  const submit = async () => {
    const answer = text.trim();
    if (!answer || busy) return;
    setBusy(true);
    let index = rIdx;
    if (index === -1) {
      addReflection(session.id, { question, answer });
      track({ name: "reflect", ts: Date.now(), session: session.id, index: idx });
      index = session.reflections.length;
    }
    try {
      const reply = await reflectStream({ scenario: session.scenario, question, answer, lang, summary }, (acc) => setLive(strip(acc)));
      updateReflection(session.id, index, { coachReply: strip(reply).trim() });
    } catch {
      updateReflection(session.id, index, { coachReply: undefined });
    } finally {
      setBusy(false);
      setLive(null);
    }
  };
  const reply = existing?.coachReply ?? live;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] leading-relaxed font-medium"><span className="num text-ink-4 mr-2">{idx + 1}</span>{question}</p>
      {existing?.coachReply ? (
        <>
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap pl-5 text-ink-2">{existing.answer}</p>
          <p className="bubble-coach px-4 py-3 text-[14px] leading-relaxed">{existing.coachReply}</p>
        </>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={t(lang, "rp_reflect_ph")} className="flex-1 px-3.5 py-2.5 rounded-2xl bg-card border border-line text-[14px] leading-relaxed placeholder:text-ink-4 focus:border-ink transition-colors" disabled={busy} />
            <button onClick={submit} disabled={!text.trim() || busy} aria-label={t(lang, "rp_send")} className="press h-10 w-10 shrink-0 rounded-full bg-ink text-paper inline-flex items-center justify-center disabled:opacity-30">
              {busy && !reply ? <Spinner /> : <Send size={16} />}
            </button>
          </div>
          {reply && <p className="bubble-coach px-4 py-3 text-[14px] leading-relaxed">{reply}</p>}
        </>
      )}
    </div>
  );
}
