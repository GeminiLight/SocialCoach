"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, Clock3, PenLine, RefreshCw } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Button, Page, SectionTitle, Stages, Stars } from "@/components/ui";
import { Level, SkillTag } from "@/components/SkillBits";
import { computeStreak, todayKey, useApp, useLang } from "@/store/useApp";
import { t, tList } from "@/lib/i18n";
import { schedule } from "@/lib/client-api";
import { buildSession, historyFor } from "@/lib/session-utils";
import { skillById, contextById } from "@/data/taxonomy";
import { compColor, relDate } from "@/lib/format";
import { ScenarioCover } from "@/components/ScenarioCover";

export default function Home() {
  const lang = useLang();
  const router = useRouter();
  const { profile, proficiency, sessions, practiceDays, todaySessionId, todayDate, addSession, setToday, removeSession, pruneSessions } =
    useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const today = todayKey();
  const todaySession = useMemo(
    () => (todayDate === today ? (sessions.find((s) => s.id === todaySessionId) ?? null) : null),
    [sessions, todaySessionId, todayDate, today],
  );
  const streak = computeStreak(practiceDays);
  const unfinished = sessions.find((s) => s.id !== todaySessionId && s.status === "active" && s.messages.some((m) => m.role === "learner"));
  /** Last session's verdict, to fill today's wait with something worth reading. */
  const lastVerdict = useMemo(() => {
    const last = [...sessions].reverse().find((x) => x.status === "assessed" && x.report?.verdict);
    if (!last) return null;
    const trail = last.stanceTrail ?? [];
    const gaveGroundOn: number[] = [];
    trail.forEach((v, i) => {
      if (v < (i === 0 ? 20 : trail[i - 1])) gaveGroundOn.push(i + 1);
    });
    return { verdict: last.report!.verdict, title: last.scenario.title[lang], gaveGroundOn };
  }, [sessions, lang]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "home_greeting_morning" : hour < 18 ? "home_greeting_afternoon" : "home_greeting_evening";

  const planToday = useCallback(async () => {
    if (!profile || inflight.current) return;
    inflight.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await schedule({ profile, proficiency, history: historyFor(sessions, lang), lang });
      const s = buildSession(res.scenario, "scheduled", lang, res);
      // A swapped-away pick that was never started leaves no trace.
      const prev = sessions.find((x) => x.id === todaySessionId);
      if (prev && prev.status === "briefing") removeSession(prev.id);
      addSession(s);
      setToday(s.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(lang, "error_generic"));
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  }, [profile, proficiency, sessions, lang, addSession, setToday, removeSession, todaySessionId]);

  useEffect(() => {
    pruneSessions();
  }, [pruneSessions]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kick off an async request on mount
    if (profile && !todaySession && !loading && !error) void planToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, todaySession]);

  if (!profile) return null;
  const recent = sessions.filter((s) => s.status === "assessed").slice(0, 3);

  return (
    <Shell>
      <Page className="pt-5 lg:pt-10 flex flex-col gap-7 lg:gap-9">
        {/* header */}
        <header className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-line">
          <div>
            <p className="eyebrow text-accent-deep">
              {t(lang, greet)}
              {profile.name ? `, ${profile.name}` : ""}
            </p>
            <h1 className="display text-[32px] lg:text-[38px] leading-tight mt-3">{t(lang, "home_today")}</h1>
            <p className="text-[14px] text-ink-3 mt-3">{t(lang, "home_intro")}</p>
          </div>
          <Link
            href="/arena"
            className="press flex items-center gap-2 min-h-11 text-[13px] font-medium text-ink-2 rounded-full px-3 hover:bg-inset"
          >
            {t(lang, "home_browse")}
            <ArrowUpRight size={16} />
          </Link>
        </header>
        <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_var(--margin-w)] xl:gap-8 xl:items-start">
          <div className="flex flex-col gap-6 min-w-0">
            {unfinished && (
              <Link
                href={`/practice/${unfinished.id}`}
                className="press flex items-center gap-3 rounded-[var(--radius-sm)] border border-line px-4 py-3 hover:bg-inset"
              >
                <Clock3 size={18} className="text-accent-deep shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-ink-3">{t(lang, "home_resume")}</span>
                  <span className="block text-[14px] font-medium truncate">{unfinished.scenario.title[lang]}</span>
                </span>
                <ArrowRight size={16} />
              </Link>
            )}

            {/* Today card */}
            <section aria-live="polite" aria-busy={loading}>
              {loading && (
                <div className="card p-6 lg:p-8 min-h-80 flex flex-col justify-center gap-7">
                  <Stages title={t(lang, "home_scheduling")} steps={tList(lang, "home_scheduling_steps")} slowAfterMs={25000} />
                  {/* The first thing anyone sees on their first visit of the day used
                      to be ten seconds of a four-step checklist. The wait is the
                      right length; what was wrong is that it carried nothing. Last
                      session's verdict is exactly what to have in mind before the
                      next one, so it goes here instead of a spinner. */}
                  {lastVerdict && (
                    <div className="dotted pt-5 flex flex-col gap-1.5">
                      <p className="eyebrow">{t(lang, "home_last_time")}</p>
                      <p className="display text-[17px] leading-snug text-ink-2">{lastVerdict.verdict}</p>
                      {lastVerdict.gaveGroundOn.length > 0 && (
                        <p className="text-[12.5px] text-ink-3">
                          {t(lang, "home_last_gave", { n: lastVerdict.gaveGroundOn.join("、"), title: lastVerdict.title })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {error && !loading && (
                <div className="card p-5 flex flex-col gap-3">
                  {todaySession && <p className="text-[14px] text-ink-2">{t(lang, "home_swap_error")}</p>}
                  <p className="text-[14px] text-danger">{error}</p>
                  <Button variant="secondary" onClick={planToday}>
                    <RefreshCw size={16} />
                    {t(lang, "retry")}
                  </Button>
                </div>
              )}
              {todaySession && !loading && (
                <TodayCard session={todaySession} onStart={() => router.push(`/practice/${todaySession.id}`)} onSwap={planToday} />
              )}
            </section>

            <Link href="/rehearse" className="press group flex items-start gap-4 rounded-[var(--radius)] rehearsal-invitation p-5 lg:p-6">
              <span className="h-11 w-11 rounded-xl bg-card border border-line flex items-center justify-center shrink-0">
                <PenLine size={20} className="text-accent-deep" aria-hidden />
              </span>
              <div className="flex-1">
                <h2 className="display text-[19px] leading-snug">{t(lang, "home_rehearse_title")}</h2>
                <p className="text-[13px] text-ink-2 mt-2 leading-relaxed max-w-[var(--measure)]">{t(lang, "home_rehearse_sub")}</p>
              </div>
              <ArrowUpRight size={18} className="mt-1 text-ink-3 shrink-0 group-hover:text-accent-deep" />
            </Link>
          </div>

          {/* the margin: what you are working on, and what you have already done */}
          <aside className="min-w-0 flex flex-col gap-7 xl:pl-6 xl:border-l xl:border-dashed xl:border-line-strong">
            <PracticeWeek days={practiceDays} streak={streak} />
            {/* skills */}
            <section className="flex flex-col gap-3">
              <SectionTitle
                right={
                  <Link href="/progress" className="press min-h-11 inline-flex items-center text-[12px] text-action">
                    {t(lang, "nav_progress")} →
                  </Link>
                }
              >
                {t(lang, "home_skills_title")}
              </SectionTitle>
              <ul className="card divide-y divide-line lg:bg-transparent lg:border-0 lg:rounded-none">
                {profile.goals.map((g) => {
                  const s = skillById(g);
                  return (
                    <li key={g} className="flex items-center justify-between gap-3 px-4 h-12 lg:px-0">
                      <span className="text-[14px] font-medium">{s.name[lang]}</span>
                      <Level value={proficiency[g]} color={compColor(s.competency)} />
                    </li>
                  );
                })}
              </ul>
              <p className="text-[12px] text-ink-3 leading-relaxed">{t(lang, "home_estimate")}</p>
            </section>

            {/* recent */}
            {recent.length > 0 && (
              <section className="flex flex-col gap-3">
                <SectionTitle>{t(lang, "home_recent")}</SectionTitle>
                <ul className="flex flex-col gap-2 lg:gap-0 lg:divide-y lg:divide-line">
                  {recent.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/practice/${s.id}`}
                        className="press card card-link flex items-center gap-3 p-3 lg:bg-transparent lg:border-0 lg:rounded-none lg:px-0 lg:py-2.5"
                      >
                        <ScenarioCover scenario={s.scenario} size={44} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium truncate">{s.scenario.title[lang]}</p>
                          <p className="text-[12px] text-ink-3">
                            {relDate(s.startedAt, lang)} · {contextById(s.scenario.context).name[lang]}
                          </p>
                        </div>
                        <Stars n={s.report?.stars ?? 0} size={14} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {recent.length === 0 && (
              <section className="border-t border-line pt-5">
                <h2 className="display text-[17px] leading-snug">{t(lang, "home_first_report")}</h2>
                <p className="text-[13px] text-ink-3 leading-relaxed mt-2">{t(lang, "home_first_report_body")}</p>
              </section>
            )}
          </aside>
        </div>
      </Page>
    </Shell>
  );
}

function TodayCard({ session, onStart, onSwap }: { session: ReturnType<typeof buildSession>; onStart: () => void; onSwap: () => void }) {
  const lang = useLang();
  const [why, setWhy] = useState(false);
  const sc = session.scenario;
  const done = session.status === "assessed";
  const active = session.status === "active" || session.status === "ended";
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card overflow-hidden lg:grid lg:grid-cols-[38%_minmax(0,1fr)] lg:min-h-[360px]"
    >
      <div className="relative h-44 bg-paper-deep lg:h-auto lg:border-r lg:border-line">
        <ScenarioCover scenario={sc} size={160} full className="lg:hidden" />
        <ScenarioCover scenario={sc} tall className="hidden lg:block" />
        <div className="absolute left-4 top-4 flex gap-2">
          <span className="h-7 px-2.5 inline-flex items-center rounded-full bg-paper/90 text-[12px] font-medium">
            {t(lang, "scheduled_badge")}
          </span>
          <span className="h-7 px-2.5 inline-flex items-center rounded-full bg-paper/90 text-[12px] font-medium">
            {contextById(sc.context).name[lang]}
          </span>
        </div>
      </div>
      <div className="p-5 flex flex-col gap-4 lg:p-6 lg:gap-5 lg:justify-center min-w-0">
        <div>
          <h2 className="display text-[24px] lg:text-[28px] leading-tight">{sc.title[lang]}</h2>
          <p className="text-[14px] lg:text-[15.5px] text-ink-2 mt-2 lg:mt-3 leading-relaxed lg:max-w-[var(--measure)]">{sc.hook[lang]}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sc.skills.slice(0, 3).map((k) => (
            <SkillTag key={k} id={k} lang={lang} />
          ))}
          <span className="h-7 px-2.5 inline-flex items-center rounded-full bg-inset text-[12px] text-ink-3 num">
            {sc.minutes} {t(lang, "min")} · {t(lang, `diff_${sc.difficulty}` as "diff_1")}
          </span>
        </div>
        {(session.adaptation?.why || session.prescription?.rationale) && (
          <div>
            <button
              aria-expanded={why}
              aria-controls="today-rationale"
              onClick={() => setWhy((w) => !w)}
              className="press text-[13px] font-medium text-teal inline-flex items-center gap-1 min-h-11 -ml-1 px-1 rounded"
            >
              {t(lang, "home_why")} <span className={`transition-transform ${why ? "rotate-90" : ""}`}>›</span>
            </button>
            <div id="today-rationale" hidden={!why}>
              <div className="overflow-hidden">
                <p className="text-[14px] text-ink-2 leading-relaxed bg-teal-soft rounded-xl px-4 py-3 mt-1 lg:max-w-[var(--measure)]">
                  {session.adaptation?.why || session.prescription?.rationale}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 pt-1 lg:max-w-[440px]">
          <div className="flex gap-2">
            <Button block size="lg" variant={done ? "secondary" : "primary"} onClick={onStart}>
              {done ? t(lang, "home_view_report") : active ? t(lang, "home_continue") : t(lang, "home_start")}
              <ArrowRight size={18} />
            </Button>
            {!active && !done && (
              <Button
                size="lg"
                variant="ghost"
                onClick={onSwap}
                aria-label={t(lang, "home_pick_other")}
                className="px-3 shrink-0 whitespace-nowrap"
              >
                <RefreshCw size={16} />
                <span className="text-[12px]">{t(lang, "home_pick_other")}</span>
              </Button>
            )}
          </div>
          {done && (
            <Button block size="md" variant="ghost" onClick={onSwap} className="text-ink-2">
              <RefreshCw size={16} />
              {t(lang, "home_another")}
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function PracticeWeek({ days, streak }: { days: string[]; streak: number }) {
  const lang = useLang();
  const now = new Date();
  const today = todayKey(now);
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + index);
    return { date, key: todayKey(date) };
  });
  const practiced = week.filter((day) => days.includes(day.key)).length;
  return (
    <section>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="display text-[20px]">{t(lang, "home_week")}</h2>
        <span className="text-[12px] text-ink-3 num">{t(lang, "home_week_count", { n: practiced })}</span>
      </div>
      <ol className="grid grid-cols-7 mt-4">
        {week.map(({ date, key }) => {
          const done = days.includes(key);
          const label = `${date.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", weekday: "long" })} · ${t(lang, done ? "home_day_done" : "home_day_empty")}`;
          return (
            <li key={key} aria-label={label} aria-current={key === today ? "date" : undefined} className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-ink-3">
                {date.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { weekday: "narrow" })}
              </span>
              <span
                className={`h-7 w-7 rounded-full inline-flex items-center justify-center border text-[11px] num ${done ? "bg-moss text-paper border-moss" : key === today ? "border-accent-deep text-accent-deep" : "border-line text-ink-3"}`}
              >
                {done ? <Check size={13} aria-hidden /> : date.getDate()}
              </span>
            </li>
          );
        })}
      </ol>
      {streak > 0 && <p className="text-[12px] text-ink-3 mt-3 num">{t(lang, "home_streak", { n: streak })}</p>}
    </section>
  );
}
