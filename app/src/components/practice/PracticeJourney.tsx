"use client";
import type { ReactNode } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { clsx } from "clsx";
import { IconButton } from "@/components/ui";
import { useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";

/** A stable orientation point across preparation, conversation and review. */
export function PracticeJourney({ phase, onBack, backLabel, actions }: {
  phase: 0 | 1 | 2;
  onBack: () => void;
  backLabel?: string;
  actions?: ReactNode;
}) {
  const lang = useLang();
  return (
    <div className="practice-journey flex items-center gap-2 py-2 border-b border-line">
      <IconButton label={backLabel ?? t(lang, "pr_back_workspace")} onClick={onBack}><ArrowLeft size={19} /></IconButton>
      <span className="hidden lg:block display text-[15px] pr-6">SocialCoach</span>
      <ol aria-label={t(lang, "pr_journey")} className="flex flex-1 items-center justify-center gap-2 sm:gap-4 text-[12px]">
        {(["pr_step_prepare", "pr_step_talk", "pr_step_review"] as const).map((key, i) => (
          <li key={key} aria-current={phase === i ? "step" : undefined} className={clsx("flex items-center gap-1.5", phase === i ? "text-ink font-semibold" : "text-ink-3")}>
            {i > 0 && <span className="w-3 sm:w-6 h-px bg-line mr-1" aria-hidden />}
            <span aria-hidden className={clsx("h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px] num", phase === i ? "bg-ink text-paper" : "bg-inset text-ink-3")}>
              {i < phase ? <Check size={12} /> : i + 1}
            </span>
            {t(lang, key)}
          </li>
        ))}
      </ol>
      <div className="flex items-center justify-end min-w-2 lg:min-w-11">{actions}</div>
    </div>
  );
}
