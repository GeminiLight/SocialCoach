"use client";
import type { Lang } from "@/data/taxonomy";
import { pick, t } from "@/lib/i18n";

export function LanguagePicker({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  return (
    <div role="group" aria-label={t(lang, "st_language")} className="language-picker">
      {(["zh", "en"] as const).map((value) => (
        <button key={value} type="button" lang={value === "zh" ? "zh-CN" : "en"} aria-pressed={lang === value} onClick={() => onChange(value)}
          className="language-option press">
          <span>{pick(value === "zh" ? { zh: "中文", en: "中文" } : { zh: "English", en: "English" }, lang)}</span>
        </button>
      ))}
    </div>
  );
}
