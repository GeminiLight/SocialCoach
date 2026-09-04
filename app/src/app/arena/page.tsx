"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus } from "lucide-react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Chip, Empty, Page } from "@/components/ui";
import { SkillTag } from "@/components/SkillBits";
import { ScenarioCover } from "@/components/ScenarioCover";
import { SCENARIOS } from "@/data/corpus";
import type { Scenario } from "@/data/corpus/types";
import { CONTEXTS, SKILLS, contextById, skillById, type ContextId, type SkillId } from "@/data/taxonomy";
import { useApp, useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";
import { buildSession } from "@/lib/session-utils";
import { clsx } from "clsx";


export default function Arena() {
  const lang = useLang();
  const router = useRouter();
  const params = useSearchParams();
  const { profile, sessions, customScenarios, addSession } = useApp();
  const [q, setQ] = useState("");
  const [ctx, setCtx] = useState<ContextId | "all" | "mine">("all");
  const [skill, setSkill] = useState<SkillId | null>((params.get("skill") as SkillId) || null);
  const [moreSkills, setMoreSkills] = useState(false);

  const all = useMemo(() => [...customScenarios, ...SCENARIOS], [customScenarios]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) if (s.status === "assessed") m.set(s.scenario.id, (m.get(s.scenario.id) ?? 0) + 1);
    return m;
  }, [sessions]);

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return all.filter((s) => {
      if (ctx === "mine" && !s.custom) return false;
      if (ctx !== "all" && ctx !== "mine" && s.context !== ctx) return false;
      if (skill && !s.skills.includes(skill) && !s.relatedSkills?.includes(skill)) return false;
      if (qq) {
        const hay = [s.title.zh, s.title.en, s.hook.zh, s.hook.en, ...s.keywords, ...s.skills.map((k) => skillById(k).name[lang])].join(" ").toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      return true;
    });
  }, [all, ctx, skill, q, lang]);

  const forYou = useMemo(() => {
    if (!profile) return [];
    return SCENARIOS.filter((s) => s.skills.some((k) => profile.goals.includes(k)) && (profile.contexts.length === 0 || profile.contexts.includes(s.context)) && !counts.has(s.id)).slice(0, 6);
  }, [profile, counts]);

  const start = (sc: Scenario) => {
    const s = buildSession(sc, sc.custom ? "rehearse" : "arena", lang);
    addSession(s);
    router.push(`/practice/${s.id}`);
  };

  const goalSkills = profile?.goals ?? [];
  const otherSkills = SKILLS.filter((s) => !goalSkills.includes(s.id));
  const filtering = ctx !== "all" || skill || q;

  return (
    <Shell>
      <Page className="pt-4 lg:pt-9 flex flex-col gap-5 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-x-10 lg:gap-y-8 lg:items-start">
        <header className="lg:col-span-2">
          <h1 className="display text-[30px] lg:text-[38px] leading-tight">{t(lang, "arena_title")}</h1>
          <p className="text-[13px] text-ink-3 mt-1">{t(lang, "arena_sub", { n: SCENARIOS.length })}</p>
        </header>

        {/* filters: a scrolling strip on phone, a standing column on desktop */}
        <div className="contents lg:flex lg:flex-col lg:gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:[&>*]:shrink-0 lg:pb-2">
        <label className="flex items-center gap-2 h-11 px-3.5 rounded-full bg-card border border-line focus-within:border-ink transition-colors">
          <Search size={17} className="text-ink-4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(lang, "arena_search_ph")} className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-ink-4" />
        </label>

        <div className="-mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar md:mx-0 md:px-0 md:flex-wrap md:overflow-visible lg:flex-col lg:gap-1">
          <Chip active={ctx === "all"} onClick={() => setCtx("all")} className="lg:w-full lg:justify-start">{t(lang, "arena_all")}</Chip>
          {customScenarios.length > 0 && <Chip active={ctx === "mine"} onClick={() => setCtx("mine")} className="lg:w-full lg:justify-start">{t(lang, "custom_badge")}</Chip>}
          {CONTEXTS.map((c) => (
            <Chip key={c.id} active={ctx === c.id} onClick={() => setCtx(ctx === c.id ? "all" : c.id)} className="lg:w-full lg:justify-start">
              <span aria-hidden>{c.glyph}</span>{c.name[lang]}
            </Chip>
          ))}
        </div>
        <div className="-mx-5 px-5 flex gap-2 overflow-x-auto no-scrollbar md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
          {goalSkills.length > 0 && <span className="eyebrow self-center shrink-0 md:w-full md:self-auto md:mb-0.5">{t(lang, "arena_my_goals")}</span>}
          {goalSkills.map((k) => (
            <Chip key={k} small active={skill === k} onClick={() => setSkill(skill === k ? null : k)}>{skillById(k).name[lang]}</Chip>
          ))}
          {/* 34 skills minus the learner's goals is a 27-chip wall on desktop, taller
              than the results beside it. Keep it folded; a selected one stays visible. */}
          {otherSkills
            .filter((s) => moreSkills || skill === s.id)
            .map((s) => (
              <Chip key={s.id} small active={skill === s.id} onClick={() => setSkill(skill === s.id ? null : s.id)} className="opacity-80">{s.name[lang]}</Chip>
            ))}
          <button
            onClick={() => setMoreSkills((v) => !v)}
            className="press h-7 px-2.5 shrink-0 rounded-full text-[12px] font-medium text-ink-3 underline decoration-line-strong underline-offset-4 hover:text-ink"
          >
            {t(lang, moreSkills ? "arena_fewer_skills" : "arena_more_skills")}
          </button>
        </div>
        </div>

        {/* results */}
        <div className="contents lg:flex lg:flex-col lg:gap-5">
        {!filtering && forYou.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="eyebrow">{t(lang, "arena_for_you")}</h2>
            <div className="-mx-5 px-5 flex gap-3 overflow-x-auto no-scrollbar snap-x md:mx-0 md:px-0 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
              {/* the tablet grid is 2-up and the desktop grid 3-up, so anything past
                  the third card leaves a hole in the row; the phone carousel keeps all six. */}
              {forYou.map((sc, i) => (
                <button key={sc.id} onClick={() => start(sc)} className={clsx("press card card-link text-left w-[220px] shrink-0 snap-start overflow-hidden md:w-auto", i >= 3 && "md:hidden")}>
                  <div className="relative h-24 bg-paper-deep">
                    <ScenarioCover scenario={sc} full />
                  </div>
                  <div className="p-3.5">
                    <p className="font-semibold text-[14px] leading-snug line-clamp-2">{sc.title[lang]}</p>
                    <p className="text-[12px] text-ink-3 mt-1.5 num">{contextById(sc.context).name[lang]} · {sc.minutes} {t(lang, "min")}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2">
          {filtering && <p className="text-[12px] text-ink-3 num">{list.length}</p>}
          {list.length === 0 && (
            <Empty title={t(lang, "arena_empty")} action={<Link href="/rehearse" className="press inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-ink text-paper text-[14px] font-semibold"><Plus size={16} />{t(lang, "rh_title")}</Link>} />
          )}
          {list.map((sc, i) => {
            const n = counts.get(sc.id) ?? 0;
            return (
              <button key={sc.id} onClick={() => start(sc)} className={clsx("press card card-link text-left flex gap-3.5 p-3.5 rise md:gap-4 md:p-4")} style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
                <ScenarioCover scenario={sc} size={64} />
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[15px] leading-snug">{sc.title[lang]}</p>
                    {sc.custom && <span className="shrink-0 h-5 px-1.5 rounded-full bg-accent-soft text-accent-deep text-[10px] font-semibold inline-flex items-center">{t(lang, "custom_badge")}</span>}
                  </div>
                  <p className="text-[13px] text-ink-3 leading-snug line-clamp-2 lg:max-w-[var(--measure)]">{sc.hook[lang]}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    {sc.skills.slice(0, 2).map((k) => <SkillTag key={k} id={k} lang={lang} small />)}
                    {sc.skills.length > 2 && (
                      <span className="hidden md:contents">
                        {sc.skills.slice(2).map((k) => <SkillTag key={k} id={k} lang={lang} small />)}
                      </span>
                    )}
                    <span className="text-[11px] text-ink-4 num">{t(lang, `diff_${sc.difficulty}` as "diff_1")} · {sc.minutes} {t(lang, "min")}{n > 0 ? ` · ${t(lang, "arena_practiced", { n })}` : ""}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </section>
        </div>
      </Page>
    </Shell>
  );
}
