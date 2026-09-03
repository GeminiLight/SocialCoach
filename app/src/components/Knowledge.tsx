"use client";
import type { Case, Theory } from "@/data/corpus/types";
import { useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";

export function TheoryBody({ t: th }: { t: Theory }) {
  const lang = useLang();
  return (
    <>
      <p className="text-[14px] text-ink-2 leading-relaxed">{th.principle[lang]}</p>
      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">{t(lang, "ln_howto")}</span>
        <ol className="flex flex-col gap-2">
          {th.howTo.map((h, i) => (
            <li key={i} className="flex gap-3 text-[14px] leading-snug"><span className="num text-ink-4 w-4 shrink-0">{i + 1}</span><span>{h[lang]}</span></li>
          ))}
        </ol>
      </div>
    </>
  );
}

export function CaseBody({ c }: { c: Case }) {
  const lang = useLang();
  return (
    <div className="flex flex-col gap-3 text-[14px] leading-relaxed">
      <div><span className="eyebrow block mb-1">{t(lang, "ln_situation")}</span><p className="text-ink-2">{c.situation[lang]}</p></div>
      <div><span className="eyebrow block mb-1">{t(lang, "ln_happened")}</span><p className="text-ink-2">{c.whatHappened[lang]}</p></div>
      <div className="inset px-3.5 py-3"><span className="eyebrow block mb-1">{t(lang, "ln_takeaway")}</span><p className="font-medium">{c.takeaway[lang]}</p></div>
    </div>
  );
}
