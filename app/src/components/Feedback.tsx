"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { create } from "zustand";
import { Check, CheckCircle2, MessageSquare, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { useLang } from "@/store/useApp";
import { pick } from "@/lib/i18n";
import { feedbackPage, type Feedback } from "@/lib/feedback/schema";
import { Button, Sheet } from "./ui";

const copy = {
  title: { zh: "留一句反馈", en: "Leave a little feedback" },
  entry: { zh: "反馈", en: "Feedback" },
  intro: { zh: "哪里可以做得更好？选一项就能发送，也欢迎多说两句。", en: "What could be better? Pick an option and send, or tell us a little more." },
  type: { zh: "你想反馈什么？", en: "What is this about?" },
  specifics: { zh: "更具体一点（选填）", en: "A little more specific (optional)" },
  description: { zh: "补充说明（选填）", en: "Anything to add? (optional)" },
  contact: { zh: "联系方式（选填）", en: "Contact details (optional)" },
  contactHint: { zh: "邮箱或其他联系方式，仅用于回复这条反馈", en: "Email or another way to reach you, only to reply to this feedback" },
  privacy: { zh: "点击发送后，你填写的反馈和联系方式会保存到团队的飞书表格。不会自动上传对话、练习档案或模型密钥。", en: "Sending saves your feedback and any contact details to our team’s Feishu table. Your conversations, practice history and model keys are not attached." },
  consent: { zh: "发送即将填写内容提交到团队飞书表格；不附带练习对话。", en: "Send your entries to our team’s Feishu table. Practice conversations are not attached." },
  metadata: { zh: "同时附上：页面类型、语言、部署平台和版本，方便定位问题。", en: "Also included: page type, language, deployment and version to help us investigate." },
  send: { zh: "发送反馈", en: "Send feedback" },
  sending: { zh: "正在发送…", en: "Sending…" },
  success: { zh: "收到，谢谢你。", en: "Received. Thank you." },
  successSub: { zh: "你的反馈已送到我们手上，会帮助 SocialCoach 变得更好。", en: "Your feedback reached us and will help improve SocialCoach." },
  done: { zh: "回到练习", en: "Back to SocialCoach" },
  retry: { zh: "暂时没能确认送达，内容已保留。请重试。", en: "We couldn’t confirm delivery. Your text is still here. Please retry." },
  limited: { zh: "这一小时已经收到多条反馈，请稍后再试。内容会保留在当前页面。", en: "We’ve received several submissions this hour. Please try later; your draft stays on this page." },
  unavailable: { zh: "反馈通道暂未连接。你可以先填写，内容会保留在当前页面。", en: "Feedback isn’t connected yet. You can still write a draft; it stays on this page." },
  rating: { zh: "这次练习有帮助吗？", en: "Was this practice helpful?" },
  helpful: { zh: "有帮助", en: "Helpful" },
  unhelpful: { zh: "帮助不大", en: "Not really" },
  removeRating: { zh: "清除评价", en: "Clear rating" },
};
const options = [
  { id: "bug", label: { zh: "遇到故障", en: "Something broke" }, hint: { zh: "刚才做了什么，在哪一步遇到问题？", en: "What were you doing, and where did things go wrong?" }, tags: ["slow", "error", "mobile"] },
  { id: "character", label: { zh: "角色不真实", en: "Character feels off" }, hint: { zh: "哪个反应让你觉得不像真实对话？", en: "Which response didn’t feel like a real conversation?" }, tags: ["too_easy", "out_of_role", "missed_context"] },
  { id: "assessment", label: { zh: "点评不准确", en: "Debrief feels off" }, hint: { zh: "哪一句点评不准确？你可以自行粘贴相关原话。", en: "Which part was inaccurate? You can paste the relevant words yourself." }, tags: ["wrong_quote", "missed_context", "unclear"] },
  { id: "idea", label: { zh: "功能建议", en: "An idea" }, hint: { zh: "你希望增加什么？它能帮你解决什么问题？", en: "What would you add, and how would it help?" }, tags: [] },
  { id: "other", label: { zh: "其他", en: "Something else" }, hint: { zh: "想对我们说的话，都可以写在这里。", en: "Anything you’d like us to know." }, tags: [] },
] as const;
const tags = {
  slow: { zh: "响应慢", en: "Slow responses" }, error: { zh: "报错或卡住", en: "Error or stuck" }, mobile: { zh: "手机显示异常", en: "Mobile layout" },
  too_easy: { zh: "太容易让步", en: "Gives in too easily" }, out_of_role: { zh: "跳出角色", en: "Breaks character" }, missed_context: { zh: "没理解情境", en: "Misses the context" },
  wrong_quote: { zh: "引用不准确", en: "Inaccurate quote" }, unclear: { zh: "建议不清楚", en: "Unclear advice" }, other: { zh: "其他问题", en: "Other issue" },
};
const useFeedback = create<{ open: boolean; rating?: Feedback["rating"]; show: (rating?: Feedback["rating"]) => void; close: () => void }>((set) => ({
  open: false, show: (rating) => set({ open: true, rating }), close: () => set({ open: false }),
}));

export function FeedbackButton({ className = "" }: { className?: string }) {
  const lang = useLang();
  return <button type="button" className={`press inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-card px-4 text-[13px] font-medium text-ink-2 ${className}`} onClick={() => useFeedback.getState().show()}><MessageSquare size={16} />{pick(copy.entry, lang)}</button>;
}

export function FeedbackPrompt() {
  const lang = useLang();
  return <section className="border-t border-line pt-6 pb-4 flex flex-wrap items-center justify-between gap-3" aria-label={pick(copy.rating, lang)}>
    <p className="text-[14px] text-ink-2">{pick(copy.rating, lang)}</p>
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => useFeedback.getState().show("helpful")}><ThumbsUp size={16} />{pick(copy.helpful, lang)}</Button>
      <Button variant="secondary" onClick={() => useFeedback.getState().show("unhelpful")}><ThumbsDown size={16} />{pick(copy.unhelpful, lang)}</Button>
    </div>
  </section>;
}

