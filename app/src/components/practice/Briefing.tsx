"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Clock, MessageSquare } from "lucide-react";
import { Avatar, BottomBar, Button, IconButton, Marginalia, Stages } from "@/components/ui";
import { SkillTag } from "@/components/SkillBits";
import { ScenarioCover } from "@/components/ScenarioCover";
import { useApp, useLang } from "@/store/useApp";
import { t, tList } from "@/lib/i18n";
import { schedule } from "@/lib/client-api";
import { historyFor, npcsOf } from "@/lib/session-utils";
import type { Session } from "@/lib/types";
import { contextById } from "@/data/taxonomy";
import { learnerSeed } from "@/data/avatars";


export function Briefing({ session }: { session: Session }) {
  const lang = useLang();
  const router = useRouter();
  const { profile, proficiency, sessions, updateSession, settings } = useApp();
  const [err, setErr] = useState<string | null>(null);
  const inflight = useRef(false);
  const sc = session.scenario;
  const adapting = !session.adaptation;

  useEffect(() => {
    if (!adapting || !profile || inflight.current) return;
    inflight.current = true;
    schedule({ profile, proficiency, history: historyFor(sessions, lang), lang, scenario: sc })
      .then((res) => updateSession(session.id, { adaptation: res.adaptation, learnerCharacterId: res.adaptation.learnerCharacterId }))
      .catch((e) => setErr(e instanceof Error ? e.message : t(lang, "error_generic")))
      .finally(() => { inflight.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapting, profile]);

  const learner = sc.characters.find((c) => c.id === session.learnerCharacterId);
  const npcs = npcsOf(sc, session.learnerCharacterId);
  const ctx = contextById(sc.context);
  const objectives = session.adaptation?.objectives ?? sc.objectives.map((o) => o[lang]);

  const enter = () => {
    updateSession(session.id, { status: "active", startedAt: Date.now() });
  };

  return (
    <div className="min-h-dvh flex flex-col pt-safe lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-x-12 lg:items-start lg:mx-auto lg:w-full lg:max-w-[1000px] xl:max-w-[1120px] lg:px-6 lg:pt-6 lg:pb-12">
      <div className="contents lg:block">
      <div className="relative h-44 shrink-0 bg-paper-deep lg:h-64 lg:rounded-[var(--radius-lg)] lg:overflow-hidden">
        <ScenarioCover scenario={sc} full />
        <div className="absolute inset-x-0 top-0 px-3 pt-2 flex items-center justify-between">
          <IconButton label={t(lang, "back")} onClick={() => router.push("/")} className="bg-paper/80"><ArrowLeft size={20} /></IconButton>
          <span className="h-8 px-3 inline-flex items-center gap-1.5 rounded-full bg-paper/85 text-[12px] font-medium">{ctx.glyph} {ctx.name[lang]} · {sc.contextType[lang]}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-paper to-transparent lg:hidden" />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="px-5 -mt-6 flex flex-col gap-6 pb-36 lg:px-0 lg:mt-7 lg:pb-0">
        <header className="flex flex-col gap-2">
          <p className="eyebrow">{t(lang, "pr_briefing")}</p>
          <h1 className="display text-[30px] leading-[1.15]">{sc.title[lang]}</h1>
          <div className="flex items-center gap-3 text-[12px] text-ink-3 num">
            <span className="inline-flex items-center gap-1"><Clock size={13} />{sc.minutes} {t(lang, "min")}</span>
            <span className="inline-flex items-center gap-1"><MessageSquare size={13} />{sc.maxTurns} {t(lang, "turns")}</span>
            <span>{t(lang, `diff_${sc.difficulty}` as "diff_1")}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">{sc.skills.map((k) => <SkillTag key={k} id={k} lang={lang} small />)}</div>
        </header>

        {adapting && !err ? (
          <div className="card p-5"><Stages title={t(lang, "pr_preparing")} steps={tList(lang, "home_scheduling_steps").slice(3)} intervalMs={5000} slowAfterMs={25000} /></div>
        ) : (
          <>
            <p className="text-[16px] leading-relaxed text-ink">{session.adaptation?.briefing ?? sc.background[lang]}</p>
            {err && <p className="text-[13px] text-danger">{err}</p>}
          </>
        )}

        <section className="flex flex-col gap-3">
          <span className="eyebrow">{t(lang, "pr_characters")}</span>
          <div className="flex flex-col gap-3">
            {learner && (
              <div className="flex items-center gap-3 inset px-3 py-2.5">
                <Avatar name={learner.name[lang]} hue={learner.hue} size={40} seed={learnerSeed(profile?.name ?? "", settings.avatarSeed)} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold">{t(lang, "pr_you_play")} · {learner.role[lang]}</p>
                  {learner.id !== "you" && <p className="text-[12px] text-ink-3 truncate">{learner.name[lang]}</p>}
                </div>
              </div>
            )}
            {npcs.map((c) => (
              <div key={c.id} className="flex items-start gap-3 px-1">
                <Avatar name={c.name[lang]} hue={c.hue} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold">{c.name[lang]} <span className="text-ink-3 font-normal">· {c.role[lang]}</span></p>
                  <p className="text-[13px] text-ink-3 leading-snug mt-0.5">{c.personality[lang]}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3 lg:hidden">
          <span className="eyebrow">{t(lang, "pr_objectives")}</span>
          <ObjectiveList items={objectives} />
        </section>

        {session.adaptation?.focus && (
          <section className="bubble-coach px-4 py-3.5 flex flex-col gap-1">
            <span className="eyebrow text-accent-deep">{t(lang, "pr_focus")}</span>
            <p className="text-[14px] leading-relaxed">{session.adaptation.focus}</p>
          </section>
        )}
        <p className="text-[11px] text-ink-4">{t(lang, "source")}: {sc.source}</p>
      </motion.div>
      </div>

      {/* the margin: what you are trying to do, right next to the briefing */}
      <Marginalia lgOnly className="lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:gap-5">
        <span className="eyebrow">{t(lang, "pr_objectives")}</span>
        <ObjectiveList items={objectives} />
        <Button block size="lg" variant="ink" onClick={enter} disabled={adapting && !err} className="mt-1">
          {t(lang, "pr_enter")} <ArrowRight size={18} />
        </Button>
      </Marginalia>

      <BottomBar className="px-5 pb-safe pb-6 pt-4 lg:hidden">
        <Button block size="lg" variant="ink" onClick={enter} disabled={adapting && !err}>
          {t(lang, "pr_enter")} <ArrowRight size={18} />
        </Button>
      </BottomBar>
    </div>
  );
}

/** Numbered objectives — same list in the phone flow and the desktop margin. */
function ObjectiveList({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((o, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-snug lg:text-[14px]">
          <span className="h-6 w-6 shrink-0 rounded-md border border-line-strong inline-flex items-center justify-center num text-[12px] text-ink-2">{i + 1}</span>
          <span>{o}</span>
        </li>
      ))}
    </ol>
  );
}
