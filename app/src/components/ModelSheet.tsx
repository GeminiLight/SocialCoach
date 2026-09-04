"use client";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Check, RefreshCw, Trash2 } from "lucide-react";
import { Button, Chip, Sheet, Spinner } from "@/components/ui";
import { isReady, maskKey, useByok } from "@/lib/byok";
import { listModels, makeByokLLM } from "@/lib/llm-client";
import { useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";
import type { Provider } from "@/lib/llm-core";

/** One labelled field, matching the settings rows. */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline gap-2">
        <span className="eyebrow">{label}</span>
        {hint && <span className="text-[11px] text-ink-4">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const input = "h-11 px-3.5 rounded-xl bg-card border border-line text-[14px] focus:border-ink transition-colors placeholder:text-ink-4";

/**
 * A model field: a dropdown once we know what the endpoint can run, a plain
 * text input otherwise. Plenty of gateways do not expose `/models`, so typing
 * has to stay possible.
 */
function ModelField({ label, hint, value, models, placeholder, onChange }: { label: string; hint: string; value: string; models: string[] | null; placeholder: string; onChange: (v: string) => void }) {
  if (models && models.length) {
    return (
      <Field label={label} hint={hint}>
        <select value={value} onChange={(e) => onChange(e.target.value)} className={clsx(input, "appearance-none bg-[length:14px] pr-8")} style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%23a89e90' stroke-width='1.8'><path d='M4 6.5 8 10.5 12 6.5'/></svg>\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
          <option value="">—</option>
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </Field>
    );
  }
  return (
    <Field label={label} hint={hint}>
      <input value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} className={input} placeholder={placeholder} />
    </Field>
  );
}

export function ModelSheet({ open, onClose, forced }: { open: boolean; onClose: () => void; forced?: boolean }) {
  const lang = useLang();
  const c = useByok();
  const [probe, setProbe] = useState<{ state: "idle" | "busy" | "ok"; error?: string }>({ state: "idle" });
  const [models, setModels] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [listNote, setListNote] = useState<string | null>(null);
  const ready = isReady({ ...c, enabled: true });
  const canList = !!c.apiKey.trim();

  const load = async () => {
    setLoading(true);
    setListNote(null);
    try {
      const ids = await listModels({ ...c, enabled: true });
      setModels(ids);
      if (!ids.length) setListNote(t(lang, "st_model_none"));
    } catch (e) {
      setModels(null);
      setListNote(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  // A key change invalidates whatever list we were showing.
  const lastKey = useRef("");
  useEffect(() => {
    const k = `${c.provider}|${c.baseUrl}|${c.apiKey}`;
    if (k !== lastKey.current) {
      lastKey.current = k;
      setModels(null);
      setListNote(null);
      setProbe({ state: "idle" });
    }
  }, [c.provider, c.baseUrl, c.apiKey]);

  const test = async () => {
    setProbe({ state: "busy" });
    try {
      await makeByokLLM({ ...c, enabled: true }).chatText({
        model: c.fastModel.trim(),
        maxTokens: 8,
        thinking: false,
        system: "Reply with: ok",
        messages: [{ role: "user", content: "ok" }],
      });
      setProbe({ state: "ok" });
      c.set({ enabled: true });
    } catch (e) {
      setProbe({ state: "idle", error: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t(lang, "st_model")}>
      <div className="flex flex-col gap-5 pt-1 pb-2">
        <p className="text-[13px] text-ink-3 leading-relaxed">{t(lang, "st_model_hint")}</p>

        {!forced && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[14px] font-medium">{t(lang, "st_model_use_own")}</span>
            <button
              role="switch"
              aria-checked={c.enabled}
              onClick={() => c.set({ enabled: !c.enabled })}
              disabled={!c.enabled && !ready}
              className={clsx("press relative h-7 w-12 rounded-full transition-colors disabled:opacity-40", c.enabled ? "bg-ink" : "bg-line-strong")}
            >
              <span className={clsx("absolute top-1 h-5 w-5 rounded-full bg-paper transition-transform", c.enabled ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          {(["anthropic", "openai"] as Provider[]).map((p) => (
            <Chip key={p} active={c.provider === p} onClick={() => c.set({ provider: p })}>
              {p === "anthropic" ? "Anthropic" : "OpenAI"}
            </Chip>
          ))}
        </div>

        <Field label={t(lang, "st_model_key")}>
          {c.apiKey ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 num text-[13px] text-ink-2 inset px-3.5 h-11 inline-flex items-center">{maskKey(c.apiKey)}</span>
              <button onClick={() => c.set({ apiKey: "" })} aria-label={t(lang, "st_reset")} className="press h-11 w-11 shrink-0 rounded-xl border border-line-strong inline-flex items-center justify-center text-ink-3">
                <Trash2 size={17} />
              </button>
            </div>
          ) : (
            <input type="password" autoComplete="off" spellCheck={false} value={c.apiKey} onChange={(e) => c.set({ apiKey: e.target.value })} className={input} placeholder={c.provider === "openai" ? "sk-…" : "sk-ant-…"} />
          )}
        </Field>

        <Field label={t(lang, "st_model_base")}>
          <input value={c.baseUrl} onChange={(e) => c.set({ baseUrl: e.target.value })} spellCheck={false} className={input} placeholder={t(lang, "st_model_base_ph")} />
        </Field>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <ModelField label={t(lang, "st_model_fast")} hint={t(lang, "st_model_fast_hint")} value={c.fastModel} models={models} placeholder={c.provider === "openai" ? "gpt-4.1-mini" : "claude-sonnet-5"} onChange={(v) => c.set({ fastModel: v })} />
            <ModelField label={t(lang, "st_model_smart")} hint={t(lang, "st_model_smart_hint")} value={c.smartModel} models={models} placeholder={c.provider === "openai" ? "gpt-4.1" : "claude-opus-5"} onChange={(v) => c.set({ smartModel: v })} />
          </div>
          <button onClick={load} disabled={!canList || loading} className="press self-start inline-flex items-center gap-1.5 text-[12px] text-ink-3 h-7 disabled:opacity-40">
            {loading ? <Spinner /> : <RefreshCw size={13} />}
            {models ? t(lang, "st_model_load") : t(lang, "st_model_load")}
          </button>
          {listNote && <p className="text-[12px] text-ink-4 leading-relaxed">{listNote}</p>}
        </div>

        {probe.error && <p className="text-[13px] text-danger leading-relaxed">{probe.error}</p>}

        <div className="flex items-center gap-3">
          <Button variant={probe.state === "ok" ? "secondary" : "primary"} onClick={test} disabled={!ready || probe.state === "busy"} className="flex-1">
            {probe.state === "busy" ? <Spinner /> : probe.state === "ok" ? <><Check size={16} />{t(lang, "st_model_ok")}</> : t(lang, "st_model_test")}
          </Button>
        </div>
        <p className="text-[12px] text-ink-4 leading-relaxed">{ready ? t(lang, "st_model_local") : t(lang, "st_model_incomplete")}</p>
      </div>
    </Sheet>
  );
}
