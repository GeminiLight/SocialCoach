"use client";
import { ModelAccessNotice } from "./ModelAccessNotice";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { House, MessagesSquare, ChartNoAxesCombined, BookOpen, UserRound, PenLine, ArrowUpRight, HardDrive } from "lucide-react";
import { DinnerEntry } from "./DinnerEntry";
import { BrandMark } from "./BrandMark";
import { useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";

const tabs = [
  { href: "/", key: "nav_home", Icon: House },
  { href: "/arena", key: "nav_arena", Icon: MessagesSquare },
  { href: "/progress", key: "nav_progress", Icon: ChartNoAxesCombined },
  { href: "/learn", key: "nav_learn", Icon: BookOpen },
  { href: "/settings", key: "nav_me", Icon: UserRound },
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
    <nav className="app-tabbar fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[var(--col)] md:max-w-[40rem] z-30 bg-paper border-t border-line pb-safe lg:hidden" aria-label={t(lang, "nav_label")}>
      <ul className="grid grid-cols-5 h-[60px]">
        {tabs.map(({ href, key, Icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex">
              <Link href={href} aria-current={active ? "page" : undefined} className={clsx("press flex-1 flex flex-col items-center justify-center gap-1 text-[11px]", active ? "text-ink font-semibold" : "text-ink-3 font-medium")}>
                <span className="px-4 py-1"><Icon size={19} strokeWidth={active ? 2 : 1.6} aria-hidden /></span>
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
    <nav className="app-nav-rail hidden lg:flex sticky top-0 h-dvh flex-col border-r border-line px-4 py-8 bg-paper" aria-label={t(lang, "nav_label")}>
      <Link href="/" className="press flex items-center gap-2.5 px-2 pb-10">
        <BrandMark size={34} />
        <span><span className="display block text-[18px] leading-none">{t(lang, "app_name")}</span><span className="block text-[11px] text-ink-3 mt-2">{t(lang, "nav_workspace")}</span></span>
      </Link>
      <ul className="flex flex-col gap-0.5">
        {tabs.map(({ href, key, Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={clsx("press flex items-center gap-3 h-12 px-3.5 rounded-[var(--radius-sm)] text-[14px]", active ? "bg-inset text-ink font-semibold" : "text-ink-3 font-medium hover:bg-inset hover:text-ink")}>
                <Icon size={18} strokeWidth={active ? 1.9 : 1.6} aria-hidden />
                {t(lang, key)}
              </Link>
            </li>
          );
        })}
      </ul>
      <DinnerEntry compact />
      <div className="mt-auto pt-6"><div className="hairline" /></div>
      <Link href="/rehearse" aria-current={isActive("/rehearse") ? "page" : undefined} className="press aria-[current=page]:bg-inset aria-[current=page]:text-ink mt-4 flex items-center gap-2 min-h-12 px-3 py-3 rounded-[var(--radius-sm)] text-[13px] font-medium text-ink-2 hover:bg-inset">
        <PenLine size={16} className="shrink-0" aria-hidden />
        <span>{t(lang, "rh_title")}</span><ArrowUpRight size={15} className="ml-auto shrink-0" />
      </Link>
      <p className="flex gap-2 items-start px-2 mt-5 text-[11px] text-ink-3 leading-relaxed"><HardDrive size={13} className="shrink-0 mt-0.5" />{t(lang, "nav_local")}</p>
    </nav>
  );
}

/** Standard page frame: bottom tabs on phone and tablet, left rail on desktop. */
export function Shell({ children, showModelNotice = true }: { children: React.ReactNode; showModelNotice?: boolean }) {
  const lang = useLang();
  return (
    <div className="lg:grid lg:grid-cols-[var(--rail-w)_1fr]">
      <a href="#main-content" className="skip-link">{t(lang, "skip_content")}</a>
      <NavRail />
      <div id="main-content" tabIndex={-1} className="pb-28 pt-safe min-w-0 lg:pb-16 lg:mx-auto lg:w-full lg:max-w-[var(--content-max)]">{showModelNotice && <ModelAccessNotice className="app-model-notice mx-5 mt-4 lg:mx-10" />}{children}</div>
      <TabBar />
    </div>
  );
}
