import { ArrowUpRight, Code2 } from "lucide-react";
import { clsx } from "clsx";
import type { Lang } from "@/data/taxonomy";
import { t } from "@/lib/i18n";

export function GitHubLink({ lang, className }: { lang: Lang; className?: string }) {
  return (
    <a
      href="https://github.com/GeminiLight/SocialCoach"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t(lang, "github_new_tab")}
      title={t(lang, "github_hint")}
      className={clsx("press inline-flex items-center gap-2 min-h-11 px-3 rounded-[var(--radius-sm)] text-[13px] font-medium text-ink-3 hover:bg-inset hover:text-ink", className)}
    >
      <Code2 size={17} aria-hidden />
      <span>{t(lang, "github_label")}</span>
      <ArrowUpRight size={14} aria-hidden />
    </a>
  );
}
