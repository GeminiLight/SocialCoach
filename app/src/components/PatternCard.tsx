"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import { useApp, useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";
import { pattern as patternApi } from "@/lib/client-api";
import { skillById } from "@/data/taxonomy";
import type { PatternSession } from "@/lib/tasks/types";
import type { Session } from "@/lib/types";

/** Three is the fewest that can show a habit rather than a coincidence. */
const MIN_SESSIONS = 3;

function toInput(s: Session): PatternSession {
  const trail = s.stanceTrail ?? [];
  const gaveGroundOn: number[] = [];
  trail.forEach((v, i) => {
    if (v < (i === 0 ? 20 : trail[i - 1])) gaveGroundOn.push(i + 1);
  });
  return {
    title: s.scenario.title.zh || s.scenario.title.en,
    at: s.endedAt ?? s.startedAt,
    outcome: s.outcome,
    verdict: s.report?.verdict,
    gaveGroundOn,
    turns: s.messages.filter((m) => m.role === "learner").length,
    weaknesses: (s.report?.weaknesses ?? []).map((w) => ({
      behavior: w.behavior,
      evidence: w.evidence,
      skill: w.skill,
      deficit: w.deficit,
    })),
  };
}

/**
 * The one thing you keep doing.
 *
 * The product proposal names this the engine that converts someone with a
 * conversation tomorrow into someone training a skill, on the grounds that an
 * acute problem becomes a chronic one the moment you see it is a habit. It was
 * the one thing in that document with no implementation: every report was
 * per-session, and Growth showed totals.
 *
 * It runs on the smart model over the whole history, so it is cached against the
 * set of session ids it read and only offered again when there is new material.
 */
export function PatternCard() {
  const lang = useLang();
  const { sessions, profile, patternInsight, setPatternInsight } = useApp();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inflight = useRef(false);

  const done = sessions.filter((s) => s.status === "assessed" && s.report);
  const ids = done.map((s) => s.id);
  const cached = patternInsight;
  const stale = !cached || ids.some((id) => !cached.from.includes(id));
  const enough = done.length >= MIN_SESSIONS;

  const run = useCallback(async () => {
    if (inflight.current || !profile) return;
    inflight.current = true;
    setBusy(true);
    setErr(null);
    try {
      const res = await patternApi({ lang, goals: profile.goals, sessions: done.map(toInput) });
      setPatternInsight(res, ids);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t(lang, "error_generic"));
    } finally {
      inflight.current = false;
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, profile, done.length, setPatternInsight]);

  // Read it once when there is new material, then leave it alone.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kick off an async request on mount
    if (enough && stale && !busy && !err) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enough, stale]);

  if (!enough) {
    return (
      <div className="card p-5 flex flex-col gap-2">
        <p className="eyebrow text-accent-deep">{t(lang, "pg_pattern_title")}</p>
        <p className="text-[14px] text-ink-3 leading-relaxed">
          {t(lang, "pg_pattern_locked", { n: MIN_SESSIONS - done.length })}
        </p>
      </div>
    );
  }

  const r = cached?.result;
  const showing = r && !stale;

  return (
    <div className="bg-slab text-slab-ink rounded-[var(--radius)] p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow text-slab-ink/60">{t(lang, "pg_pattern_title")}</p>
        {showing && (
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy}
            aria-label={t(lang, "pg_pattern_again")}
            className="press shrink-0 text-slab-ink/60 hover:text-slab-ink disabled:opacity-40"
          >
            <RefreshCw size={15} className={busy ? "animate-spin" : undefined} />
          </button>
        )}
      </div>

      {err ? (
        <div className="flex flex-col gap-3 items-start">
          <p className="text-[14px] leading-relaxed">{err}</p>
          <Button variant="secondary" size="sm" onClick={() => { setErr(null); void run(); }}>{t(lang, "retry")}</Button>
        </div>
      ) : busy || !cached ? (
        <p className="inline-flex items-center gap-2 text-[14px] text-slab-ink/70"><Spinner />{t(lang, "pg_pattern_reading")}</p>
      ) : !r?.found ? (
        <p className="text-[14px] leading-relaxed text-slab-ink/80">{t(lang, "pg_pattern_none")}</p>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col gap-4">
          <p className="display text-[21px] leading-snug lg:text-[24px]">{r.pattern}</p>
          {r.why && <p className="text-[14px] leading-relaxed text-slab-ink/80 lg:max-w-[var(--measure)]">{r.why}</p>}

          {/* The quotes are the whole claim to legitimacy: this reads harder than
              any single debrief, so it shows its two receipts rather than asserting. */}
          <ul className="flex flex-col gap-2.5 border-l border-slab-ink/25 pl-3.5">
            {r.evidence.map((e, i) => (
              <li key={i} className="flex flex-col gap-0.5">
                <span className="text-[11px] text-slab-ink/55">{e.title}</span>
                <span className="text-[13.5px] leading-relaxed text-slab-ink/90">“{e.quote}”</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
            {r.skill && <span className="text-[12px] text-slab-ink/60">{skillById(r.skill).name[lang]}</span>}
            {r.nextStep && <span className="text-[13.5px] font-semibold">{r.nextStep}</span>}
          </div>
        </motion.div>
      )}
    </div>
  );
}
