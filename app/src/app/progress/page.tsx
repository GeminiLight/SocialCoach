"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Check, MessageCircle, Plus } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Chip, Page, SectionTitle, Sheet, Stars } from "@/components/ui";
import { Radar } from "@/components/Radar";
import { Footprint } from "@/components/Footprint";
import { PatternCard } from "@/components/PatternCard";
import { Level } from "@/components/SkillBits";
import { ScenarioCover } from "@/components/ScenarioCover";
import { computeStreak, useApp, useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";
import { competencyValues, sessionMinutes } from "@/lib/session-utils";
import { COMPETENCIES, SKILLS, skillById, type SkillId } from "@/data/taxonomy";
import { compColor, relDate } from "@/lib/format";

export default function Progress() {
  const lang = useLang();
  const { profile, proficiency, sessions, practiceDays, updateProfile, setProficiency } = useApp();
  const streak = computeStreak(practiceDays);
  const [addOpen, setAddOpen] = useState(false);
  const done = useMemo(() => sessions.filter((s) => s.status === "assessed"), [sessions]);
  const minutes = done.reduce((a, s) => a + sessionMinutes(s), 0);
  const stars = done.reduce((a, s) => a + (s.report?.stars ?? 0), 0);
  const vals = competencyValues(proficiency);
  const journal = useMemo(
    () => done.flatMap((s) => s.reflections.filter((r) => r.answer.trim()).map((r) => ({ ...r, session: s }))),
    [done],
  );

  /** Cumulative change recorded in all completed reports. */
  const gains = useMemo(() => {
    const g: Partial<Record<SkillId, number>> = {};
    for (const s of done)
      for (const [k, v] of Object.entries(s.report?.deltas ?? {})) g[k as SkillId] = +((g[k as SkillId] ?? 0) + (v ?? 0)).toFixed(2);
    return g;
  }, [done]);

  if (!profile) return null;
  const addGoal = (id: SkillId) => {
    if (profile.goals.includes(id)) return;
    updateProfile({ goals: [...profile.goals, id] });
    if (proficiency[id] == null) setProficiency({ ...proficiency, [id]: 2.5 });
  };

  return (
    <Shell>
      <Page className="pt-4 flex flex-col gap-8 lg:pt-9 lg:grid lg:grid-cols-2 lg:gap-x-0 lg:gap-y-12">
        <header className="lg:col-span-2 border-b border-line pb-6 lg:pb-8">
          <p className="eyebrow text-accent mb-3">{t(lang, "pg_title")}</p>
          <h1 className="display text-[28px] sm:text-[32px] lg:text-[38px] leading-snug text-balance">{t(lang, "pg_heading")}</h1>
          <p className="mt-3 text-[14px] text-ink-3 leading-relaxed">{t(lang, "pg_intro")}</p>
        </header>

        {/* Above the totals: totals are inventory, this is a finding about them. */}
        <section className="lg:col-span-2 order-0" aria-label={t(lang, "pg_pattern_title")}>
          <PatternCard />
        </section>

        <div className="contents lg:flex lg:flex-col lg:gap-10 lg:pr-10 min-w-0">
          <section className="order-1 flex flex-col gap-4" aria-label={t(lang, "pg_overview")}>
            <p className="eyebrow text-ink-3">{t(lang, "pg_overview")}</p>
            <div className="grid grid-cols-3 divide-x divide-line">
              {[
                [done.length, "pg_sessions"],
                [minutes, "pg_minutes"],
                [stars, "pg_stars"],
              ].map(([v, k], i) => (
                <div key={k as string} className="flex flex-col gap-2 px-4 first:pl-0 sm:px-6">
                  <span className={`num text-[36px] lg:text-[46px] leading-none ${i === 0 ? "text-accent" : "text-ink"}`}>
                    {v as number}
                  </span>
                  <span className="text-[12px] text-ink-3" title={k === "pg_stars" ? t(lang, "pg_star_label") : undefined}>
                    {t(lang, k as "pg_sessions")}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* the page is about change over time, so it needs a time axis */}
          <section className="order-2 flex flex-col gap-3">
            <SectionTitle
              right={
                <span className="text-[12px] text-ink-3 num">
                  {streak > 0 ? t(lang, "pg_footprint_streak", { n: streak }) : t(lang, "pg_footprint_total", { n: practiceDays.length })}
                </span>
              }
            >
              {t(lang, "pg_footprint")}
            </SectionTitle>
            <div className="card p-4 lg:p-5 flex flex-col gap-3">
              <Footprint days={practiceDays} />
            </div>
          </section>

          <section className="order-5 flex flex-col gap-3">
            <SectionTitle>{t(lang, "pg_history")}</SectionTitle>
            {done.length === 0 ? (
              <div className="growth-invitation rounded-2xl p-5 sm:p-6">
                <MessageCircle size={24} className="text-accent mb-5" strokeWidth={1.5} aria-hidden="true" />
                <h3 className="display text-[20px]">{t(lang, "pg_first_title")}</h3>
                <p className="text-[13px] text-ink-2 leading-relaxed mt-2 mb-5 max-w-[var(--measure)]">{t(lang, "pg_first_body")}</p>
                <Link
                  href="/arena"
                  className="press min-h-11 px-4 gap-3 inline-flex items-center rounded-full bg-ink text-paper text-[13px] font-semibold"
                >
                  {t(lang, "home_start")}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {done.map((s) => (
                  <li key={s.id}>
                    <Link href={`/practice/${s.id}`} className="press card card-link flex items-center gap-3 p-3">
                      <ScenarioCover scenario={s.scenario} size={44} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium truncate">{s.scenario.title[lang]}</p>
                        <p className="text-[12px] text-ink-3 num">
                          {relDate(s.startedAt, lang)} · {sessionMinutes(s)} {t(lang, "min")}
                        </p>
                      </div>
                      <Stars n={s.report?.stars ?? 0} size={14} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="order-6 flex flex-col gap-3">
            <SectionTitle>{t(lang, "pg_journal")}</SectionTitle>
            {journal.length === 0 ? (
              <div className="flex gap-3 border-y border-line py-5">
                <BookOpen size={20} className="shrink-0 text-ink-3 mt-0.5" strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <h3 className="text-[14px] font-medium">{t(lang, "pg_journal_title")}</h3>
                  <p className="text-[13px] text-ink-3 leading-relaxed mt-1">{t(lang, "pg_journal_body")}</p>
                </div>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {journal.slice(0, 20).map((j, i) => (
                  <li key={i} className="card p-4 flex flex-col gap-2">
                    <p className="text-[12px] text-ink-3">
                      {relDate(j.session.startedAt, lang)} · {j.session.scenario.title[lang]}
                    </p>
                    <p className="text-[13px] text-ink-2 italic leading-snug">{j.question}</p>
                    <p className="text-[14px] leading-relaxed whitespace-pre-wrap lg:max-w-[var(--measure)]">{j.answer}</p>
                    {j.coachReply && <p className="text-[13px] leading-relaxed bubble-coach px-3 py-2 mt-1">{j.coachReply}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-10 min-w-0 lg:border-l lg:border-line lg:pl-10">
          <section className="order-3 flex flex-col gap-3">
            <SectionTitle
              right={
                <span className="text-[11px] text-ink-3 num">
                  {t(lang, "pg_covered", { n: Object.values(vals).filter((v) => v != null).length })}
                </span>
              }
            >
              {t(lang, "pg_radar")}
            </SectionTitle>
            <div className="card p-4 sm:p-5">
              <div className="w-full max-w-[340px] mx-auto">
                <Radar values={vals} lang={lang} size={300} />
              </div>
              <p className="text-[12px] leading-relaxed text-ink-3 border-t border-line pt-3">
                {t(lang, done.length === 0 ? "pg_baseline" : "pg_estimate")}
              </p>
              {Object.values(vals).some((v) => v == null) && (
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">{t(lang, "pg_missing")}</p>
              )}
            </div>
          </section>

          <section className="order-4 flex flex-col gap-3">
            <SectionTitle
              right={
                <button onClick={() => setAddOpen(true)} className="press inline-flex items-center gap-1 text-[12px] text-ink-2 min-h-11">
                  <Plus size={14} />
                  {t(lang, "pg_add_goal")}
                </button>
              }
            >
              {t(lang, "pg_skills")}
            </SectionTitle>
            <ul className="card divide-y divide-line">
              {profile.goals.map((g) => {
                const s = skillById(g);
                const gain = gains[g];
                return (
                  <li key={g} className="p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: compColor(s.competency) }} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-semibold">{s.name[lang]}</h3>
                        <p className="mt-1 text-[12px] text-ink-3 leading-relaxed">{s.behavior[lang]}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pl-5">
                      <div className="flex items-center gap-2" title={t(lang, "pg_estimated_level")}>
                        <Level
                          value={proficiency[g]}
                          from={gain && gain > 0 ? (proficiency[g] ?? 0) - gain : undefined}
                          color={compColor(s.competency)}
                        />
                        <span className="text-[12px] num text-ink-2">
                          {proficiency[g]?.toFixed(1) ?? "–"}
                          <span className="text-ink-3"> / 5</span>
                        </span>
                        {!!gain && (
                          <span className="text-[11px] num text-ink-3" title={t(lang, "pg_gain")}>
                            {gain > 0 ? "+" : ""}
                            {gain.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/arena?skill=${g}`}
                        className="press inline-flex items-center gap-1 min-h-11 text-[12px] font-medium text-action"
                        aria-label={`${t(lang, "pg_practice_skill")} · ${s.name[lang]}`}
                      >
                        {t(lang, "pg_practice_skill")}
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </Page>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title={t(lang, "pg_add_goal")}>
        <div className="flex flex-col gap-4 pt-2">
          <p className="text-[13px] text-ink-3" role="status">
            {t(lang, "pg_selected_goals", { n: profile.goals.length })}
          </p>
          {COMPETENCIES.map((c) => (
            <div key={c.id} className="flex flex-col gap-2">
              <span className="eyebrow" style={{ color: compColor(c.id, 0.45, 0.09) }}>
                {c.name[lang]}
              </span>
              <div className="flex flex-wrap gap-2">
                {SKILLS.filter((s) => s.competency === c.id).map((s) => (
                  <Chip key={s.id} active={profile.goals.includes(s.id)} onClick={() => addGoal(s.id)}>
                    {profile.goals.includes(s.id) && <Check size={12} aria-hidden="true" />}
                    {s.name[lang]}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Sheet>
    </Shell>
  );
}
