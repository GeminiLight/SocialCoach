"use client";
import type { Case, Theory } from "@/data/corpus/types";
import { useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";

export function TheoryBody({ t: th }: { t: Theory }) {
  const lang = useLang();
  return (
    <>
      <p className="text-[15px] text-ink-2 leading-[1.85] rounded-xl knowledge-principle px-4 py-4">{th.principle[lang]}</p>
      <div className="flex flex-col gap-3">
        <span className="eyebrow">{t(lang, "ln_howto")}</span>
        <ol className="flex flex-col gap-0">
          {th.howTo.map((h, i) => (
            <li key={i} className="flex gap-3 text-[14px] leading-relaxed py-3 border-b border-line last:border-0">
              <span className="num text-teal bg-teal-soft rounded-full h-6 w-6 inline-flex items-center justify-center text-[11px] shrink-0">
                {i + 1}
              </span>
              <span>{h[lang]}</span>
            </li>
          ))}
        </ol>
      </div>
      <SourceLink url={th.source.url} />
    </>
  );
}

export function CaseBody({ c }: { c: Case }) {
  const lang = useLang();
  return (
    <div className="flex flex-col gap-3 text-[14px] leading-relaxed">
      <div>
        <span className="eyebrow block mb-1">{t(lang, "ln_situation")}</span>
        <p className="text-ink-2">{c.situation[lang]}</p>
      </div>
      <div>
        <span className="eyebrow block mb-1">{t(lang, "ln_happened")}</span>
        <p className="text-ink-2">{c.whatHappened[lang]}</p>
      </div>
      <div className="rounded-xl bg-accent-soft px-4 py-4">
        <span className="eyebrow block mb-1">{t(lang, "ln_takeaway")}</span>
        <p className="font-medium">{c.takeaway[lang]}</p>
      </div>
      <SourceLink url={c.source.url} />
    </div>
  );
}

function SourceLink({ url }: { url?: string }) {
  const lang = useLang();
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="press self-start inline-flex items-center min-h-11 text-[12px] text-teal underline underline-offset-4"
    >
      {t(lang, "ln_source_link")} ↗
    </a>
  );
}
