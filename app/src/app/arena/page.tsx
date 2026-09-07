"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ArrowRight, ArrowUpRight, ChevronDown, Clock3, PenLine, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Button, Chip, Empty, IconButton, Page } from "@/components/ui";
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
  const [skill, setSkill] = useState<SkillId | null>(() => SKILLS.find((s) => s.id === params.get("skill"))?.id ?? null);
  const [difficulty, setDifficulty] = useState("all");
  const [moreSkills, setMoreSkills] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const starting = useRef(false);
  const all = useMemo(() => [...customScenarios, ...SCENARIOS], [customScenarios]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) if (s.status === "assessed") map.set(s.scenario.id, (map.get(s.scenario.id) ?? 0) + 1);
    return map;
  }, [sessions]);
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return all.filter((s) => {
      if (ctx === "mine" && !s.custom) return false;
      if (ctx !== "all" && ctx !== "mine" && s.context !== ctx) return false;
      if (skill && !s.skills.includes(skill) && !s.relatedSkills?.includes(skill)) return false;
      if (difficulty !== "all" && s.difficulty !== Number(difficulty)) return false;
      if (query) {
        const hay = [
          s.title.zh,
          s.title.en,
          s.hook.zh,
          s.hook.en,
          ...s.keywords,
          ...s.skills.flatMap((k) => [skillById(k).name.zh, skillById(k).name.en]),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [all, ctx, skill, difficulty, q]);
  const forYou = useMemo(() => {
    if (!profile) return [];
    return SCENARIOS.filter(
      (s) =>
        s.skills.some((k) => profile.goals.includes(k)) &&
        (profile.contexts.length === 0 || profile.contexts.includes(s.context)) &&
        !counts.has(s.id),
    ).slice(0, 3);
  }, [profile, counts]);
  const start = (scenario: Scenario) => {
    if (starting.current) return;
    starting.current = true;
    const session = buildSession(scenario, scenario.custom ? "rehearse" : "arena", lang);
    addSession(session);
    router.push(`/practice/${session.id}`);
  };
  const filtering = ctx !== "all" || !!skill || !!q.trim() || difficulty !== "all";
  const reset = () => {
    setQ("");
    setCtx("all");
    setSkill(null);
    setDifficulty("all");
    searchRef.current?.focus();
  };
  const orderedSkills = [...SKILLS.filter((s) => profile?.goals.includes(s.id)), ...SKILLS.filter((s) => !profile?.goals.includes(s.id))];

  return (
    <Shell>
      <Page className="pt-5 lg:pt-10 flex flex-col gap-7 lg:gap-9">
        <header className="flex flex-wrap items-end justify-between gap-5 pb-6 border-b border-line">
          <div>
            <p className="eyebrow mb-3 text-accent-deep">{t(lang, "arena_title")}</p>
            <h1 className="display text-[29px] md:text-[34px] lg:text-[38px] leading-tight">{t(lang, "arena_heading")}</h1>
            <p className="text-[14px] text-ink-3 mt-3 max-w-[var(--measure)]">{t(lang, "arena_sub", { n: all.length })}</p>
          </div>
          <Link
            href="/rehearse"
            className="press inline-flex items-center gap-2 min-h-11 rounded-full border border-line-strong px-4 text-[13px] font-medium hover:bg-inset"
          >
            <PenLine size={16} />
            {t(lang, "rh_title")}
            <ArrowUpRight size={15} />
          </Link>
        </header>

        <section aria-label={t(lang, "arena_search_ph")} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 min-h-12 px-4 rounded-[var(--radius-sm)] bg-card border border-line-strong focus-within:border-accent-deep flex-1 min-w-0 basis-full md:basis-0">
              <Search size={18} className="text-ink-3 shrink-0" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                aria-label={t(lang, "arena_search_ph")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t(lang, "arena_search_ph")}
                className="flex-1 min-w-0 bg-transparent outline-none text-base py-3 placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
              />
              {q && (
                <IconButton
                  label={t(lang, "arena_clear_search")}
                  onClick={() => {
                    setQ("");
                    searchRef.current?.focus();
                  }}
                  className="-mr-3"
                >
                  <X size={17} />
                </IconButton>
              )}
            </div>
            <button
              onClick={() => setMoreSkills((v) => !v)}
              aria-expanded={moreSkills}
              aria-controls="skill-filters"
              className={clsx(
                "press min-h-12 px-4 flex items-center gap-2 rounded-[var(--radius-sm)] border text-[13px]",
                skill ? "border-ink bg-inset" : "border-line bg-card",
              )}
            >
              <SlidersHorizontal size={16} />
              {skill ? skillById(skill).name[lang] : t(lang, "arena_by_skill")}
              <ChevronDown size={15} className={clsx("transition-transform", moreSkills && "rotate-180")} />
            </button>
            <select
              aria-label={t(lang, "difficulty")}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="min-h-12 px-3 rounded-[var(--radius-sm)] border border-line bg-card text-[13px] text-ink-2"
            >
              <option value="all">{t(lang, "arena_any_difficulty")}</option>
              {[1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {t(lang, `diff_${d}` as "diff_1")}
                </option>
              ))}
            </select>
          </div>
          <div id="skill-filters" hidden={!moreSkills}>
            <div className="p-4 rounded-[var(--radius)] bg-paper-deep flex flex-wrap gap-2">
              <Chip small active={!skill} onClick={() => setSkill(null)}>
                {t(lang, "arena_all")}
              </Chip>
              {orderedSkills.map((s) => (
                <Chip key={s.id} small active={skill === s.id} onClick={() => setSkill(skill === s.id ? null : s.id)}>
                  {s.name[lang]}
                </Chip>
              ))}
            </div>
          </div>
          <div
            className="flex gap-2 -mx-5 px-5 overflow-x-auto no-scrollbar md:mx-0 md:px-0 md:flex-wrap"
            aria-label={t(lang, "arena_by_context")}
          >
            <Chip active={ctx === "all"} onClick={() => setCtx("all")}>
              {t(lang, "arena_all")}
              <span className="num opacity-70">{all.length}</span>
            </Chip>
            {customScenarios.length > 0 && (
              <Chip active={ctx === "mine"} onClick={() => setCtx("mine")}>
                {t(lang, "custom_badge")}
                <span className="num opacity-70">{customScenarios.length}</span>
              </Chip>
            )}
            {CONTEXTS.map((c) => (
              <Chip key={c.id} active={ctx === c.id} onClick={() => setCtx(ctx === c.id ? "all" : c.id)}>
                {c.name[lang]}
                <span className="num opacity-70">{all.filter((s) => s.context === c.id).length}</span>
              </Chip>
            ))}
          </div>
        </section>

        {!filtering && forYou.length > 0 && (
          <section className="flex flex-col gap-4" aria-labelledby="recommendations-title">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 id="recommendations-title" className="display text-[20px]">
                {t(lang, "arena_for_you")}
              </h2>
              <p className="text-[12px] text-ink-3">{t(lang, "arena_recommend_reason")}</p>
            </div>
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-5 -mx-5 px-5 pb-2 no-scrollbar md:grid md:grid-cols-2 md:mx-0 md:px-0 md:overflow-visible xl:grid-cols-3">
              {forYou.map((sc, i) => (
                <button
                  key={sc.id}
                  onClick={() => start(sc)}
                  className={clsx(
                    "press card card-link text-left w-[var(--tile-w)] shrink-0 snap-start overflow-hidden md:w-auto flex flex-col",
                    i === 2 && "md:col-span-2 xl:col-span-1",
                  )}
                >
                  <div className="relative h-36 bg-paper-deep w-full">
                    <ScenarioCover scenario={sc} full />
                  </div>
                  <div className="p-5 flex flex-col gap-3 flex-1 w-full">
                    <span className="text-[11px] text-ink-3">
                      {contextById(sc.context).name[lang]} · {t(lang, `diff_${sc.difficulty}` as "diff_1")}
                    </span>
                    <h3 className="font-semibold text-[17px] leading-snug">{sc.title[lang]}</h3>
                    <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-line">
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 num">
                        <Clock3 size={13} />
                        {sc.minutes} {t(lang, "min")}
                      </span>
                      <span className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-accent-soft text-accent-deep">
                        <ArrowUpRight size={16} aria-hidden />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="catalog-title">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-line-strong">
            <h2 id="catalog-title" className="display text-[20px]">
              {t(lang, "arena_catalog")}
            </h2>
            <div className="flex items-center gap-3">
              <p role="status" className="text-[12px] text-ink-3 num">
                {t(lang, "arena_results", { n: list.length })}
              </p>
              {filtering && (
                <button onClick={reset} className="press min-h-11 inline-flex items-center gap-1 text-[12px] text-accent-deep rounded px-1">
                  <X size={14} />
                  {t(lang, "arena_reset")}
                </button>
              )}
            </div>
          </div>
          {list.length === 0 && (
            <Empty
              title={t(lang, "arena_empty_title")}
              body={t(lang, "arena_empty_body")}
              action={
                <div className="flex flex-col gap-2">
                  <Button variant="secondary" onClick={reset}>
                    {t(lang, "arena_reset")}
                  </Button>
                  <Link href="/rehearse" className="min-h-11 inline-flex items-center justify-center gap-2 text-[13px] text-accent-deep">
                    {t(lang, "rh_title")}
                    <ArrowRight size={15} />
                  </Link>
                </div>
              }
            />
          )}
          <div className="flex flex-col">
            {list.map((sc, i) => {
              const count = counts.get(sc.id) ?? 0;
              return (
                <button
                  key={sc.id}
                  onClick={() => start(sc)}
                  className="notebook-row group text-left flex items-start gap-3 md:gap-5 py-5 md:p-5 -mx-1 px-1"
                >
                  <span className="hidden xl:block text-[12px] text-ink-3 num pt-4" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <ScenarioCover scenario={sc} size={48} />
                  <span className="flex-1 min-w-0 flex flex-col gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[16px] leading-snug">{sc.title[lang]}</span>
                      {sc.custom && (
                        <span className="rounded-full bg-accent-soft text-accent-deep px-2 py-0.5 text-[11px]">
                          {t(lang, "custom_badge")}
                        </span>
                      )}
                    </span>
                    <span className="text-[13px] text-ink-2 leading-relaxed max-w-[var(--measure)]">{sc.hook[lang]}</span>
                    <span className="flex flex-wrap items-center gap-2 mt-0.5">
                      {sc.skills.slice(0, 2).map((id) => (
                        <SkillTag key={id} id={id} lang={lang} small />
                      ))}
                      <span className="text-[12px] text-ink-3 md:hidden">
                        {sc.minutes} {t(lang, "min")} · {t(lang, `diff_${sc.difficulty}` as "diff_1")}
                      </span>
                      {count > 0 && <span className="text-[11px] text-teal">{t(lang, "arena_practiced", { n: count })}</span>}
                    </span>
                  </span>
                  <span className="hidden md:flex flex-col items-end gap-2 shrink-0 text-[12px] text-ink-3 pt-0.5">
                    <span className="num">
                      {sc.minutes} {t(lang, "min")}
                    </span>
                    <span>{t(lang, `diff_${sc.difficulty}` as "diff_1")}</span>
                  </span>
                  <ArrowRight size={17} className="shrink-0 mt-1 text-ink-3 group-hover:text-accent-deep hidden md:block" />
                </button>
              );
            })}
          </div>
        </section>
        <Link
          href="/rehearse"
          className="press flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-dashed border-line-strong p-5 text-[14px]"
        >
          <span className="text-ink-2">{t(lang, "arena_custom_note")}</span>
          <span className="flex items-center gap-2 text-accent-deep font-medium">
            {t(lang, "rh_title")}
            <ArrowRight size={16} />
          </span>
        </Link>
      </Page>
    </Shell>
  );
}
