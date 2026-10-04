"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ArrowRight, ArrowUpRight, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Button, Chip, ChoiceGroup, Empty, IconButton, Page } from "@/components/ui";
import { SCENARIOS } from "@/data/corpus";
import { SCENARIOS_D } from "@/data/corpus/scenarios-d";
import type { Scenario } from "@/data/corpus/types";
import { CONTEXTS, SKILLS, contextById, skillById, type ContextId, type SkillId } from "@/data/taxonomy";
import { useApp, useLang } from "@/store/useApp";
import { pick, t } from "@/lib/i18n";
import { buildSession } from "@/lib/session-utils";
import { rememberArenaLocation } from "@/lib/arena-location";
import { clsx } from "clsx";

const copy = {
  filters: { zh: "筛选", en: "Filters" },
  skills: { zh: "练习技能", en: "Practice skill" },
};

const RECENT_IDS = new Set(SCENARIOS_D.map((s) => s.id));

export default function Arena() {
  const lang = useLang();
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => { rememberArenaLocation(params.toString()); }, [params]);
  const { profile, sessions, customScenarios, addSession } = useApp();
  // The URL keeps the collection intact when returning from a scene.
  const q = params.get("q") ?? "";
  const contextParam = params.get("context");
  const ctx: ContextId | "all" | "mine" = contextParam === "mine" ? "mine" : CONTEXTS.find((c) => c.id === contextParam)?.id ?? "all";
  const skill = SKILLS.find((s) => s.id === params.get("skill"))?.id ?? null;
  const difficulty = ["1", "2", "3"].includes(params.get("difficulty") ?? "") ? params.get("difficulty")! : "all";
  const practiced = ["new", "done"].includes(params.get("history") ?? "") ? params.get("history")! : "all";
  const recent = params.get("collection") === "recent";
  const visible = Math.max(12, Math.min(500, Number(params.get("limit")) || 12));
  const setFilter = (key: string, value: string | null) => {
    // Consecutive input events can precede React's next URL snapshot.
    const next = new URLSearchParams(window.location.search);
    if (!value || value === "all") next.delete(key); else next.set(key, value);
    if (key === "context" && value === "all") next.delete("collection");
    if (key !== "limit") next.delete("limit");
    window.history.replaceState(null, "", `/arena${next.size ? `?${next}` : ""}`);
  };
  const setQ = (value: string) => setFilter("q", value);
  const setCtx = (value: ContextId | "all" | "mine") => setFilter("context", value);
  const setSkill = (value: SkillId | null) => setFilter("skill", value);
  const setDifficulty = (value: string) => setFilter("difficulty", value);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const filterToggle = useRef<HTMLButtonElement>(null);
  const filterPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!filtersOpen) return;
    const fit = () => {
      const trigger = filterToggle.current;
      if (!trigger || !filterPanel.current) return;
      const nav = document.querySelector<HTMLElement>(".app-tabbar");
      const bottom = nav?.getClientRects().length ? nav.getBoundingClientRect().top - 12 : window.innerHeight - 24;
      filterPanel.current.style.setProperty("--filter-room", `${Math.max(96, bottom - trigger.getBoundingClientRect().bottom - 12)}px`);
    };
    fit();
    const dismiss = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !filterPanel.current?.contains(target) && !filterToggle.current?.contains(target)) setFiltersOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setFiltersOpen(false);
      filterToggle.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", fit);
    window.addEventListener("scroll", fit, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", fit);
    };
  }, [filtersOpen]);
  const starting = useRef(false);
  const all = useMemo(() => [...customScenarios, ...SCENARIOS.filter((s) => RECENT_IDS.has(s.id)), ...SCENARIOS.filter((s) => !RECENT_IDS.has(s.id))], [customScenarios]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) if (s.status === "assessed") map.set(s.scenario.id, (map.get(s.scenario.id) ?? 0) + 1);
    return map;
  }, [sessions]);
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return all.filter((s) => {
      if (recent && !RECENT_IDS.has(s.id)) return false;
      if (practiced === "new" && counts.has(s.id)) return false;
      if (practiced === "done" && !counts.has(s.id)) return false;
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
  }, [all, ctx, skill, difficulty, q, practiced, counts, recent]);
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
  const filtering = ctx !== "all" || !!skill || !!q.trim() || difficulty !== "all" || practiced !== "all" || recent;
  const reset = () => {
    window.history.replaceState(null, "", "/arena");
    searchRef.current?.focus();
  };
  const orderedSkills = [...SKILLS.filter((s) => profile?.goals.includes(s.id)), ...SKILLS.filter((s) => !profile?.goals.includes(s.id))];

  const extraFilters = Number(!!skill) + Number(difficulty !== "all") + Number(practiced !== "all");

  return (
    <Shell>
      <Page className="arena-page pt-5 lg:pt-10 flex flex-col gap-7 lg:gap-9">
        <header className="arena-header flex flex-wrap items-end justify-between gap-3 pb-6 border-b border-line">
          <div>
            <p className="eyebrow mb-3">{t(lang, "arena_title")}</p>
            <h1 className="display leading-tight">{t(lang, "arena_heading")}</h1>
            <p className="text-[14px] text-ink-3 mt-3 max-w-[var(--measure)]">{t(lang, "arena_sub", { n: all.length })}</p>
          </div>
          <Link href="/rehearse" className="arena-rehearse press inline-flex items-center gap-2 min-h-11 text-[13px] font-medium text-ink-2">
            {t(lang, "rh_title")}<ArrowUpRight size={15} aria-hidden />
          </Link>
        </header>

        <section aria-label={t(lang, "arena_search_ph")} className="arena-search flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="arena-search-field flex items-center gap-2 min-h-12 px-3 rounded-[var(--radius-sm)] bg-card border border-line-strong flex-1 min-w-0">
              <Search size={17} className="text-ink-3 shrink-0" aria-hidden />
              <input ref={searchRef} type="search" aria-label={t(lang, "arena_search_ph")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(lang, "arena_search_ph")} className="flex-1 min-w-0 bg-transparent outline-none text-base py-3 placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden" />
              {q && <IconButton label={t(lang, "arena_clear_search")} onClick={() => { setQ(""); searchRef.current?.focus(); }} className="-mr-2"><X size={17} /></IconButton>}
            </div>
            <button ref={filterToggle} onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} aria-controls="arena-filters" className={clsx("arena-filter-toggle press min-h-12 px-3 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border text-[13px] shrink-0", extraFilters ? "border-ink text-ink bg-inset" : "border-line text-ink-2")}>
              <SlidersHorizontal size={16} aria-hidden />{pick(copy.filters, lang)}
              {extraFilters > 0 && <span className="num">{extraFilters}</span>}
            </button>
          </div>
          <div ref={filterPanel} id="arena-filters" hidden={!filtersOpen} inert={!filtersOpen}>
            <div className="arena-filter-panel flex flex-col gap-4 p-4 border border-line rounded-[var(--radius-sm)]">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-2 text-[12px] text-ink-3">{t(lang, "difficulty")}
                  <select aria-label={t(lang, "difficulty")} value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="min-h-11 px-3 rounded-[var(--radius-sm)] border border-line bg-card text-[13px] text-ink">
                    <option value="all">{t(lang, "arena_any_difficulty")}</option>
                    {[1, 2, 3].map((d) => <option key={d} value={d}>{t(lang, `diff_${d}` as "diff_1")}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-[12px] text-ink-3">{t(lang, "arena_status_filter")}
                  <select aria-label={t(lang, "arena_status_filter")} value={practiced} onChange={(e) => setFilter("history", e.target.value)} className="min-h-11 px-3 rounded-[var(--radius-sm)] border border-line bg-card text-[13px] text-ink">
                    <option value="all">{t(lang, "arena_status_all")}</option>
                    <option value="new">{t(lang, "arena_status_new")}</option>
                    <option value="done">{t(lang, "arena_status_done")}</option>
                  </select>
                </label>
              </div>
              <div>
                <p className="text-[12px] text-ink-3 mb-2">{pick(copy.skills, lang)}</p>
                <ChoiceGroup className="flex flex-wrap gap-2" label={pick(copy.skills, lang)}>
                  <Chip small active={!skill} onClick={() => setSkill(null)}>{t(lang, "arena_all")}</Chip>
                  {orderedSkills.map((s) => <Chip key={s.id} small active={skill === s.id} onClick={() => setSkill(skill === s.id ? null : s.id)}>{s.name[lang]}</Chip>)}
                </ChoiceGroup>
              </div>
            </div>
          </div>
          <ChoiceGroup className="arena-contexts flex gap-1 overflow-x-auto no-scrollbar" label={t(lang, "arena_by_context")}>
            <Chip active={ctx === "all" && !recent} onClick={() => setCtx("all")}>{t(lang, "arena_all")}<span className="num">{all.length}</span></Chip>
            <Chip sharedSelection={false} active={recent} onClick={() => setFilter("collection", recent ? null : "recent")}>{t(lang, "arena_recent")}<span className="num">{RECENT_IDS.size}</span></Chip>
            {customScenarios.length > 0 && <Chip active={ctx === "mine"} onClick={() => setCtx("mine")}>{t(lang, "custom_badge")}<span className="num">{customScenarios.length}</span></Chip>}
            {CONTEXTS.map((c) => <Chip key={c.id} active={ctx === c.id} onClick={() => setCtx(ctx === c.id ? "all" : c.id)}>{c.name[lang]}<span className="num">{all.filter((s) => s.context === c.id).length}</span></Chip>)}
          </ChoiceGroup>
          {extraFilters > 0 && <div className="arena-selected-filters flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-2" role="status">
            {skill && <span>{skillById(skill).name[lang]}</span>}
            {difficulty !== "all" && <span>{t(lang, `diff_${difficulty}` as "diff_1")}</span>}
            {practiced !== "all" && <span>{t(lang, practiced === "new" ? "arena_status_new" : "arena_status_done")}</span>}
            <button onClick={reset} className="press min-h-11 text-accent-deep">{t(lang, "arena_reset")}</button>
          </div>}
        </section>

        {!filtering && forYou.length > 0 && <section className="arena-recommendations" aria-labelledby="recommendations-title">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4">
            <h2 id="recommendations-title" className="display text-[20px]">{t(lang, "arena_for_you")}</h2>
            <p className="text-[12px] text-ink-3">{t(lang, "arena_recommend_reason")}</p>
          </div>
          <div className="arena-picks grid md:grid-cols-3">
            {forYou.map((sc) => <button key={sc.id} onClick={() => start(sc)} className="arena-pick press text-left flex flex-col gap-3">
              <span className="flex justify-between gap-3 text-[12px] text-ink-3"><span>{contextById(sc.context).name[lang]}</span><span className="num">{sc.minutes} {t(lang, "min")} · {t(lang, `diff_${sc.difficulty}` as "diff_1")}</span></span>
              <span className="flex items-start justify-between gap-4"><span className="font-semibold text-[19px] leading-snug">{sc.title[lang]}</span><ArrowUpRight size={18} className="text-ink-3 shrink-0 mt-1" aria-hidden /></span>
              <span className="text-[14px] text-ink-2 leading-relaxed">{sc.hook[lang]}</span>
            </button>)}
          </div>
        </section>}

        <section aria-labelledby="catalog-title" className="arena-catalog">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-line-strong">
            <h2 id="catalog-title" className="display text-[20px]">{t(lang, "arena_catalog")}</h2>
            <div className="flex items-center gap-3">
              <p role="status" className="text-[12px] text-ink-3 num">{t(lang, "arena_results", { n: list.length })}</p>
              {filtering && !extraFilters && <button onClick={reset} className="press min-h-11 inline-flex items-center gap-1 text-[12px] text-accent-deep px-1"><X size={14} aria-hidden />{t(lang, "arena_reset")}</button>}
            </div>
          </div>
          {list.length === 0 && <Empty title={t(lang, "arena_empty_title")} body={t(lang, "arena_empty_body")} action={<div className="flex flex-col gap-2"><Button variant="secondary" onClick={reset}>{t(lang, "arena_reset")}</Button><Link href="/rehearse" className="min-h-11 inline-flex items-center justify-center gap-2 text-[13px] text-accent-deep">{t(lang, "rh_title")}<ArrowRight size={15} aria-hidden /></Link></div>} />}
          <div className="arena-rows flex flex-col">
            {list.slice(0, visible).map((sc) => {
              const count = counts.get(sc.id) ?? 0;
              return <button key={sc.id} onClick={() => start(sc)} className="arena-row notebook-row group text-left flex items-start gap-4 py-5">
                <span className="flex-1 min-w-0 flex flex-col gap-2">
                  <span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-[17px] leading-snug">{sc.title[lang]}</span>{sc.custom && <span className="text-[11px] text-accent-deep">{t(lang, "custom_badge")}</span>}</span>
                  <span className="text-[14px] text-ink-2 leading-relaxed max-w-[var(--measure)]">{sc.hook[lang]}</span>
                  <span className="arena-metadata flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
                    <span>{contextById(sc.context).name[lang]}</span>
                    {sc.skills.slice(0, 2).map((id) => <span key={id}>{skillById(id).name[lang]}</span>)}
                    <span className="md:hidden num">{sc.minutes} {t(lang, "min")} · {t(lang, `diff_${sc.difficulty}` as "diff_1")}</span>
                    {count > 0 && <span className="text-teal">{t(lang, "arena_practiced", { n: count })}</span>}
                  </span>
                </span>
                <span className="hidden md:flex flex-col items-end gap-2 shrink-0 text-[12px] text-ink-3 pt-0.5"><span className="num">{sc.minutes} {t(lang, "min")}</span><span>{t(lang, `diff_${sc.difficulty}` as "diff_1")}</span></span>
                <ArrowRight size={16} className="shrink-0 mt-1 text-ink-3 group-hover:text-ink hidden md:block" aria-hidden />
              </button>;
            })}
          </div>
          {list.length > 0 && <div className="flex flex-col items-center gap-3 pt-6"><p className="text-[12px] text-ink-3 num">{t(lang, "arena_showing", { n: Math.min(visible, list.length), total: list.length })}</p>{visible < list.length && <Button variant="secondary" onClick={() => setFilter("limit", String(visible + 12))}>{t(lang, "arena_show_more", { n: Math.min(12, list.length - visible) })}<ChevronDown size={16} aria-hidden /></Button>}</div>}
        </section>
        <Link href="/rehearse" className="press flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[14px]"><span className="text-ink-2">{t(lang, "arena_custom_note")}</span><span className="flex items-center gap-2 text-accent-deep font-medium">{t(lang, "rh_title")}<ArrowRight size={16} aria-hidden /></span></Link>
      </Page>
    </Shell>
  );
}
