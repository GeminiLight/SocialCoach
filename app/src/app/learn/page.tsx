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
import { skillById } from "@/data/taxonomy";
import { useApp, useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";
import { CaseBody, TheoryBody } from "@/components/Knowledge";

export default function Learn() {
  const lang = useLang();
  const { bookmarks, toggleBookmark, profile } = useApp();
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

  return (
    <Shell>
      <Page className="pt-4 flex flex-col gap-5">
        <header>
          <h1 className="display text-[30px] leading-tight">{t(lang, "ln_title")}</h1>
          <p className="text-[13px] text-ink-3 mt-1">{t(lang, "ln_sub")}</p>
        </header>
        <label className="flex items-center gap-2 h-11 px-3.5 rounded-full bg-card border border-line focus-within:border-ink transition-colors">
          <Search size={17} className="text-ink-4" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(lang, "ln_search_ph")} className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-ink-4" />
        </label>
        <div className="flex gap-2">
          <Chip active={tab === "theories"} onClick={() => setTab("theories")}>{t(lang, "ln_theories")} <span className="num opacity-70">{THEORIES.length}</span></Chip>
          <Chip active={tab === "cases"} onClick={() => setTab("cases")}>{t(lang, "ln_cases")} <span className="num opacity-70">{CASES.length}</span></Chip>
          <Chip active={tab === "saved"} onClick={() => setTab("saved")}><Bookmark size={14} />{t(lang, "ln_saved")} {bookmarks.length > 0 && <span className="num opacity-70">{bookmarks.length}</span>}</Chip>
        </div>

        {items.length === 0 && <Empty title={tab === "saved" ? t(lang, "ln_saved") : t(lang, "arena_empty")} body={tab === "saved" ? (lang === "zh" ? "在复盘或这里点击收藏，方便回顾。" : "Save items from a debrief or here to revisit them.") : undefined} />}

        <ul className="flex flex-col gap-2">
          {items.map((it, i) => {
            const isTheory = "principle" in it;
            const isOpen = open === it.id;
            const saved = bookmarks.includes(it.id);
            return (
              <li key={it.id} className="card overflow-hidden rise" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
                <button onClick={() => setOpen(isOpen ? null : it.id)} className="press w-full text-left p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className={clsx("eyebrow", isTheory ? "text-teal" : "text-accent-deep")}>{isTheory ? t(lang, "rp_theory") : t(lang, "rp_case")}</span>
                    <span className="text-[11px] text-ink-4 truncate max-w-[55%]">{it.source.book}</span>
                  </div>
                  <p className="display text-[18px] leading-snug">{it.title[lang]}</p>
                  {!isOpen && <p className="text-[13px] text-ink-3 line-clamp-2 leading-snug">{isTheory ? (it as Theory).principle[lang] : (it as Case).takeaway[lang]}</p>}
                </button>
                <div className="grid transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 flex flex-col gap-4">
                      {isTheory ? <TheoryBody t={it as Theory} /> : <CaseBody c={it as Case} />}
                      <p className="text-[12px] text-ink-3">{t(lang, "rp_from")} <em>{it.source.book}</em> · {it.source.author}</p>
                      <div className="flex flex-wrap gap-1.5">{it.skills.map((k) => <SkillTag key={k} id={k} lang={lang} small />)}</div>
                      <div className="flex items-center gap-2 pt-1">
                        <button onClick={() => toggleBookmark(it.id)} className={clsx("press h-9 px-3.5 rounded-full border text-[13px] font-medium inline-flex items-center gap-1.5", saved ? "bg-ink text-paper border-ink" : "border-line-strong")}>
                          <Bookmark size={14} fill={saved ? "currentColor" : "none"} />{saved ? t(lang, "ln_bookmarked") : t(lang, "ln_bookmark")}
                        </button>
                        <Link href={`/arena?skill=${it.skills[0]}`} className="press h-9 px-3.5 rounded-full bg-accent-soft text-accent-deep text-[13px] font-medium inline-flex items-center">{t(lang, "ln_practice_this")} →</Link>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Page>
    </Shell>
  );
}
