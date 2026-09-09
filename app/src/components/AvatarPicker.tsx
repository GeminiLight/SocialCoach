"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw, SlidersHorizontal } from "lucide-react";
import { AvatarFigure, AVATAR_PALETTES, portraitCollection, portraitFor, portraitSeed, type Portrait } from "@/data/avatars";
import type { Lang } from "@/data/taxonomy";
import { pick } from "@/lib/i18n";
import { Button, Sheet, Switch } from "@/components/ui";

const L = {
  title: { zh: "选一个喜欢的自己", en: "A portrait of your own" },
  intro: { zh: "挑一个作为起点，再慢慢调整。", en: "Choose a starting point. Make it yours." },
  preview: { zh: "头像预览", en: "Portrait preview" },
  current: { zh: "当前头像", en: "Current portrait" },
  unsaved: { zh: "预览中 · 尚未保存", en: "Preview · not saved yet" },
  restore: { zh: "恢复当前", en: "Restore current" },
  collection: { zh: "从这里开始", en: "Start with a portrait" },
  previous: { zh: "上一组头像", en: "Previous portraits" },
  next: { zh: "下一组头像", en: "Next portraits" },
  option: { zh: "选择头像", en: "Choose portrait" },
  palette: { zh: "配色", en: "Palette" },
  detail: { zh: "微调外观", en: "Fine-tune details" },
  hair: { zh: "发型", en: "Hair" },
  skin: { zh: "肤色", en: "Skin tone" },
  hairTone: { zh: "发色", en: "Hair color" },
  glasses: { zh: "眼镜", en: "Glasses" },
  saved: { zh: "保存在此设备，用于你的练习角色。", en: "Saved on this device for your practice character." },
  cancel: { zh: "取消", en: "Cancel" },
  save: { zh: "使用这个头像", en: "Use this portrait" },
};
const paletteNames = [
  { zh: "陶土", en: "Terracotta" }, { zh: "麦黄", en: "Wheat" }, { zh: "苔绿", en: "Moss" },
  { zh: "灰青", en: "Sage blue" }, { zh: "玫瑰", en: "Rose" },
];
const hairNames = [
  { zh: "利落短发", en: "Short crop" }, { zh: "侧分短发", en: "Side part" },
  { zh: "披肩长发", en: "Long sweep" }, { zh: "蓬松卷发", en: "Soft curls" },
  { zh: "束起发髻", en: "Top bun" }, { zh: "齐刘海短发", en: "Bob with fringe" },
  { zh: "贴头短发", en: "Close crop" }, { zh: "光头", en: "Shaved" },
];
const skinNames = [{ zh: "浅杏", en: "Light" }, { zh: "暖沙", en: "Medium light" }, { zh: "焦糖", en: "Medium deep" }, { zh: "深棕", en: "Deep" }];
const hairToneNames = [{ zh: "墨棕", en: "Dark brown" }, { zh: "栗棕", en: "Chestnut" }, { zh: "亚麻", en: "Flax" }];

