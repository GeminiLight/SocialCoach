"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Sun, Drama, Sprout, BookOpen, CircleUser } from "lucide-react";
import { useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";

const tabs = [
  { href: "/", key: "nav_home", Icon: Sun },
  { href: "/arena", key: "nav_arena", Icon: Drama },
  { href: "/progress", key: "nav_progress", Icon: Sprout },
  { href: "/learn", key: "nav_learn", Icon: BookOpen },
  { href: "/settings", key: "nav_me", Icon: CircleUser },
] as const;

export function TabBar() {
  const path = usePathname();
  const lang = useLang();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 bg-paper/92 backdrop-blur border-t border-line pb-safe" aria-label="primary">
      <ul className="grid grid-cols-5 h-[60px]">
        {tabs.map(({ href, key, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
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

/** Standard page frame with tab bar and bottom padding. */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-28 pt-safe">
      {children}
      <TabBar />
    </div>
  );
}
