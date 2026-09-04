"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Sun, Drama, Sprout, BookOpen, CircleUser, Sparkles } from "lucide-react";
import { useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";

const tabs = [
  { href: "/", key: "nav_home", Icon: Sun },
  { href: "/arena", key: "nav_arena", Icon: Drama },
  { href: "/progress", key: "nav_progress", Icon: Sprout },
  { href: "/learn", key: "nav_learn", Icon: BookOpen },
  { href: "/settings", key: "nav_me", Icon: CircleUser },
] as const;

/** Same active rule for both navs: "/" only matches itself. */
function useIsActive() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

export function TabBar() {
  const isActive = useIsActive();
  const lang = useLang();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] md:max-w-[40rem] z-30 bg-paper/92 backdrop-blur border-t border-line pb-safe lg:hidden" aria-label="primary">
      <ul className="grid grid-cols-5 h-[60px]">
        {tabs.map(({ href, key, Icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex">
              <Link href={href} className={clsx("press flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-ink" : "text-ink-4")}>
                <Icon size={21} strokeWidth={active ? 2.2 : 1.7} />
                <span>{t(lang, key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop nav: the same five destinations, stood up along the left edge of the sheet. */
export function NavRail() {
  const isActive = useIsActive();
  const lang = useLang();
  return (
    <nav className="hidden lg:flex sticky top-0 h-dvh flex-col border-r border-line px-4 py-6" aria-label="primary">
      <Link href="/" className="press flex items-center gap-2.5 px-2.5 pb-8">
        <Mark size={30} />
        <span className="display text-[17px] leading-none">{t(lang, "app_name")}</span>
      </Link>
      <ul className="flex flex-col gap-0.5">
        {tabs.map(({ href, key, Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link href={href} className={clsx("press flex items-center gap-3 h-11 px-3.5 rounded-full text-[15px]", active ? "bg-inset text-ink font-semibold" : "text-ink-3 font-medium hover:bg-inset/50 hover:text-ink-2")}>
                <Icon size={19} strokeWidth={active ? 2.2 : 1.7} />
                {t(lang, key)}
              </Link>
            </li>
          );
        })}
      </ul>
      {/* dashed, not filled: the page's own primary action stays the only one */}
      <div className="mt-auto pt-6"><div className="hairline" /></div>
      <Link href="/rehearse" className="press mt-4 flex items-center gap-2 h-11 px-3.5 rounded-full border border-dashed border-line-strong text-[13.5px] font-medium text-ink-2 hover:bg-inset hover:border-ink-4">
        <Sparkles size={16} className="text-accent shrink-0" />
        <span className="truncate">{t(lang, "rh_title")}</span>
      </Link>
    </nav>
  );
}

/** Standard page frame: bottom tabs on phone and tablet, left rail on desktop. */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:grid lg:grid-cols-[var(--rail-w)_1fr]">
      <NavRail />
      <div className="pb-28 pt-safe min-w-0 lg:pb-16 lg:mx-auto lg:w-full lg:max-w-[var(--content-max)]">{children}</div>
      <TabBar />
    </div>
  );
}

/** The app mark: a line you said, with the coach's mark under it. Mirrors public/icon.svg. */
function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size * 1.28} height={size} viewBox="56 96 402 314" aria-hidden className="shrink-0">
      <path d="M124 298 Q118 366 96 400 Q170 384 230 310 Z" fill="var(--ink)" />
      <rect x="64" y="104" width="344" height="216" rx="74" fill="var(--ink)" />
      <rect x="122" y="160" width="236" height="32" rx="16" fill="var(--paper)" />
      <rect x="122" y="220" width="150" height="32" rx="16" fill="var(--paper)" />
      <path d="M256 352 L434 364" stroke="var(--accent)" strokeWidth="32" strokeLinecap="round" fill="none" />
    </svg>
  );
}
