"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, Search } from "lucide-react";
import { clsx } from "clsx";
import { Shell } from "@/components/Shell";
import { Chip, Empty, Page } from "@/components/ui";
import { SkillTag } from "@/components/SkillBits";
import { CASES, THEORIES } from "@/data/corpus";
import type { Case, Theory } from "@/data/corpus/types";
import { skillById, type Lang } from "@/data/taxonomy";
import { useApp, useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";
import { useIsDesktop } from "@/lib/use-media";
import { CaseBody, TheoryBody } from "@/components/Knowledge";

export default function Learn() {
  const lang = useLang();
  const { bookmarks, toggleBookmark, profile } = useApp();
  const desktop = useIsDesktop();
  const [tab, setTab] = useState<"theories" | "cases" | "saved">("theories");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const match = (hay: string[]) => !q.trim() || hay.join(" ").toLowerCase().includes(q.trim().toLowerCase());
  const theories = useMemo(() => THEORIES.filter((x) => match([x.title[lang], x.principle[lang], x.source.book, ...x.keywords, ...x.skills.map((k) => skillById(k).name[lang])])), [q, lang]);
  const cases = useMemo(() => CASES.filter((x) => match([x.title[lang], x.situation[lang], x.takeaway[lang], ...x.keywords, ...x.skills.map((k) => skillById(k).name[lang])])), [q, lang]);
  const goals = profile?.goals ?? [];
  const relevance = (skills: string[]) => (skills.some((k) => goals.includes(k as never)) ? 0 : 1);

  const items: (Theory | Case)[] =
    tab === "theories"
      ? [...theories].sort((a, b) => relevance(a.skills) - relevance(b.skills))
      : tab === "cases"
        ? [...cases].sort((a, b) => relevance(a.skills) - relevance(b.skills))
        : [...THEORIES, ...CASES].filter((x) => bookmarks.includes(x.id));

  /* On desktop the library is master/detail, so something is always open: the
     item you picked, or the first one once a new tab or query changes the list. */
  const selected = desktop ? (items.find((x) => x.id === open) ?? items[0]) : undefined;

  return (
    <Shell>
      <Page className="pt-4 lg:pt-9 flex flex-col gap-5 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-x-10 lg:gap-y-8 lg:items-start">
        <header className="lg:col-span-2">
          <h1 className="display text-[30px] lg:text-[38px] leading-tight">{t(lang, "ln_title")}</h1>
          <p className="text-[13px] text-ink-3 mt-1">{t(lang, "ln_sub")}</p>
        </header>

        {/* the index */}
        <div className="contents lg:flex lg:flex-col lg:gap-4 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)]">
          <label className="flex items-center gap-2 h-11 px-3.5 rounded-full bg-card border border-line focus-within:border-ink transition-colors shrink-0">
            <Search size={17} className="text-ink-4" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(lang, "ln_search_ph")} className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-ink-4" />
          </label>
          <div className="flex gap-2 shrink-0">
            <Chip active={tab === "theories"} onClick={() => setTab("theories")}>{t(lang, "ln_theories")} <span className="num opacity-70">{THEORIES.length}</span></Chip>
            <Chip active={tab === "cases"} onClick={() => setTab("cases")}>{t(lang, "ln_cases")} <span className="num opacity-70">{CASES.length}</span></Chip>
            <Chip active={tab === "saved"} onClick={() => setTab("saved")}><Bookmark size={14} />{t(lang, "ln_saved")} {bookmarks.length > 0 && <span className="num opacity-70">{bookmarks.length}</span>}</Chip>
          </div>

          {items.length === 0 && <Empty title={tab === "saved" ? t(lang, "ln_saved") : t(lang, "arena_empty")} body={tab === "saved" ? (lang === "zh" ? "在复盘或这里点击收藏，方便回顾。" : "Save items from a debrief or here to revisit them.") : undefined} />}

          <ul className="flex flex-col gap-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
            {items.map((it, i) => {
              const isTheory = "principle" in it;
              const isOpen = open === it.id;
              const isSelected = selected?.id === it.id;
              const saved = bookmarks.includes(it.id);
              return (
                <li key={it.id} className={clsx("card card-link overflow-hidden rise shrink-0", isSelected && "lg:bg-inset lg:border-line-strong")} style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
                  <button onClick={() => setOpen(desktop ? it.id : isOpen ? null : it.id)} className="press w-full text-left p-4 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <KindMark theory={isTheory} />
                      <span className={clsx("eyebrow", isTheory ? "text-teal" : "text-accent-deep")}>{isTheory ? t(lang, "rp_theory") : t(lang, "rp_case")}</span>
                      <span className="h-1 w-1 rounded-full bg-line-strong" aria-hidden />
                      {it.skills.slice(0, 2).map((k) => <SkillTag key={k} id={k} lang={lang} small />)}
                    </div>
                    <p className="display text-[18px] leading-snug">{it.title[lang]}</p>
                    <p className={clsx("text-[13px] text-ink-3 line-clamp-2 leading-snug", isOpen && "hidden lg:line-clamp-2")}>{isTheory ? (it as Theory).principle[lang] : (it as Case).takeaway[lang]}</p>
                    <span className="dotted mt-1 w-full" aria-hidden />
                    <div className="flex items-baseline justify-between gap-3 w-full">
                      <span className="text-[11px] text-ink-4 truncate"><em>{it.source.book}</em> · {it.source.author}</span>
                      {isTheory && <span className="text-[11px] text-ink-4 num shrink-0">{t(lang, "ln_steps", { n: (it as Theory).howTo.length })}</span>}
                    </div>
                  </button>
                  {/* accordion: phone only — desktop reads it in the pane alongside */}
                  <div className="grid transition-[grid-template-rows] duration-300 lg:hidden" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                    <div className="overflow-hidden">
                      <div className="px-4 pb-4 flex flex-col gap-4">
                        <ItemBody it={it} lang={lang} saved={saved} onSave={() => toggleBookmark(it.id)} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* The open page. The left column is a stack of bordered cards; a naked
            column of text beside them reads as unanchored and makes the empty
            tail below short entries feel like a rendering gap — so the open page
            gets the same paper surface, and the pair reads as list → page. */}
        {selected && (
          <article className="hidden lg:block lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:max-w-[760px] lg:rounded-[var(--radius-lg)] lg:border lg:border-line lg:bg-card lg:p-8">
            <header className="flex flex-col gap-2 mb-5">
              <span className={clsx("eyebrow inline-flex items-center gap-2", "principle" in selected ? "text-teal" : "text-accent-deep")}>
                <KindMark theory={"principle" in selected} />
                {"principle" in selected ? t(lang, "rp_theory") : t(lang, "rp_case")}
              </span>
              <h2 className="display text-[26px] leading-tight">{selected.title[lang]}</h2>
            </header>
            <div className="flex flex-col gap-4">
              <ItemBody it={selected} lang={lang} saved={bookmarks.includes(selected.id)} onSave={() => toggleBookmark(selected.id)} />
            </div>
          </article>
        )}
      </Page>
    </Shell>
  );
}

/** The body of a theory or case — same content in the phone accordion and the desktop pane. */
function ItemBody({ it, lang, saved, onSave }: { it: Theory | Case; lang: Lang; saved: boolean; onSave: () => void }) {
  const isTheory = "principle" in it;
  return (
    <>
      {isTheory ? <TheoryBody t={it as Theory} /> : <CaseBody c={it as Case} />}
      <p className="text-[12px] text-ink-3">{t(lang, "rp_from")} <em>{it.source.book}</em> · {it.source.author}</p>
      <div className="flex flex-wrap gap-1.5">{it.skills.map((k) => <SkillTag key={k} id={k} lang={lang} small />)}</div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={onSave} className={clsx("press h-9 px-3.5 rounded-full border text-[13px] font-medium inline-flex items-center gap-1.5", saved ? "bg-ink text-paper border-ink" : "border-line-strong")}>
          <Bookmark size={14} fill={saved ? "currentColor" : "none"} />{saved ? t(lang, "ln_bookmarked") : t(lang, "ln_bookmark")}
        </button>
        <Link href={`/arena?skill=${it.skills[0]}`} className="press h-9 px-3.5 rounded-full bg-accent-soft text-accent-deep text-[13px] font-medium inline-flex items-center">{t(lang, "ln_practice_this")} →</Link>
      </div>
    </>
  );
}

/**
 * Theory and case need to differ at a glance, not just by label colour:
 * a theory is a set of rules, a case is something somebody said.
 */
function KindMark({ theory }: { theory: boolean }) {
  if (theory) {
    return (
      <svg width={15} height={15} viewBox="0 0 16 16" aria-hidden className="shrink-0">
        <rect x="1.5" y="3" width="13" height="2.2" rx="1.1" fill="var(--teal)" />
        <rect x="1.5" y="7" width="9" height="2.2" rx="1.1" fill="var(--teal)" opacity="0.7" />
        <rect x="1.5" y="11" width="11.5" height="2.2" rx="1.1" fill="var(--teal)" opacity="0.45" />
      </svg>
    );
  }
  return (
    <svg width={15} height={15} viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <path d="M3.6 10.6 Q3.4 13 2 14.4 Q4.6 13.7 5.9 11.1 Z" fill="var(--accent-deep)" />
      <rect x="1.4" y="2.2" width="13.2" height="8.8" rx="3.4" fill="var(--accent-deep)" />
      <rect x="4" y="5.6" width="7.5" height="1.8" rx="0.9" fill="var(--card)" />
    </svg>
  );
}
