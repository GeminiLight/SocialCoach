"use client";
import { clsx } from "clsx";
import type { Lang } from "@/data/taxonomy";
import { pick, t } from "@/lib/i18n";

export function LanguagePicker({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  return (
    <div role="group" aria-label={t(lang, "st_language")} className="inline-flex rounded-full border border-line p-0.5 text-[12px] font-medium">
      {(["zh", "en"] as const).map((value) => (
        <button key={value} type="button" lang={value === "zh" ? "zh-CN" : "en"} aria-pressed={lang === value} onClick={() => onChange(value)}
          className={clsx("press px-3 min-h-11 rounded-full", lang === value ? "bg-ink text-paper" : "text-ink-3")}>
          {pick(value === "zh" ? { zh: "中文", en: "中文" } : { zh: "English", en: "English" }, lang)}
        </button>
      ))}
    </div>
  );
}
