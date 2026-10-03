"use client";
import { useModelAccess, refreshModelAccess } from "@/lib/model-access";
import { openModelSheet } from "@/lib/byok";
import { M, modelMessage } from "@/lib/model-copy";
import { pick } from "@/lib/i18n";
import { useLang } from "@/store/useApp";

export function ModelAccessNotice({ className = "" }: { className?: string }) {
  const access = useModelAccess();
  const lang = useLang();
  if (access.state !== "unavailable" && access.state !== "checking") return null;
  return <aside aria-live="polite" className={`rounded-xl border border-line bg-card px-4 py-3 mb-5 text-[13px] ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-ink-2 leading-relaxed">{access.state === "checking" ? pick(M.checking, lang) : modelMessage(access.issue ?? "setup", lang)}</p>
        {access.state === "unavailable" && <p className="text-ink-3 text-[12px] mt-1">{pick(M.browse, lang)}</p>}
      </div>
      {access.state === "unavailable" && <div className="flex items-center gap-3 shrink-0">
        <button onClick={openModelSheet} className="press min-h-11 rounded-lg bg-ink text-paper px-3 font-medium">{pick(M.title, lang)}</button>
        {access.issue !== "setup" && <button onClick={() => void refreshModelAccess(true)} className="press min-h-11 px-1 text-ink-3 underline underline-offset-4">{pick(M.retry, lang)}</button>}
      </div>}
    </div>
  </aside>;
}