/** Mounted only while open, so closing discards every uncommitted edit. */
export function AvatarPicker({ currentSeed, lang, onClose, onSave }: {
  currentSeed: string; lang: Lang; onClose: () => void; onSave: (seed: string) => void;
}) {
  const current = portraitFor(currentSeed);
  const [draft, setDraft] = useState(current);
  const [page, setPage] = useState(0);
  const [details, setDetails] = useState(false);
  const seed = portraitSeed(draft);
  const changed = seed !== portraitSeed(current);
  const patch = (value: Partial<Portrait>) => setDraft((p) => ({ ...p, ...value }));
  const text = (key: keyof typeof L) => pick(L[key], lang);
  return (
    <Sheet open onClose={onClose} title={text("title")} footer={
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onClose}>{text("cancel")}</Button>
        <Button className="flex-1" onClick={() => onSave(seed)}>{text("save")}</Button>
      </div>
    }>
      <div className="flex flex-col gap-5">
        <p className="text-[14px] text-ink-3">{text("intro")}</p>
        <div className="avatar-preview rounded-2xl px-5 py-5 flex items-center gap-5">
          <div role="img" aria-label={text("preview")} className="shrink-0">
            <AvatarFigure seed={seed} hue={40} size={112} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">{pick(hairNames[draft.hair], lang)}</p>
            <p className="text-[12px] text-ink-3 mt-1" role="status">{changed ? text("unsaved") : text("current")}</p>
            <button type="button" disabled={!changed} onClick={() => setDraft(current)} className="press min-h-11 inline-flex items-center gap-1.5 text-[12px] text-action mt-1">
              <RotateCcw size={13} aria-hidden />{text("restore")}
            </button>
          </div>
        </div>
        <section aria-label={text("collection")}>
          <div className="flex justify-between items-center gap-3 mb-2">
            <h3 className="text-[13px] font-semibold">{text("collection")}</h3>
            <div className="flex items-center gap-1">
              <button type="button" className="press min-h-11 min-w-11 grid place-items-center rounded-full" disabled={page === 0} aria-label={text("previous")} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
              <span className="num text-[12px] text-ink-3" aria-live="polite">{page + 1} / 3</span>
              <button type="button" className="press min-h-11 min-w-11 grid place-items-center rounded-full" disabled={page === 2} aria-label={text("next")} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {portraitCollection(page).map((p, i) => {
              const selected = portraitSeed(p) === seed;
              return <button type="button" key={i} className="avatar-option press" aria-label={`${text("option")} ${page * 8 + i + 1} · ${pick(hairNames[p.hair], lang)} · ${pick(paletteNames[p.palette], lang)}`} aria-pressed={selected} onClick={() => setDraft(p)}>
                <AvatarFigure seed={portraitSeed(p)} hue={40} size={56} />
                {selected && <span className="avatar-option-check"><Check size={12} strokeWidth={3} aria-hidden /></span>}
              </button>;
            })}
          </div>
        </section>
        <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <legend className="sr-only">{text("palette")}</legend>
          <span className="text-[13px] font-semibold" aria-hidden>{text("palette")}</span>
          <div className="flex gap-1">
            {AVATAR_PALETTES.map((palette, i) => <button type="button" key={palette} className="avatar-swatch press" aria-label={pick(paletteNames[i], lang)} aria-pressed={draft.palette === i} onClick={() => patch({ palette: i })}>
              <span className="avatar-swatch-pigment" style={{ background: `var(--avatar-${palette}-ink)` }} />
            </button>)}
          </div>
        </fieldset>
        <div className="border-t border-line">
          <button type="button" className="press flex items-center gap-2 w-full min-h-12 text-[13px] font-medium text-ink-2" aria-expanded={details} aria-controls="avatar-details" onClick={() => setDetails(!details)}>
            <SlidersHorizontal size={15} aria-hidden />{text("detail")}<ChevronRight size={15} className={`ml-auto ${details ? "rotate-90" : ""}`} aria-hidden />
          </button>
          <div id="avatar-details" hidden={!details}>
            <div className="flex flex-col gap-3 pb-3">
              <div className="flex justify-between items-center gap-3 text-[13px]">
                <label htmlFor="avatar-hair">{text("hair")}</label>
                <select id="avatar-hair" value={draft.hair} onChange={(e) => patch({ hair: Number(e.target.value) })} className="bg-card border border-line rounded-xl min-h-11 px-3 text-ink">
                  {hairNames.map((name, i) => <option key={i} value={i}>{pick(name, lang)}</option>)}
                </select>
              </div>
              {[{ key: "skin" as const, names: skinNames, token: "skin" }, { key: "hairTone" as const, names: hairToneNames, token: "hair" }].map(({ key, names, token }) => (
                <fieldset key={key} className="flex items-center justify-between gap-3">
                  <legend className="sr-only">{text(key)}</legend><span className="text-[13px]" aria-hidden>{text(key)}</span>
                  <div className="flex gap-1">{names.map((name, i) => <button type="button" key={i} className="avatar-swatch press" aria-label={pick(name, lang)} aria-pressed={draft[key] === i} onClick={() => patch({ [key]: i })}>
                    <span className="avatar-swatch-pigment" style={{ background: `var(--avatar-${token}-${i})` }} />
                  </button>)}</div>
                </fieldset>
              ))}
              <div className="flex items-center justify-between min-h-11 text-[13px]"><span>{text("glasses")}</span><Switch checked={draft.glasses} onChange={(glasses) => patch({ glasses })} label={text("glasses")} /></div>
            </div>
          </div>
        </div>
        <p className="text-[12px] text-ink-3 leading-relaxed">{text("saved")}</p>
      </div>
    </Sheet>
  );
}
