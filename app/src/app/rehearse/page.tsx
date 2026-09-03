"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button, IconButton, Page, Stages, Avatar } from "@/components/ui";
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
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<Scenario | null>(null);

  const generate = async () => {
    if (!profile) return;
    setBusy(true);
    setErr(null);
    try {
      const { scenario } = await rehearse({ description: text, lang, profile: { name: profile.name, bio: profile.bio, goals: profile.goals } });
      addCustomScenario(scenario);
      setPreview(scenario);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t(lang, "error_generic"));
    } finally {
      setBusy(false);
    }
  };

  const start = (sc: Scenario) => {
    const s = buildSession(sc, "rehearse", lang);
    addSession(s);
    router.push(`/practice/${s.id}`);
  };

  const examples = ["rh_ex_1", "rh_ex_2", "rh_ex_3", "rh_ex_4"] as const;

  return (
    <div className="min-h-dvh pt-safe pb-10">
      <div className="px-3 pt-2 flex items-center">
        <IconButton label={t(lang, "back")} onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}><ArrowLeft size={20} /></IconButton>
      </div>
      <Page className="pt-2 flex flex-col gap-6">
        {!preview && (
          <>
            <header>
              <h1 className="display text-[30px] leading-tight">{t(lang, "rh_title")}</h1>
              <p className="text-[14px] text-ink-2 mt-2 leading-relaxed">{t(lang, "rh_sub")}</p>
            </header>
            {busy ? (
              <div className="card p-5"><Stages title={t(lang, "rh_generating")} steps={tList(lang, "rh_gen_steps")} intervalMs={4000} /></div>
            ) : (
              <>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder={t(lang, "rh_ph")} className="px-4 py-3.5 rounded-2xl bg-card border border-line text-[15px] leading-relaxed placeholder:text-ink-4 focus:border-ink transition-colors" maxLength={800} />
                <div className="flex flex-col gap-2">
                  <span className="eyebrow">{t(lang, "rh_examples")}</span>
                  <div className="flex flex-wrap gap-2">
                    {examples.map((k) => (
                      <button key={k} onClick={() => setText(t(lang, k))} className="press h-9 px-3.5 rounded-full border border-dashed border-line-strong text-[13px] text-ink-2 hover:bg-inset text-left">{t(lang, k)}</button>
                    ))}
                  </div>
                </div>
                {err && <p className="text-[13px] text-danger">{err}</p>}
                <Button block size="lg" onClick={generate} disabled={text.trim().length < 8}><Sparkles size={18} />{t(lang, "rh_generate")}</Button>
              </>
            )}
            {customScenarios.length > 0 && !busy && (
              <section className="flex flex-col gap-2 pt-2">
                <span className="eyebrow">{t(lang, "rh_saved")}</span>
                {customScenarios.map((sc) => (
                  <button key={sc.id} onClick={() => setPreview(sc)} className="press card flex items-center gap-3 p-3 text-left">
                    <ScenarioCover scenario={sc} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate">{sc.title[lang]}</p>
                      <p className="text-[12px] text-ink-3 truncate">{sc.hook[lang]}</p>
                    </div>
                  </button>
                ))}
              </section>
            )}
          </>
        )}

        {preview && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col gap-5">
            <div className="card overflow-hidden">
              <div className="relative h-36" style={{ background: `oklch(0.92 0.04 ${preview.characters[1]?.hue ?? 40})` }}>
                <ScenarioCover scenario={preview} full />
                <span className="absolute left-4 top-4 h-7 px-2.5 inline-flex items-center rounded-full bg-paper/90 text-[12px] font-medium">{contextById(preview.context).glyph} {contextById(preview.context).name[lang]}</span>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div>
                  <h2 className="display text-[24px] leading-tight">{preview.title[lang]}</h2>
                  <p className="text-[14px] text-ink-2 mt-2 leading-relaxed">{preview.background[lang]}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">{preview.skills.map((k) => <SkillTag key={k} id={k} lang={lang} />)}</div>
                <div className="flex flex-col gap-2">
                  <span className="eyebrow">{t(lang, "pr_characters")}</span>
                  {preview.characters.filter((c) => c.id !== "you").map((c) => (
                    <div key={c.id} className="flex items-start gap-3">
                      <Avatar name={c.name[lang]} hue={c.hue} size={36} />
                      <div>
                        <p className="text-[14px] font-semibold">{c.name[lang]} <span className="text-ink-3 font-normal">· {c.role[lang]}</span></p>
                        <p className="text-[13px] text-ink-3 leading-snug">{c.personality[lang]}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <span className="eyebrow">{t(lang, "pr_objectives")}</span>
                  <ol className="flex flex-col gap-1.5">
                    {preview.objectives.map((o, i) => (
                      <li key={i} className="flex gap-2.5 text-[14px] leading-snug"><span className="num text-ink-4">{i + 1}</span>{o[lang]}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
            <Button block size="lg" onClick={() => start(preview)}>{t(lang, "home_start")}</Button>
            <Button block variant="ghost" onClick={() => setPreview(null)}>{t(lang, "back")}</Button>
          </motion.div>
        )}
      </Page>
    </div>
  );
}