export function FeedbackWidget() {
  const lang = useLang();
  const path = usePathname();
  const { open, rating, close } = useFeedback();
  const [category, setCategory] = useState<Feedback["category"]>();
  const [selected, setSelected] = useState<Feedback["tags"]>([]);
  const [detail, setDetail] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<"retry" | "limited" | "unavailable">();
  const [available, setAvailable] = useState<boolean>();
  const flight = useRef(false);
  const submission = useRef<{ json: string; id: string } | undefined>(undefined);
  const option = options.find(o => o.id === category);

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch("/api/feedback", { cache: "no-store" }).then(r => r.json()).then(d => { if (active) setAvailable(d.available === true); }).catch(() => {});
    return () => { active = false; };
  }, [open]);

  function dismiss() {
    if (flight.current) return;
    close();
    if (sent) { setSent(false); setCategory(undefined); setSelected([]); setDetail(""); setContact(""); setError(undefined); submission.current = undefined; }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (flight.current || (!category && !rating)) return;
    const payload = { category: category || "other", tags: selected, detail, contact, rating, page: feedbackPage(path), lang };
    const json = JSON.stringify(payload);
    if (submission.current?.json !== json) submission.current = { json, id: crypto.randomUUID() };
    flight.current = true; setBusy(true); setError(undefined);
    try {
      const r = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, id: submission.current.id }), signal: AbortSignal.timeout(25000) });
      const data = await r.json();
      if (!r.ok || data.ok !== true) { setError(r.status === 429 ? "limited" : r.status === 503 ? "unavailable" : "retry"); return; }
      setSent(true);
    } catch { setError("retry"); }
    finally { flight.current = false; setBusy(false); }
  }

  return <>
    {!path.startsWith("/practice/") && <FeedbackButton className="fixed z-30 right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:right-6 lg:bottom-6" />}
    <Sheet open={open} onClose={dismiss} title={pick(copy.title, lang)} footer={!sent && <><p className="mb-3 text-[12px] leading-relaxed text-ink-3">{pick(copy.consent, lang)}</p><Button form="socialcoach-feedback-form" type="submit" block disabled={busy || (!category && !rating) || available === false} aria-busy={busy}><Send size={16} />{pick(copy[busy ? "sending" : "send"], lang)}</Button></>}>
      {sent ? <div role="status" className="py-8 text-center flex flex-col items-center gap-4">
        <CheckCircle2 size={40} className="text-moss" />
        <h3 className="display text-[26px]">{pick(copy.success, lang)}</h3>
        <p className="text-ink-3 text-[14px] leading-relaxed">{pick(copy.successSub, lang)}</p>
        <Button onClick={dismiss} className="mt-2">{pick(copy.done, lang)}</Button>
      </div> : <form id="socialcoach-feedback-form" onSubmit={send} className="flex flex-col gap-5">
        <p className="text-[14px] text-ink-3 leading-relaxed">{pick(copy.intro, lang)}</p>
        {rating && <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] bg-accent-soft px-3 py-2 text-[13px]">
          <span>{pick(copy.rating, lang)} · {pick(copy[rating], lang)}</span>
          <button type="button" disabled={busy} className="min-h-11 underline" onClick={() => useFeedback.setState({ rating: undefined })}>{pick(copy.removeRating, lang)}</button>
        </div>}
        <fieldset disabled={busy} className="flex flex-col gap-3">
          <legend className="mb-3 text-[14px] font-semibold">{pick(copy.type, lang)}</legend>
          <div className="grid grid-cols-2 gap-2">{options.map(o => <button key={o.id} type="button" aria-pressed={category === o.id} onClick={() => { setCategory(o.id); setSelected([]); }} className={`press min-h-12 rounded-[var(--radius-sm)] border px-3 py-2 text-[13px] flex items-center justify-between gap-2 ${category === o.id ? "bg-accent-soft border-accent text-accent-deep" : "bg-card border-line text-ink-2"}`}>
            {pick(o.label, lang)}{category === o.id && <Check size={16} />}
          </button>)}</div>
        </fieldset>
        {!!option?.tags.length && <fieldset disabled={busy}><legend className="text-[13px] text-ink-3 mb-2">{pick(copy.specifics, lang)}</legend><div className="flex flex-wrap gap-2">{option.tags.map(tag => <label key={tag} className="flex min-h-11 items-center gap-2 rounded-full border border-line px-3 text-[13px] cursor-pointer"><input type="checkbox" checked={selected.includes(tag)} onChange={e => setSelected(e.target.checked ? [...selected, tag] : selected.filter(t => t !== tag))} />{pick(tags[tag], lang)}</label>)}</div></fieldset>}
        <label className="flex flex-col gap-2 text-[14px] font-medium">{pick(copy.description, lang)}
          <textarea disabled={busy} value={detail} onChange={e => setDetail(e.target.value)} maxLength={2000} rows={3} placeholder={pick((option || options[4]).hint, lang)} className="w-full resize-y rounded-[var(--radius-sm)] border border-line-strong bg-card px-3 py-3 text-[14px] font-normal leading-relaxed" />
          <span className="text-right text-[12px] text-ink-3 num font-normal">{detail.length} / 2000</span>
        </label>
        <details><summary className="min-h-11 cursor-pointer text-[14px] text-ink-2">{pick(copy.contact, lang)}</summary>
        <label className="flex flex-col gap-2 text-[14px] font-medium"><span className="sr-only">{pick(copy.contact, lang)}</span>
          <input disabled={busy} value={contact} onChange={e => setContact(e.target.value)} maxLength={160} placeholder={pick(copy.contactHint, lang)} className="min-h-12 rounded-[var(--radius-sm)] border border-line-strong bg-card px-3 text-[13px] font-normal" />
        </label>
        </details>
        <div className="border-t border-line pt-4 text-[12px] text-ink-3 leading-relaxed"><p>{pick(copy.privacy, lang)}</p><p className="mt-2">{pick(copy.metadata, lang)}</p></div>
        {(error || available === false) && <p role="alert" className="text-[13px] text-danger">{pick(copy[error || "unavailable"], lang)}</p>}
      </form>}
    </Sheet>
  </>;
}
