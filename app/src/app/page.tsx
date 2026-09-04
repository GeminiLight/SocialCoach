"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Flame, RefreshCw, Sparkles } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Button, Marginalia, Page, SectionTitle, Stages, Stars } from "@/components/ui";
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
  const { profile, proficiency, sessions, practiceDays, todaySessionId, todayDate, addSession, setToday, removeSession, pruneSessions } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const today = todayKey();
  const todaySession = useMemo(() => (todayDate === today ? sessions.find((s) => s.id === todaySessionId) ?? null : null), [sessions, todaySessionId, todayDate, today]);
  const streak = computeStreak(practiceDays);
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
      <Page className="pt-4 lg:pt-9 flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-x-10 lg:gap-y-12 lg:items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-10">
        {/* header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{t(lang, greet)}{profile.name ? `, ${profile.name}` : ""}</p>
            <h1 className="display text-[30px] lg:text-[38px] leading-tight mt-1">{t(lang, "home_today")}</h1>
          </div>
          <div className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-line bg-card text-[13px] font-medium" title={t(lang, "home_streak", { n: streak })}>
            <Flame size={16} className={streak > 0 ? "text-accent" : "text-ink-4"} fill={streak > 0 ? "var(--accent)" : "none"} />
            <span className="num">{streak > 0 ? t(lang, "home_streak", { n: streak }) : t(lang, "home_streak_zero")}</span>
          </div>
        </header>

        {/* Today card */}
        <section aria-live="polite">
          {loading && (
            <div className="card p-5">
              <Stages title={t(lang, "home_scheduling")} steps={tList(lang, "home_scheduling_steps")} slowAfterMs={25000} />
            </div>
          )}
          {error && !loading && (
            <div className="card p-5 flex flex-col gap-3">
              <p className="text-[14px] text-danger">{error}</p>
              <Button variant="secondary" onClick={planToday}><RefreshCw size={16} />{t(lang, "retry")}</Button>
            </div>
          )}
          {todaySession && !loading && (
            <TodayCard
              session={todaySession}
              onStart={() => router.push(`/practice/${todaySession.id}`)}
              onSwap={planToday}
            />
          )}
        </section>

        {/* Rehearse */}
        <Link href="/rehearse" className="press block rounded-[var(--radius)] bg-ink text-paper p-5 relative overflow-hidden">
          <span className="absolute -right-6 -top-6 h-28 w-28 rounded-full" style={{ background: "oklch(0.6 0.155 40 / 0.35)" }} />
          <span className="absolute right-10 top-10 h-16 w-16 rounded-full" style={{ background: "oklch(0.6 0.155 40 / 0.25)" }} />
          <div className="relative flex items-start gap-3">
            <Sparkles size={20} className="mt-1 text-accent-soft shrink-0" />
            <div className="flex-1">
              <p className="display text-[19px] leading-tight">{t(lang, "home_rehearse_title")}</p>
              <p className="text-[13px] text-paper/70 mt-1.5 leading-snug max-w-[30ch]">{t(lang, "home_rehearse_sub")}</p>
            </div>
            <ArrowRight size={18} className="mt-1 text-paper/70" />
          </div>
        </Link>

        </div>

        {/* the margin: what you are working on, and what you have already done */}
        <Marginalia>
        {/* skills */}
        <section className="flex flex-col gap-3">
          <SectionTitle right={<Link href="/progress" className="text-[13px] text-ink-3">{t(lang, "nav_progress")} →</Link>}>{t(lang, "home_skills_title")}</SectionTitle>
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
        </section>

        {/* recent */}
        {recent.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionTitle>{t(lang, "home_recent")}</SectionTitle>
            <ul className="flex flex-col gap-2 lg:gap-0 lg:divide-y lg:divide-line">
              {recent.map((s) => (
                <li key={s.id}>
                  <Link href={`/practice/${s.id}`} className="press card card-link flex items-center gap-3 p-3 lg:bg-transparent lg:border-0 lg:rounded-none lg:px-0 lg:py-2.5">
                    <ScenarioCover scenario={s.scenario} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate">{s.scenario.title[lang]}</p>
                      <p className="text-[12px] text-ink-3">{relDate(s.startedAt, lang)} · {contextById(s.scenario.context).name[lang]}</p>
                    </div>
                    <Stars n={s.report?.stars ?? 0} size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        </Marginalia>
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
    <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="card overflow-hidden lg:grid lg:grid-cols-[42%_minmax(0,1fr)] lg:min-h-[320px]">
      <div className="relative h-40 bg-paper-deep lg:h-auto">
        <ScenarioCover scenario={sc} size={160} full className="lg:hidden" />
        <ScenarioCover scenario={sc} tall className="hidden lg:block" />
        <div className="absolute left-4 top-4 flex gap-2">
          <span className="h-7 px-2.5 inline-flex items-center rounded-full bg-paper/90 text-[12px] font-medium">{t(lang, "scheduled_badge")}</span>
          <span className="h-7 px-2.5 inline-flex items-center rounded-full bg-paper/90 text-[12px] font-medium">{contextById(sc.context).glyph} {contextById(sc.context).name[lang]}</span>
        </div>
      </div>
      <div className="p-5 flex flex-col gap-4 lg:p-8 lg:gap-5 lg:justify-center">
        <div>
          <h2 className="display text-[24px] lg:text-[32px] leading-tight">{sc.title[lang]}</h2>
          <p className="text-[14px] lg:text-[15.5px] text-ink-2 mt-2 lg:mt-3 leading-relaxed lg:max-w-[var(--measure)]">{sc.hook[lang]}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sc.skills.slice(0, 3).map((k) => <SkillTag key={k} id={k} lang={lang} />)}
          <span className="h-7 px-2.5 inline-flex items-center rounded-full bg-inset text-[12px] text-ink-3 num">{sc.minutes} {t(lang, "min")} · {t(lang, `diff_${sc.difficulty}` as "diff_1")}</span>
        </div>
        {(session.adaptation?.why || session.prescription?.rationale) && (
          <div>
            <button onClick={() => setWhy((w) => !w)} className="press text-[13px] font-medium text-teal inline-flex items-center gap-1 h-8 -ml-1 px-1 rounded">
              {t(lang, "home_why")} <span className={`transition-transform ${why ? "rotate-90" : ""}`}>›</span>
            </button>
            <div className="grid transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: why ? "1fr" : "0fr" }}>
              <div className="overflow-hidden">
                <p className="text-[14px] text-ink-2 leading-relaxed bg-teal-soft rounded-xl px-4 py-3 mt-1 lg:max-w-[var(--measure)]">{session.adaptation?.why || session.prescription?.rationale}</p>
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
              <Button size="lg" variant="ghost" onClick={onSwap} aria-label={t(lang, "home_pick_other")} className="px-4">
                <RefreshCw size={18} />
              </Button>
            )}
          </div>
          {done && (
            <Button block size="md" variant="ghost" onClick={onSwap} className="text-ink-2">
              <RefreshCw size={16} />{t(lang, "home_another")}
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
