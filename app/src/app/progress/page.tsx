"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Chip, Empty, Page, SectionTitle, Sheet, Stars } from "@/components/ui";
import { Radar } from "@/components/Radar";
import { Level } from "@/components/SkillBits";
import { ScenarioCover } from "@/components/ScenarioCover";
import { useApp, useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";
import { competencyValues, sessionMinutes } from "@/lib/session-utils";
import { COMPETENCIES, SKILLS, skillById, type SkillId } from "@/data/taxonomy";
import { compColor, relDate } from "@/lib/format";

export default function Progress() {
  const lang = useLang();
  const { profile, proficiency, sessions, updateProfile, setProficiency } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const done = useMemo(() => sessions.filter((s) => s.status === "assessed"), [sessions]);
  const minutes = done.reduce((a, s) => a + sessionMinutes(s), 0);
  const stars = done.reduce((a, s) => a + (s.report?.stars ?? 0), 0);
  const vals = competencyValues(proficiency);
  const journal = useMemo(() => done.flatMap((s) => s.reflections.filter((r) => r.answer.trim()).map((r) => ({ ...r, session: s }))), [done]);

  /** Delta per skill accumulated from reports, for a little "↑ +0.4 this month" note. */
  const gains = useMemo(() => {
    const g: Partial<Record<SkillId, number>> = {};
    for (const s of done) for (const [k, v] of Object.entries(s.report?.deltas ?? {})) g[k as SkillId] = +((g[k as SkillId] ?? 0) + (v ?? 0)).toFixed(2);
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
      <Page className="pt-4 flex flex-col gap-8">
        <header className="flex items-end justify-between">
          <h1 className="display text-[30px] leading-tight">{t(lang, "pg_title")}</h1>
          <p className="text-[12px] text-ink-4">{t(lang, "pg_estimate")}</p>
        </header>

        <section className="grid grid-cols-3 divide-x divide-line card py-4">
          {[
            [done.length, "pg_sessions"],
            [minutes, "pg_minutes"],
            [stars, "pg_stars"],
          ].map(([v, k]) => (
            <div key={k as string} className="flex flex-col items-center gap-0.5">
              <span className="num text-[28px] leading-none">{v as number}</span>
              <span className="text-[12px] text-ink-3">{t(lang, k as "pg_sessions")}</span>
            </div>
          ))}
        </section>

        <section className="flex flex-col items-center gap-2">
          <SectionTitle className="self-stretch">{t(lang, "pg_radar")}</SectionTitle>
          <Radar values={vals} lang={lang} size={300} />
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] text-ink-3">
            {COMPETENCIES.map((c) => (
              <li key={c.id} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: compColor(c.id) }} />{c.name[lang]}</li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle right={<button onClick={() => setAddOpen(true)} className="press inline-flex items-center gap-1 text-[13px] text-ink-3 h-8"><Plus size={14} />{t(lang, "pg_add_goal")}</button>}>{t(lang, "pg_skills")}</SectionTitle>
          <ul className="card divide-y divide-line">
            {profile.goals.map((g) => {
              const s = skillById(g);
              const gain = gains[g];
              return (
                <li key={g} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium">{s.name[lang]}</p>
                    <p className="text-[12px] text-ink-3 truncate">{s.behavior[lang]}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Level value={proficiency[g]} color={compColor(s.competency)} />
                    <span className="text-[11px] num" style={{ color: gain ? "var(--moss)" : "var(--ink-4)" }}>{proficiency[g]?.toFixed(1) ?? "–"}{gain ? ` · +${gain.toFixed(1)}` : ""}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>{t(lang, "pg_history")}</SectionTitle>
          {done.length === 0 ? (
            <Empty title={t(lang, "pg_empty")} action={<Link href="/" className="press h-10 px-4 inline-flex items-center rounded-full bg-ink text-paper text-[14px] font-semibold">{t(lang, "home_start")}</Link>} />
          ) : (
            <ul className="flex flex-col gap-2">
              {done.map((s) => (
                <li key={s.id}>
                  <Link href={`/practice/${s.id}`} className="press card flex items-center gap-3 p-3">
                    <ScenarioCover scenario={s.scenario} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate">{s.scenario.title[lang]}</p>
                      <p className="text-[12px] text-ink-3 num">{relDate(s.startedAt, lang)} · {sessionMinutes(s)} {t(lang, "min")}</p>
                    </div>
                    <Stars n={s.report?.stars ?? 0} size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>{t(lang, "pg_journal")}</SectionTitle>
          {journal.length === 0 ? (
            <p className="text-[13px] text-ink-3">{t(lang, "pg_journal_empty")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {journal.slice(0, 20).map((j, i) => (
                <li key={i} className="card p-4 flex flex-col gap-2">
                  <p className="text-[12px] text-ink-3">{relDate(j.session.startedAt, lang)} · {j.session.scenario.title[lang]}</p>
                  <p className="text-[13px] text-ink-2 italic leading-snug">{j.question}</p>
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{j.answer}</p>
                  {j.coachReply && <p className="text-[13px] leading-relaxed bubble-coach px-3 py-2 mt-1">{j.coachReply}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </Page>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title={t(lang, "pg_add_goal")}>
        <div className="flex flex-col gap-4 pt-2">
          {COMPETENCIES.map((c) => (
            <div key={c.id} className="flex flex-col gap-2">
              <span className="eyebrow" style={{ color: compColor(c.id, 0.45, 0.09) }}>{c.name[lang]}</span>
              <div className="flex flex-wrap gap-2">
                {SKILLS.filter((s) => s.competency === c.id).map((s) => (
                  <Chip key={s.id} active={profile.goals.includes(s.id)} onClick={() => addGoal(s.id)}>{s.name[lang]}</Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Sheet>
    </Shell>
  );
}
