"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Box } from "lucide-react";
import { useLang } from "@/store/useApp";
import { pick } from "@/lib/i18n";
import { DINNER_LAUNCH_KEY } from "@/features/dinner/storage";
import { Sheet } from "./ui";

const copy = {
  title: { zh: "SocialCoach 的 3D 饭桌，开席了。", en: "A seat at the SocialCoach 3D table." },
  tag: { zh: "新体验 · 3D 饭局", en: "New · 3D dinners" },
  quote: { zh: "“这杯你不喝，是不是不给我面子？”", en: "“Skipping this toast? Is that how you treat your boss?”" },
  body: { zh: "陈总已经举杯，全桌都在等你。坐进去，试试这句话该怎么接。", en: "Chen has raised his glass. Everyone is waiting. Take a seat and try your response." },
  detail: { zh: "职场、家庭、学校三张饭桌。切换视角，走近一个人，举杯或放下，也可以用语音开口。", en: "Work, family and school dinners. Switch views, walk over, raise your glass or leave it down. Speak with voice input, too." },
  play: { zh: "去 3D 饭桌", en: "Take a seat in 3D" },
  later: { zh: "先留在这里", en: "Stay here for now" },
  note: { zh: "虚构剧情 · 约 3 分钟 · 记录留在设备上", en: "Fictional scenes · About 3 minutes · Saved on this device" },
  nav: { zh: "3D 饭局", en: "3D dinners" },
  cardTitle: { zh: "这杯酒，你怎么接？", en: "Your boss raises a glass. Your move?" },
};
let shownThisVisit = false;

export function DinnerEntry({ compact = false }: { compact?: boolean }) {
  const lang = useLang();
  if (compact) return <Link href="/3d" prefetch={false} className="press mt-5 flex min-h-12 items-center gap-3 rounded-[var(--radius-sm)] px-3.5 text-[14px] text-ink-2 hover:bg-inset"><Box size={19} /><span>{pick(copy.nav, lang)}</span><span className="ml-auto rounded-full bg-accent-soft px-2 py-1 text-[10px] font-medium text-accent-deep">3D</span></Link>;
  return <Link href="/3d" prefetch={false} className="dinner-entry press group grid overflow-hidden rounded-[var(--radius)] border border-line bg-card sm:grid-cols-[minmax(0,1fr)_180px]">
    <div className="flex min-w-0 flex-col gap-2 p-5 lg:p-6">
      <span className="eyebrow text-accent-deep">{pick(copy.tag, lang)}</span>
      <h2 className="display text-[23px] leading-snug">{pick(copy.cardTitle, lang)}</h2>
      <p className="text-[13px] leading-relaxed text-ink-2">{pick(copy.body, lang)}</p>
      <span className="mt-2 inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-accent-deep">{pick(copy.play, lang)}<ArrowUpRight size={16} /></span>
    </div>
    <div className="relative min-h-36 overflow-hidden border-t border-line sm:border-l sm:border-t-0">
      <Image src="/images/dinner-3d.jpg" alt="" fill sizes="(min-width: 640px) 180px, 100vw" className="object-cover object-[50%_35%]" />
    </div>
  </Link>;
}

export function DinnerAnnouncement({ enabled }: { enabled: boolean }) {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!enabled || shownThisVisit) return;
    try { if (localStorage.getItem(DINNER_LAUNCH_KEY)) return; } catch {}
    const timer = setTimeout(() => {
      if (document.querySelector('dialog[open]')) return;
      shownThisVisit = true;
      try { localStorage.setItem(DINNER_LAUNCH_KEY, 'seen'); } catch {}
      setOpen(true);
    }, 650);
    return () => clearTimeout(timer);
  }, [enabled]);
  return <Sheet open={open && enabled} onClose={() => setOpen(false)} title={pick(copy.title, lang)} footer={<div className="flex flex-col gap-3"><div className="flex flex-wrap items-center gap-3"><Link href="/3d" prefetch={false} onClick={() => setOpen(false)} className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-action px-5 text-[14px] font-semibold text-accent-ink hover:bg-action-hover">{pick(copy.play, lang)}<ArrowUpRight size={17} /></Link><button onClick={() => setOpen(false)} className="press min-h-12 rounded-full px-4 text-[13px] text-ink-2 hover:bg-inset">{pick(copy.later, lang)}</button></div>
      <p className="text-[11px] text-ink-3">{pick(copy.note, lang)}</p></div>}>
    <div className="flex flex-col gap-5">
      <div className="relative h-40 sm:h-44 overflow-hidden rounded-[var(--radius-sm)] bg-paper-deep"><Image src="/images/dinner-3d.jpg" alt="" fill sizes="(min-width: 640px) 560px, 100vw" className="object-cover object-[50%_35%]" /></div>
      <div><p className="eyebrow text-accent-deep">{pick(copy.tag, lang)}</p><blockquote className="display mt-3 text-[24px] leading-snug">{pick(copy.quote, lang)}</blockquote><p className="mt-3 text-[14px] leading-relaxed text-ink-2">{pick(copy.body, lang)}</p><p className="mt-2 text-[13px] leading-relaxed text-ink-3">{pick(copy.detail, lang)}</p></div>

    </div>
  </Sheet>;
}
