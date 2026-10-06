"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { Button, Chip, Sheet } from "@/components/ui";
import { useByok, type ByokConfig } from "@/lib/byok";
import { checkByokConnection } from "@/lib/llm-client";
import { acceptModelCheck, refreshModelAccess, useModelAccess } from "@/lib/model-access";
import { M, modelMessage } from "@/lib/model-copy";
import { pick } from "@/lib/i18n";
import { useLang } from "@/store/useApp";
import type { ModelCheck } from "@/lib/model-status";
import type { Provider } from "@/lib/llm-core";

const input = "h-11 w-full min-w-0 px-3.5 rounded-xl bg-card border border-line text-[14px] focus:border-ink transition-colors placeholder:text-ink-4";
const DEFAULT = { openai: "gpt-4.1-mini", anthropic: "claude-sonnet-5-5" };

function ModelForm({ onClose }: { onClose: () => void }) {
  const lang = useLang();
  const access = useModelAccess();
  const current = useByok.getState();
  const [draft, setDraft] = useState<ByokConfig>(() => ({ ...current, fastModel: current.fastModel || DEFAULT[current.provider], smartModel: current.smartModel === current.fastModel ? "" : current.smartModel }));
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<ModelCheck | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); }, []);
  const update = (patch: Partial<ByokConfig>) => { setDraft(d => ({ ...d, ...patch })); setCheck(null); };
  const config: ByokConfig = { enabled: true, provider: draft.provider, tokenParam: draft.tokenParam, disableThinking: !!draft.disableThinking, apiKey: draft.apiKey.trim(), baseUrl: draft.baseUrl.trim(), fastModel: draft.fastModel.trim(), smartModel: draft.smartModel.trim() || draft.fastModel.trim() };
  const validAddress = !config.baseUrl || (() => { try { return ["https:", "http:"].includes(new URL(config.baseUrl).protocol); } catch { return false; } })();
  const save = (result: ModelCheck) => { useByok.getState().set(config); acceptModelCheck(result); onClose(); };
  const connect = async () => {
    setBusy(true);
    const request = new AbortController();
    controller.current = request;
    try {
      const result = await checkByokConnection(config, request.signal);
      if (request.signal.aborted) return;
      if (result.state === "available") save(result);
      else setCheck(result);
    } finally { if (!request.signal.aborted) setBusy(false); }
  };
  return <div className="flex flex-col gap-5 pt-1 pb-2">
    <p className="text-[14px] text-ink-3 leading-relaxed">{pick(access.source === "server" && access.state === "unavailable" && access.issue !== "setup" ? M.sharedUnavailableIntro : M.intro, lang)}</p>
    <fieldset disabled={busy} className="flex flex-col gap-5 disabled:opacity-70">
      <div><p className="eyebrow mb-2">{pick(M.provider, lang)}</p><div className="flex flex-wrap gap-2">{(["anthropic", "openai"] as Provider[]).map(provider => <Chip key={provider} active={draft.provider === provider} onClick={() => update({ provider, fastModel: DEFAULT[provider], smartModel: "", baseUrl: "", disableThinking: false })}>{provider === "anthropic" ? "Anthropic" : "OpenAI"}</Chip>)}</div></div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2"><label htmlFor="model-key" className="eyebrow">API Key</label><a href={draft.provider === "openai" ? "https://platform.openai.com/api-keys" : "https://platform.claude.com/"} target="_blank" rel="noopener noreferrer" className="text-[12px] underline underline-offset-4 text-ink-3">{pick(M.website, lang)}</a></div>
        <div className="relative"><input id="model-key" type={visible ? "text" : "password"} autoComplete="off" spellCheck={false} value={draft.apiKey} onChange={e => update({ apiKey: e.target.value })} className={`${input} pr-12`} placeholder="sk-…" /><button type="button" aria-label={pick(visible ? M.hideKey : M.showKey, lang)} onClick={() => setVisible(v => !v)} className="press absolute right-0 top-0 h-11 w-11 inline-flex items-center justify-center text-ink-3">{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
      </div>
      <label className="flex flex-col gap-2"><span className="eyebrow">{pick(M.name, lang)}</span><input value={draft.fastModel} onChange={e => update({ fastModel: e.target.value })} spellCheck={false} className={input} required /></label>
      <details className="group"><summary className="press min-h-11 flex items-center justify-between cursor-pointer text-[13px] text-ink-3">{pick(M.advanced, lang)}<ChevronDown size={15} aria-hidden className="group-open:rotate-180 transition-transform" /></summary><div className="flex flex-col gap-4 pt-2">
        <label className="flex flex-col gap-2"><span className="eyebrow">{pick(M.endpoint, lang)}</span><input type="url" value={draft.baseUrl} onChange={e => update({ baseUrl: e.target.value })} spellCheck={false} className={input} placeholder="https://…" /><span className="text-[12px] text-ink-3">{pick(M.endpointHint, lang)}</span></label>
        <label className="flex flex-col gap-2"><span className="eyebrow">{pick(M.reportModel, lang)}</span><input value={draft.smartModel} onChange={e => update({ smartModel: e.target.value })} spellCheck={false} className={input} placeholder={pick(M.sameModel, lang)} /></label>
        {draft.provider === "openai" && <label className="flex flex-col gap-2"><span className="eyebrow">{pick(M.tokenParam, lang)}</span><select className={input} value={draft.tokenParam} onChange={e => update({ tokenParam: e.target.value as ByokConfig["tokenParam"] })}><option>max_tokens</option><option>max_completion_tokens</option></select></label>}
        {draft.provider === "openai" && <div><label className="press flex min-h-11 items-center gap-3 text-[13px]"><input type="checkbox" checked={!!draft.disableThinking} onChange={e => update({ disableThinking: e.target.checked })} className="h-4 w-4" />{pick(M.disableThinking, lang)}</label><p className="text-[12px] leading-relaxed text-ink-3">{pick(M.disableThinkingHint, lang)}</p></div>}
      </div></details>
    </fieldset>
    {!validAddress && <p role="status" className="text-[13px] text-danger">{pick(M.invalidAddress, lang)}</p>}
    {check && <p role="status" className={`text-[13px] leading-relaxed ${check.state === "unavailable" ? "text-danger" : "text-ink-3"}`}>{check.state === "unavailable" ? modelMessage(check.issue ?? "service", lang) : pick(M.unverified, lang)}</p>}
    <div className="flex flex-col gap-2">
      <Button block loading={busy} disabled={!config.apiKey || !config.fastModel || !validAddress} onClick={check?.state === "unverified" ? () => save(check) : connect}>{pick(check?.state === "unverified" ? M.saveAnyway : M.connect, lang)}</Button>
      <p className="text-[12px] text-ink-3 leading-relaxed">{pick(M.free, lang)}<br />{pick(M.privacy, lang)}</p>
    </div>
    {current.enabled && <button disabled={busy} onClick={() => { useByok.getState().set({ enabled: false }); void refreshModelAccess(); onClose(); }} className="press min-h-11 text-[13px] text-ink-3 underline underline-offset-4">{pick(M.shared, lang)}</button>}
  </div>;
}

export function ModelSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useLang();
  return <Sheet open={open} onClose={onClose} title={pick(M.title, lang)}>{open && <ModelForm onClose={onClose} />}</Sheet>;
}
