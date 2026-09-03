"use client";
import Link from "next/link";
import { useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";

export default function NotFound() {
  const lang = useLang();
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center text-center px-8 gap-4">
      <div className="h-12 w-12 rounded-2xl bg-ink flex items-end justify-end p-1.5"><span className="h-5 w-5 rounded-lg bg-accent" /></div>
      <h1 className="display text-[28px] leading-tight">{t(lang, "nf_title")}</h1>
      <p className="text-[14px] text-ink-3 max-w-[30ch]">{t(lang, "nf_body")}</p>
      <Link href="/" className="press mt-2 h-11 px-5 inline-flex items-center rounded-full bg-ink text-paper text-[14px] font-semibold">{t(lang, "rp_back_home")}</Link>
    </main>
  );
}
