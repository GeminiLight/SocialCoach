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
  title: { zh: "SocialCoach，走进现场。", en: "Step into SocialCoach." },
  tag: { zh: "3D 实景 · 沉浸练习", en: "3D rehearsal · Step into the scene" },
  quote: { zh: "“你这杯不跟，是不是不给我面子？”", en: "“I don’t deserve your respect?”" },
  body: { zh: "陈总已经举杯，全桌都在等你。坐进去，试试这句话该怎么接。", en: "Chen has raised his glass. Everyone is waiting. Take a seat and try your response." },
  detail: { zh: "三张饭桌，加上电梯口和办公室。切换视角、自由走动，也可以用语音开口。", en: "Three dinners plus an elevator lobby and an office. Switch views, move freely and use voice input." },
  play: { zh: "进入 3D 现场", en: "Enter a 3D scene" },
  later: { zh: "先留在这里", en: "Stay here for now" },
  note: { zh: "虚构剧情 · 记录留在设备上", en: "Fictional scenes · Saved on this device" },
  nav: { zh: "3D 实景", en: "3D scenes" },
  invitation: { zh: "饭桌上劝酒，电梯口追问，办公室甩活。换一个现场，接住另一种压力。", en: "Dinner pressure, hallway gossip, last-minute office work. A different scene, a different difficult reply." },
  controls: { zh: "第一 / 第三人称 · 自由走动 · 语音开口", en: "First or third person · Move freely · Voice input" },
  elevator:{zh:'新场景 · 电梯口',en:'New · Elevator lobby'},office:{zh:'新场景 · 办公室',en:'New · Office'},
  preview: { zh: "实际游戏画面", en: "In-game view" },
};
let shownThisVisit = false;

export function DinnerEntry({ compact = false, welcome = false }: { compact?: boolean; welcome?: boolean }) {
  const lang = useLang();
  if (compact) return <Link href="/3d" prefetch={false} className="press mt-5 flex min-h-12 items-center gap-3 rounded-[var(--radius-sm)] px-3.5 text-[14px] text-ink-2 hover:bg-inset"><Box size={19} /><span>{pick(copy.nav, lang)}</span><span className="ml-auto rounded-full bg-accent-soft px-2 py-1 text-[10px] font-medium text-accent-deep">3D</span></Link>;
  return <section className={`dinner-feature overflow-hidden rounded-[var(--radius)] ${welcome ? "dinner-feature-welcome" : ""}`} aria-labelledby={welcome ? "welcome-dinner-title" : "home-dinner-title"}>
    <div className="dinner-feature-preview relative overflow-hidden">
      <Image src="/images/dinner-home-preview-bright.jpg" alt="" fill preload sizes={welcome ? "(min-width: 1024px) 480px, 100vw" : "(min-width: 1024px) calc(100vw - 312px), (min-width: 768px) 640px, 100vw"} className="object-cover" />
      <span className="dinner-feature-caption absolute bottom-3 right-4 text-[10px]">{pick(copy.preview, lang)}</span>
    </div>
    <div className="dinner-feature-content flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-7 lg:py-6">
      <div className="min-w-0">
        <p className="dinner-feature-tag flex items-center gap-2 text-[12px] font-semibold"><Box size={16} aria-hidden />{pick(copy.tag, lang)}</p>
        <h2 id={welcome ? "welcome-dinner-title" : "home-dinner-title"} className="display mt-3 text-[25px] leading-snug lg:text-[32px]">{pick(copy.quote, lang)}</h2>
        <p className="dinner-feature-detail mt-3 max-w-[var(--measure)] text-[13px] leading-relaxed">{pick(copy.invitation, lang)}</p>
        <div className="mt-3 flex flex-wrap gap-2">{(['elevator','office'] as const).map(scene=><a key={scene} href={`/3d?scene=${scene}`} className="press inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-3 text-[12px] text-ink-2">{pick(copy[scene],lang)}<ArrowUpRight size={13}/></a>)}</div><p className="dinner-feature-detail mt-2 text-[11px] leading-relaxed">{pick(copy.controls, lang)}</p>
      </div>
      <Link href="/3d" prefetch={false} className="dinner-feature-action press inline-flex min-h-12 shrink-0 items-center justify-center gap-3 self-start rounded-full px-5 text-[14px] font-semibold lg:self-center">{pick(copy.play, lang)}<ArrowUpRight size={18} aria-hidden /></Link>
    </div>
  </section>;
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
      <div className="relative h-40 sm:h-44 overflow-hidden rounded-[var(--radius-sm)] bg-paper-deep"><Image src="/images/dinner-home-preview-bright.jpg" alt="" fill sizes="(min-width: 640px) 560px, 100vw" className="object-cover" /></div>
      <div><p className="eyebrow text-accent-deep">{pick(copy.tag, lang)}</p><blockquote className="display mt-3 text-[24px] leading-snug">{pick(copy.quote, lang)}</blockquote><p className="mt-3 text-[14px] leading-relaxed text-ink-2">{pick(copy.body, lang)}</p><p className="mt-2 text-[13px] leading-relaxed text-ink-3">{pick(copy.detail, lang)}</p></div>

    </div>
  </Sheet>;
}
