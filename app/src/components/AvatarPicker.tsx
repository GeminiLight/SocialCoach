"use client";

import { useCallback,useEffect,useRef,useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw, SlidersHorizontal,Upload } from "lucide-react";
import { AvatarFigure, AVATAR_PALETTES, portraitCollection, portraitFor, portraitSeed, type Portrait } from "@/data/avatars";
import type { Lang } from "@/data/taxonomy";
import { pick } from "@/lib/i18n";
import { Button, Sheet, Switch } from "@/components/ui";
import {readAvatarFile,drawAvatar,encodeAvatar,validAvatarImage,type AvatarSource} from '@/lib/avatar-image';

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
  upload:{zh:'上传照片',en:'Upload a photo'},uploadHint:{zh:'PNG、JPG、WebP，最多 8 MB。照片仅在设备上裁切和保存。',en:'PNG, JPG or WebP, up to 8 MB. Cropping and storage stay on this device.'},
  photo:{zh:'自己的照片',en:'Your photo'},crop:{zh:'裁切照片',en:'Crop photo'},zoom:{zh:'缩放',en:'Zoom'},horizontal:{zh:'左右位置',en:'Horizontal position'},vertical:{zh:'上下位置',en:'Vertical position'},useCrop:{zh:'使用裁切照片',en:'Use cropped photo'},cancelCrop:{zh:'取消裁切',en:'Cancel cropping'},loading:{zh:'正在读取照片…',en:'Reading photo…'},fileError:{zh:'照片无法读取。请选择 8 MB 内、2400 万像素以内的 PNG、JPG 或 WebP。',en:'Could not read this photo. Choose PNG, JPG or WebP within 8 MB and 24 megapixels.'},cropError:{zh:'未能处理这张照片，请换一张或使用预设头像。',en:'Could not process this photo. Try another or use a preset.'},
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
export function AvatarPicker({ currentSeed,currentImage, lang, onClose, onSave }: {
  currentSeed: string;currentImage?:string; lang: Lang; onClose: () => void; onSave: (seed: string,imageData?:string) => void;
}) {
  const current = portraitFor(currentSeed);
  const originalImage=validAvatarImage(currentImage)?currentImage:undefined;
  const [draft, setDraft] = useState(current);
  const [image,setImage]=useState(originalImage),[source,setSource]=useState<AvatarSource|null>(null),[crop,setCrop]=useState({zoom:1,x:0,y:0}),[loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
  const fileInput=useRef<HTMLInputElement>(null),canvas=useRef<HTMLCanvasElement>(null),generation=useRef(0),sourceRef=useRef<AvatarSource|null>(null);
  useEffect(()=>()=>{generation.current++;sourceRef.current?.dispose();},[]);
  const bindCropCanvas=useCallback((node:HTMLCanvasElement|null)=>{canvas.current=node;if(!node||!source)return;try{drawAvatar(node,source,crop);}catch{setError(pick(L.cropError,lang));}},[source,crop,lang]);
  const discardCrop=()=>{generation.current++;sourceRef.current?.dispose();sourceRef.current=null;setSource(null);setLoading(false);setError(null);};
  const upload=async(file:File)=>{const id=++generation.current;setLoading(true);setError(null);try{const decoded=await readAvatarFile(file);if(id!==generation.current){decoded.dispose();return;}sourceRef.current?.dispose();sourceRef.current=decoded;setSource(decoded);setCrop({zoom:1,x:0,y:0});}catch{if(id===generation.current)setError(pick(L.fileError,lang));}finally{if(id===generation.current)setLoading(false);}};
  const acceptCrop=()=>{if(!canvas.current)return;try{const data=encodeAvatar(canvas.current);setImage(data);discardCrop();}catch{setError(pick(L.cropError,lang));}};
  const [page, setPage] = useState(0);
  const [details, setDetails] = useState(false);
  const seed = portraitSeed(draft);
  const changed = seed !== portraitSeed(current)||image!==originalImage;
  const patch = (value: Partial<Portrait>) => {discardCrop();setImage(undefined);setDraft((p) => ({ ...p, ...value }));};
  const text = (key: keyof typeof L) => pick(L[key], lang);
  return (
    <Sheet open onClose={onClose} title={text("title")} footer={
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onClose}>{text("cancel")}</Button>
        <Button className="flex-1" disabled={loading||!!source} onClick={() => onSave(seed,image)}>{text("save")}</Button>
      </div>
    }>
      <div className="flex flex-col gap-5">
        <p className="text-[14px] text-ink-3">{text("intro")}</p>
        <div className="avatar-preview rounded-2xl px-5 py-5 flex items-center gap-5">
          <div role="img" aria-label={text("preview")} className="shrink-0">
            <AvatarFigure seed={seed} hue={40} size={112} imageData={image} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold">{image?text('photo'):pick(hairNames[draft.hair], lang)}</p>
            <p className="text-[12px] text-ink-3 mt-1" role="status">{changed ? text("unsaved") : text("current")}</p>
            <button type="button" disabled={!changed&&!source} onClick={() => {discardCrop();setDraft(current);setImage(originalImage);}} className="press min-h-11 inline-flex items-center gap-1.5 text-[12px] text-action mt-1">
              <RotateCcw size={13} aria-hidden />{text("restore")}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file);}}/>
          <Button variant="secondary" disabled={loading} onClick={()=>fileInput.current?.click()}><Upload size={16} aria-hidden/>{loading?text('loading'):text('upload')}</Button>
          <p className="text-[13px] text-ink-3 leading-relaxed">{text('uploadHint')}</p>
          {error&&<p role="alert" className="text-[13px] text-danger">{error}</p>}
        </div>
        {source&&<section className="inset p-4 flex flex-col gap-3" aria-label={text('crop')}>
          <canvas ref={bindCropCanvas} width={256} height={256} role="img" aria-label={text('preview')} className="avatar-crop-preview"/>
          {[{key:'zoom' as const,min:1,max:3,step:.05,label:'zoom' as const},{key:'x' as const,min:-1,max:1,step:.02,label:'horizontal' as const},{key:'y' as const,min:-1,max:1,step:.02,label:'vertical' as const}].map(control=><label key={control.key} className="flex flex-col gap-2 text-[13px]">{text(control.label)}<input type="range" min={control.min} max={control.max} step={control.step} value={crop[control.key]} onChange={e=>setCrop(c=>({...c,[control.key]:Number(e.target.value)}))}/></label>)}
          <div className="flex gap-2"><Button variant="ghost" onClick={discardCrop}>{text('cancelCrop')}</Button><Button className="flex-1" onClick={acceptCrop}>{text('useCrop')}</Button></div>
        </section>}
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
              const selected = !image&&portraitSeed(p) === seed;
              return <button type="button" key={i} className="avatar-option press" aria-label={`${text("option")} ${page * 8 + i + 1} · ${pick(hairNames[p.hair], lang)} · ${pick(paletteNames[p.palette], lang)}`} aria-pressed={selected} onClick={() => {discardCrop();setImage(undefined);setDraft(p);}}>
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
