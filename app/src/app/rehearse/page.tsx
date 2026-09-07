"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Clock3, PenLine } from "lucide-react";
import { motion } from "framer-motion";
import { Shell } from "@/components/Shell";
import { Button, Page, Stages, Avatar } from "@/components/ui";
import { SkillTag } from "@/components/SkillBits";
import { ScenarioCover } from "@/components/ScenarioCover";
import { useApp, useLang } from "@/store/useApp";
import { t, tList } from "@/lib/i18n";
import { rehearse } from "@/lib/client-api";
import { buildSession } from "@/lib/session-utils";
import type { Scenario } from "@/data/corpus/types";
import { contextById } from "@/data/taxonomy";

export default function Rehearse() {
  const lang = useLang();
  const router = useRouter();
  const { profile, customScenarios, addCustomScenario, addSession } = useApp();
  const [text, setText] = useState(() => {
    try {
      return sessionStorage.getItem("socialcoach.rehearsal-draft") ?? "";
    } catch {
      return "";
    }
  });
  const [draftSaved, setDraftSaved] = useState(() => {
    try {
      return !!sessionStorage.getItem("socialcoach.rehearsal-draft");
    } catch {
      return false;
    }
  });
  const textarea = useRef<HTMLTextAreaElement>(null);
  const inflight = useRef(false);
  const starting = useRef(false);
  const updateText = (value: string) => {
    setText(value);
    try {
      if (value) sessionStorage.setItem("socialcoach.rehearsal-draft", value);
      else sessionStorage.removeItem("socialcoach.rehearsal-draft");
      setDraftSaved(!!value);
    } catch {
      setDraftSaved(false);
    }
  };
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<Scenario | null>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (preview) previewHeading.current?.focus();
  }, [preview]);

  const generate = async () => {
    if (!profile || inflight.current || text.trim().length < 8) return;
    inflight.current = true;
    setBusy(true);
    setErr(null);
    try {
      const { scenario } = await rehearse({
        description: text,
        lang,
        profile: { name: profile.name, bio: profile.bio, goals: profile.goals },
      });
      addCustomScenario(scenario);
      setPreview(scenario);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t(lang, "error_generic"));
    } finally {
      setBusy(false);
      inflight.current = false;
    }
  };

  const start = (sc: Scenario) => {
    if (starting.current) return;
    starting.current = true;
    const s = buildSession(sc, "rehearse", lang);
    addSession(s);
    router.push(`/practice/${s.id}`);
  };

  const examples = ["rh_ex_1", "rh_ex_2", "rh_ex_3", "rh_ex_4"] as const;

  return (
    <Shell>
      <Page className="pt-4 lg:pt-8 flex flex-col gap-6 pb-8 max-w-[var(--focus-max)] mx-auto">
        <Link
          href="/"
          className="press self-start inline-flex items-center gap-2 text-[13px] text-ink-3 min-h-11 rounded-full hover:bg-inset px-2 -ml-2"
        >
          <ArrowLeft size={16} />
          {t(lang, "nav_home")}
        </Link>
        {!preview && (
          <>
            <header className="border-b border-line pb-6">
              <p className="eyebrow flex items-center gap-2">
                <PenLine size={14} className="text-accent-deep" />
                {t(lang, "rh_eyebrow")}
              </p>
              <h1 className="display text-[32px] lg:text-[40px] leading-[1.3] whitespace-pre-line mt-3">{t(lang, "rh_heading")}</h1>
              <p className="text-[14px] text-ink-2 mt-4 leading-relaxed max-w-[var(--measure)]">{t(lang, "rh_sub")}</p>
            </header>
            <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_var(--margin-w)] xl:gap-8 mt-2 items-start">
              <div className="w-full min-w-0">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void generate();
                  }}
                  className="flex flex-col gap-4"
                  aria-busy={busy}
                >
                  <label htmlFor="rehearsal-description" className="font-semibold text-[15px]">
                    {t(lang, "rh_label")}
                  </label>
                  <div className="writing-field overflow-hidden">
                    <textarea
                      id="rehearsal-description"
                      ref={textarea}
                      value={text}
                      onChange={(e) => updateText(e.target.value)}
                      rows={7}
                      placeholder={t(lang, "rh_ph")}
                      className="block w-full px-5 pt-5 pb-3 bg-transparent text-base leading-[1.8] placeholder:text-ink-3 focus:outline-none"
                      maxLength={800}
                      disabled={busy}
                      aria-describedby="rehearsal-hint rehearsal-count"
                    />
                    <div className="px-5 pb-4 flex items-center justify-between gap-3 text-[11px] text-ink-3">
                      <span className="inline-flex items-center gap-1.5">
                        {draftSaved && (
                          <>
                            <Check size={12} />
                            {t(lang, "rh_draft")}
                          </>
                        )}
                      </span>
                      <span id="rehearsal-count" className="num shrink-0">
                        {text.length} / 800
                      </span>
                    </div>
                  </div>
                  <p id="rehearsal-hint" className="text-[12px] text-ink-3 leading-relaxed">
                    {t(lang, text.trim().length < 8 ? "rh_hint" : "rh_ready")}
                  </p>
                  {!text.trim() && !busy && (
                    <div className="flex flex-col gap-2 pt-1 pb-2">
                      <span className="eyebrow">{t(lang, "rh_examples")}</span>
                      {examples.map((key) => (
                        <button
                          type="button"
                          key={key}
                          onClick={() => {
                            updateText(t(lang, key));
                            textarea.current?.focus();
                          }}
                          className="press flex items-start justify-between gap-3 text-left text-[13px] text-ink-2 py-2.5 border-b border-dashed border-line-strong hover:text-accent-deep"
                        >
                          <span>{t(lang, key)}</span>
                          <ArrowUpRight size={15} className="shrink-0 mt-0.5" />
                        </button>
                      ))}
                    </div>
                  )}
                  {err && (
                    <div role="alert" className="rounded-[var(--radius-sm)] p-4 bg-danger-soft text-[13px] text-danger leading-relaxed">
                      {err}
                    </div>
                  )}
                  {busy ? (
                    <div role="status" className="card p-5">
                      <Stages title={t(lang, "rh_generating")} steps={tList(lang, "rh_gen_steps")} intervalMs={4000} slowAfterMs={40000} />
                    </div>
                  ) : (
                    <Button type="submit" block size="lg" disabled={text.trim().length < 8}>
                      {t(lang, "rh_generate")}
                      <ArrowRight size={18} />
                    </Button>
                  )}
                </form>
                {customScenarios.length > 0 && !busy && (
                  <section className="flex flex-col gap-2 mt-8 pt-6 border-t border-line">
                    <h2 className="display text-[20px] mb-2">{t(lang, "rh_saved")}</h2>
                    {customScenarios.map((sc) => (
                      <button key={sc.id} onClick={() => setPreview(sc)} className="notebook-row flex items-center gap-3 py-4 text-left">
                        <ScenarioCover scenario={sc} size={44} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[14px] font-medium truncate">{sc.title[lang]}</span>
                          <span className="block text-[12px] text-ink-3 mt-1 truncate">{sc.hook[lang]}</span>
                        </span>
                        <ArrowUpRight size={16} className="text-ink-3 shrink-0" />
                      </button>
                    ))}
                  </section>
                )}
              </div>
              <aside className="w-full rehearsal-guide rounded-2xl p-5 xl:sticky xl:top-6">
                <h2 className="eyebrow mb-5">{t(lang, "rh_guide")}</h2>
                <ol className="flex flex-col gap-5">
                  {(
                    [
                      ["rh_who", "rh_who_sub"],
                      ["rh_want", "rh_want_sub"],
                      ["rh_worry", "rh_worry_sub"],
                    ] as const
                  ).map(([title, body], i) => (
                    <li key={title} className="flex items-start gap-3">
                      <span className="num text-[11px] text-accent-deep bg-card border border-line h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-full">
                        0{i + 1}
                      </span>
                      <div>
                        <h3 className="text-[14px] font-semibold">{t(lang, title)}</h3>
                        <p className="text-[13px] text-ink-3 mt-1.5 leading-relaxed">{t(lang, body)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <section className="border-t border-line mt-7 pt-5">
                  <h2 className="text-[13px] font-semibold">{t(lang, "rh_how")}</h2>
                  <p className="text-[13px] text-ink-3 leading-relaxed mt-2">{t(lang, "rh_how_body")}</p>
                </section>
              </aside>
            </div>
          </>
        )}

        {preview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-5 w-full max-w-[var(--form-max)] mx-auto"
          >
            <header>
              <p className="eyebrow text-teal">{t(lang, "rh_preview_ready")}</p>
              <h1 ref={previewHeading} tabIndex={-1} className="display text-[28px] mt-2">
                {preview.title[lang]}
              </h1>
              <p className="text-[14px] text-ink-3 mt-2">{t(lang, "rh_preview_sub")}</p>
            </header>
            <div className="card overflow-hidden">
              <div className="relative h-36 bg-paper-deep">
                <ScenarioCover scenario={preview} full />
                <span className="absolute left-4 top-4 h-7 px-2.5 inline-flex items-center rounded-full bg-paper/90 text-[12px] font-medium">
                  {contextById(preview.context).name[lang]}
                </span>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div>
                  <p className="text-[12px] text-ink-3 num flex items-center gap-1.5">
                    <Clock3 size={14} />
                    {preview.minutes} {t(lang, "min")} · {t(lang, `diff_${preview.difficulty}` as "diff_1")}
                  </p>
                  <p className="text-[14px] text-ink-2 mt-2 leading-relaxed">{preview.background[lang]}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {preview.skills.map((k) => (
                    <SkillTag key={k} id={k} lang={lang} />
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <span className="eyebrow">{t(lang, "pr_characters")}</span>
                  {preview.characters
                    .filter((c) => c.id !== "you")
                    .map((c) => (
                      <div key={c.id} className="flex items-start gap-3">
                        <Avatar name={c.name[lang]} hue={c.hue} size={36} />
                        <div>
                          <p className="text-[14px] font-semibold">
                            {c.name[lang]} <span className="text-ink-3 font-normal">· {c.role[lang]}</span>
                          </p>
                          <p className="text-[13px] text-ink-3 leading-snug">{c.personality[lang]}</p>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="flex flex-col gap-2">
                  <span className="eyebrow">{t(lang, "pr_objectives")}</span>
                  <ol className="flex flex-col gap-1.5">
                    {preview.objectives.map((o, i) => (
                      <li key={i} className="flex gap-2.5 text-[14px] leading-snug">
                        <span className="num text-ink-4">{i + 1}</span>
                        {o[lang]}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
            <Button block size="lg" onClick={() => start(preview)}>
              {t(lang, "home_start")}
            </Button>
            <Button block variant="ghost" onClick={() => setPreview(null)}>
              {t(lang, "back")}
            </Button>
          </motion.div>
        )}
      </Page>
    </Shell>
  );
}
