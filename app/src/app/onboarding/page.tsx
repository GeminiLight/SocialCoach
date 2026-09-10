"use client";
import { useMemo, useState } from "react";
import { track } from "@/lib/analytics/track";
import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";
import { COMPETENCIES, CONTEXTS, SKILLS, skillById, type ContextId, type Lang, type SkillId } from "@/data/taxonomy";
import { SCENARIOS } from "@/data/corpus";
import { t } from "@/lib/i18n";
import { useApp, useLang } from "@/store/useApp";
import { openModelSheet } from "@/lib/byok";
import { BottomBar, Button, Chip } from "@/components/ui";
import { BrandMark } from "@/components/BrandMark";
import { Level } from "@/components/SkillBits";
import { compColor, hueColor } from "@/lib/format";

const STEPS = 5;

/** Three "practice tickets" that hint at what the app is for — real scenarios from the corpus. */
function WelcomeTickets({ lang }: { lang: Lang }) {
  const picks = ["salary-raise", "declining-extra-hours", "parent-career-choice"];
  const items = picks.map((id) => SCENARIOS.find((s) => s.id === id)!).filter(Boolean);
  const tilts = [-3, 2, -1.5];
  return (
    <ul className="relative h-[132px] mt-2" aria-hidden>
      {items.map((s, i) => {
        const npc = s.characters.find((c) => c.id !== "you")!;
        return (
          <li
            key={s.id}
            className="absolute left-0 right-8 card px-4 py-3 flex items-center gap-3 shadow-[0_6px_18px_-12px_var(--edge-shadow)] rise"
            style={{ top: i * 40, transform: `rotate(${tilts[i]}deg)`, "--i": i + 2, zIndex: i } as React.CSSProperties}
          >
            <span className="h-8 w-8 rounded-full shrink-0" style={{ background: hueColor(npc.hue) }} />
            <span className="text-[14px] font-medium truncate">{s.title[lang]}</span>
            <span className="ml-auto text-[11px] text-ink-4 num shrink-0">{s.minutes} {t(lang, "min")}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Onboarding() {
  const setProfile = useApp((s) => s.setProfile);
  const setProficiency = useApp((s) => s.setProficiency);
  const lang = useLang();
  const setLang = useApp((s) => s.setLang);
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<SkillId[]>([]);
  const [rates, setRates] = useState<Partial<Record<SkillId, number>>>({});
  const [contexts, setContexts] = useState<ContextId[]>([]);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [open, setOpen] = useState<string | null>(COMPETENCIES[3].id);

  const canNext = useMemo(() => {
    if (step === 1) return goals.length >= 1 && goals.length <= 5;
    return true;
  }, [step, goals]);

  const finish = () => {
    const prof: Partial<Record<SkillId, number>> = {};
    for (const g of goals) prof[g] = rates[g] ?? 2.5;
    setProficiency(prof);
    setProfile({ name: name.trim(), bio: bio.trim(), goals, contexts, lang, createdAt: Date.now() });
    track({ name: "onboarding_done", ts: Date.now() });
  };

  const toggleGoal = (id: SkillId) =>
    setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : g.length >= 5 ? g : [...g, id]));

  return (
    <div className="min-h-dvh flex flex-col pt-safe lg:mx-auto lg:w-full lg:max-w-[600px]">
      {/* progress */}
      <div className="px-5 pt-4 flex items-center justify-between">
        <div className="flex gap-1.5" aria-label={`step ${step + 1} of ${STEPS}`}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <span key={i} className={clsx("h-1 rounded-full transition-all duration-300", i <= step ? "w-6 bg-ink" : "w-3 bg-line-strong")} />
          ))}
        </div>
        {step === 0 && (
          <div className="inline-flex rounded-full border border-line p-0.5 text-[12px] font-medium">
            {(["zh", "en"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={clsx("press px-3 h-7 rounded-full", lang === l ? "bg-ink text-paper" : "text-ink-3")}>
                {l === "zh" ? "中文" : "EN"}
              </button>
            ))}
          </div>
        )}
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} className="press text-[13px] text-ink-3 h-8 px-2 rounded-full">
            {t(lang, "back")}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 flex flex-col px-5 pt-8 pb-32 lg:pb-8"
        >
          {step === 0 && (
            <div className="flex-1 flex flex-col justify-center gap-7">
              <BrandMark size={72} />
              <h1 className="display text-[36px] leading-[1.12] whitespace-pre-line">{t(lang, "ob_welcome_title")}</h1>
              <p className="text-[16px] text-ink-2 leading-relaxed max-w-[34ch]">{t(lang, "ob_welcome_body")}</p>
              <WelcomeTickets lang={lang} />
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-5">
              <header>
                <h1 className="display text-[28px] leading-tight">{t(lang, "ob_goals_title")}</h1>
                <p className="text-[14px] text-ink-3 mt-2">{t(lang, "ob_goals_sub")}</p>
                <p className="text-[12px] text-ink-4 mt-1.5 inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{t(lang, "ob_goals_legend")}</p>
              </header>
              <div className="flex flex-col gap-2">
                {COMPETENCIES.map((c) => {
                  const skills = SKILLS.filter((s) => s.competency === c.id);
                  const chosen = skills.filter((s) => goals.includes(s.id)).length;
                  const isOpen = open === c.id;
                  return (
                    <div key={c.id} className="card overflow-hidden">
                      <button onClick={() => setOpen(isOpen ? null : c.id)} className="press w-full flex items-center gap-3 px-4 h-14 text-left">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: compColor(c.id) }} />
                        <span className="flex-1 font-semibold text-[15px]">{c.name[lang]}</span>
                        {chosen > 0 && <span className="num text-[13px] text-ink-3">{chosen}</span>}
                        <ChevronDown size={18} className={clsx("text-ink-4 transition-transform", isOpen && "rotate-180")} />
                      </button>
                      <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                        <div className="overflow-hidden">
                          <p className="px-4 text-[13px] text-ink-3 -mt-1 mb-3">{c.description[lang]}</p>
                          <div className="px-4 pb-4 flex flex-wrap gap-2">
                            {skills.map((s) => {
                              const on = goals.includes(s.id);
                              return (
                                <Chip key={s.id} active={on} onClick={() => toggleGoal(s.id)} style={on ? { background: compColor(c.id, 0.42, 0.1), borderColor: compColor(c.id, 0.42, 0.1) } : undefined}>
                                  {s.name[lang]}
                                  {s.popular && !on && <span className="h-1.5 w-1.5 rounded-full" style={{ background: compColor(c.id) }} />}
                                </Chip>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6">
              <header>
                <h1 className="display text-[28px] leading-tight">{t(lang, "ob_selfrate_title")}</h1>
                <p className="text-[14px] text-ink-3 mt-2">{t(lang, "ob_selfrate_sub")}</p>
              </header>
              <ul className="flex flex-col gap-4">
                {goals.map((g, i) => {
                  const s = skillById(g);
                  const v = rates[g] ?? 2.5;
                  return (
                    <li key={g} className="card p-4 rise" style={{ "--i": i } as React.CSSProperties}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[15px]">{s.name[lang]}</p>
                          <p className="text-[13px] text-ink-3 mt-0.5">{s.behavior[lang]}</p>
                        </div>
                        <Level value={v} color={compColor(s.competency)} className="mt-1.5" />
                      </div>
                      <input type="range" min={1} max={5} step={0.5} value={v} onChange={(e) => setRates((r) => ({ ...r, [g]: Number(e.target.value) }))} className="mt-3" aria-label={s.name[lang]} />
                      <div className="flex justify-between text-[11px] text-ink-4 -mt-1">
                        <span>{t(lang, "rate_1")}</span>
                        <span className="font-medium" style={{ color: compColor(s.competency, 0.45, 0.09) }}>{t(lang, (`rate_${Math.round(v)}` as "rate_1"))}</span>
                        <span>{t(lang, "rate_5")}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6">
              <header>
                <h1 className="display text-[28px] leading-tight">{t(lang, "ob_ctx_title")}</h1>
                <p className="text-[14px] text-ink-3 mt-2">{t(lang, "ob_ctx_sub")}</p>
              </header>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {CONTEXTS.map((c, i) => {
                  const on = contexts.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => setContexts((x) => (on ? x.filter((y) => y !== c.id) : [...x, c.id]))}
                      className={clsx("press card text-left p-4 flex flex-col gap-2 min-h-[104px] rise", on && "border-ink bg-inset", i === CONTEXTS.length - 1 && CONTEXTS.length % 2 === 1 && "col-span-2")}
                      style={{ "--i": i } as React.CSSProperties}
                      aria-pressed={on}
                    >
                      <span className="text-[22px] leading-none">{c.glyph}</span>
                      <span className="font-semibold text-[15px]">{c.name[lang]}</span>
                      <span className="text-[12px] text-ink-3 leading-snug">{c.types.slice(0, 3).map((x) => x[lang]).join(" · ")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-6">
              <header>
                <h1 className="display text-[28px] leading-tight">{t(lang, "ob_profile_title")}</h1>
                <p className="text-[14px] text-ink-3 mt-2">{t(lang, "ob_profile_sub")}</p>
              </header>
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">{t(lang, "ob_name")}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t(lang, "ob_name_ph")} className="h-12 px-4 rounded-xl bg-card border border-line text-[15px] placeholder:text-ink-4" maxLength={24} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="eyebrow">{lang === "zh" ? "关于你" : "About you"}</span>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t(lang, "ob_bio_ph")} rows={4} className="px-4 py-3 rounded-xl bg-card border border-line text-[15px] leading-relaxed placeholder:text-ink-4" maxLength={300} />
                <span className="text-[11px] text-ink-4 self-end num">{bio.length}/300</span>
              </label>
              <div className="flex items-center justify-between">
                <span className="eyebrow">{t(lang, "ob_lang")}</span>
                <div className="inline-flex rounded-full border border-line p-0.5 text-[12px] font-medium">
                  {(["zh", "en"] as Lang[]).map((l) => (
                    <button key={l} onClick={() => setLang(l)} className={clsx("press px-3 h-7 rounded-full", lang === l ? "bg-ink text-paper" : "text-ink-3")}>
                      {l === "zh" ? "中文" : "English"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Said once, at zero cost to anyone who does not care. */}
              <div className="dotted pt-4 flex items-center justify-between gap-4">
                <p className="text-[12px] text-ink-3 leading-relaxed">{t(lang, "ob_model_note")}</p>
                <button
                  type="button"
                  onClick={openModelSheet}
                  className="press shrink-0 h-8 px-3 rounded-full border border-dashed border-line-strong text-[12px] font-medium text-ink-2 hover:bg-inset"
                >
                  {t(lang, "ob_model_quickset")}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <BottomBar className="px-5 pb-safe pb-6 pt-3 lg:pb-8">
        {step === 1 && (
          <p className={clsx("text-center text-[13px] mb-2", canNext ? "text-moss" : "text-ink-3")}>
            {goals.length === 0 ? t(lang, "ob_goals_pick_more") : t(lang, "ob_goals_ok", { n: goals.length })}
          </p>
        )}
        {step < STEPS - 1 ? (
          <Button block size="lg" variant={step === 0 ? "ink" : "primary"} disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            {step === 0 ? t(lang, "ob_start") : t(lang, "next")}
          </Button>
        ) : (
          <Button block size="lg" onClick={finish}>{t(lang, "ob_done")}</Button>
        )}
      </BottomBar>
    </div>
  );
}
