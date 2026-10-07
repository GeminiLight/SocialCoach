"use client";

import { useEffect, useState } from "react";
import { openModelSheet, useByok } from "@/lib/byok";
import { useCanUseModel, useModelAccess } from "@/lib/model-access";
import { M } from "@/lib/model-copy";
import { pick } from "@/lib/i18n";
import { useInterfaceLang as useLang } from "@/lib/ui-language";
import type { Lang } from "@/data/taxonomy";

export const SLOW_MODEL_WAIT_MS = 8_000;

/** Mount only while a request is pending; finishing or cancelling clears its timer. */
export function SlowModelNotice({ delayMs = SLOW_MODEL_WAIT_MS, className = "", lang }: { delayMs?: number; className?: string; lang?: Lang }) {
  const defaultLang = useLang();
  const ownModel = useByok(s => s.enabled);
  const canUseModel = useCanUseModel();
  const epoch = useModelAccess(s => s.epoch);
  if (ownModel || !canUseModel) return null;
  return <DelayedNotice key={`${epoch}:${delayMs}`} delayMs={delayMs} className={className} lang={lang ?? defaultLang} />;
}

function DelayedNotice({ delayMs, className, lang }: { delayMs: number; className: string; lang: Lang }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);
  if (!visible) return null;
  return <div className={`model-wait-notice flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius)] bg-inset px-3 py-2 ${className}`}>
    <p role="status" className="min-w-0 flex-1 basis-44 text-[12px] leading-relaxed text-ink-3">{pick(M.slow, lang)}</p>
    <button type="button" onClick={openModelSheet} className="press shrink-0 min-h-11 rounded-[var(--radius-sm)] px-2 text-[12px] font-medium text-ink-2 hover:bg-card">{pick(M.slowConnect, lang)}</button>
  </div>;
}
