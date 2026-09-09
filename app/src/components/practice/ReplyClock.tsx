"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { clsx } from "clsx";
import { t } from "@/lib/i18n";
import { PATIENCE_OPTIONS, type Patience } from "@/store/useApp";
import type { Lang } from "@/data/taxonomy";

/**
 * 0 — quiet. 1 — they look at you. 2 — they are losing patience.
 * 3 — the moment passed: the other side is about to carry on without you.
 */
export type ClockStage = 0 | 1 | 2 | 3;

interface Options {
  /** The scene is on the clock at all. */
  enabled: boolean;
  /** How long the other side waits, in ms. Stages fall at a third and two thirds of it. */
  budgetMs: number;
  /** It is the learner's move: the last line is the other side's and nothing is streaming. */
  armed: boolean;
  /**
   * Something legitimate is in the way — a sheet, the microphone, a hint on its
   * way, a hidden tab. Time stands still rather than running out on a wait that
   * is not the learner's thinking.
   */
  paused: boolean;
  /** Identity of the line being answered. A new one resets the clock. */
  turnKey: string | null;
  /** The line is being read aloud; start once it has been heard, not when it appeared. */
  waitForSpeech: boolean;
  onStage?: (stage: ClockStage) => void;
  onLapse: () => void;
}

/** Room to finish reading before the other side starts waiting. Longer on arrival. */
const SETTLE_FIRST_MS = 2000;
const SETTLE_MS = 900;
/** A stuck `speechSynthesis.speaking` must not hold the scene hostage. */
const SPEECH_WAIT_CAP_MS = 20000;

const speechBusy = () => {
  try {
    return typeof speechSynthesis !== "undefined" && (speechSynthesis.speaking || speechSynthesis.pending);
  } catch {
    return false;
  }
};

/**
 * The other side's patience, as a clock the learner cannot see the digits of.
 *
 * Real conversations do not wait fifteen seconds for an answer, and this makes
 * the simulation stop waiting too. It drives one line that drains across the
 * composer and a stage that the scene reacts to; the digits are deliberately
 * not shown, because a number turns a social moment into a quiz timer.
 *
 * Time is banked in a ref and only advances while `running`, so anything that
 * pauses the scene freezes the line where it is instead of letting it burn.
 * `lineRef` is the caller's element; only its transform is written, per frame,
 * so React never re-renders for time.
 */
export function useReplyClock(lineRef: RefObject<HTMLElement | null>, { enabled, budgetMs, armed, paused, turnKey, waitForSpeech, onStage, onLapse }: Options) {
  const elapsedRef = useRef(0);
  // -1 means "not yet published for this run": the first frame then always
  // writes the stage to state, so switching the mode off and back on for the
  // same line cannot leave a stale stage showing.
  const stageRef = useRef<ClockStage | -1>(-1);
  const firstArmRef = useRef(true);
  // The callbacks fire from a frame loop; keep the latest closures without
  // restarting the loop every render.
  const latest = useRef({ onStage, onLapse });
  useEffect(() => {
    latest.current = { onStage, onLapse };
  });

  // Stage and readiness are keyed by the line they belong to, so a new line
  // reads as stage 0 / not ready without a reset that has to race the render.
  const [st, setSt] = useState<{ key: string | null; stage: ClockStage }>({ key: null, stage: 0 });
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  // Switching the mode off and on again for the same line is a fresh clock:
  // forget the stage that was showing, in the same render, before it can flash.
  const [seenEnabled, setSeenEnabled] = useState(enabled);
  if (seenEnabled !== enabled) {
    setSeenEnabled(enabled);
    setSt({ key: null, stage: 0 });
  }
  const stage: ClockStage = st.key === turnKey ? st.stage : 0;
  const ready = readyFor === turnKey && turnKey !== null;

  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // A new line, or the mode switching on: the bank empties and the line is whole again.
  useEffect(() => {
    elapsedRef.current = 0;
    stageRef.current = -1;
    if (lineRef.current) lineRef.current.style.transform = "scaleX(1)";
  }, [turnKey, enabled, lineRef]);

  // Settle, then (if the line is being spoken) wait for the voice to finish.
  useEffect(() => {
    if (!enabled || !armed || !turnKey || readyFor === turnKey) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = performance.now();
    const poll = () => {
      if (waitForSpeech && speechBusy() && performance.now() - startedAt < SPEECH_WAIT_CAP_MS) {
        timer = setTimeout(poll, 200);
        return;
      }
      setReadyFor(turnKey);
    };
    timer = setTimeout(() => {
      firstArmRef.current = false;
      poll();
    }, firstArmRef.current ? SETTLE_FIRST_MS : SETTLE_MS);
    return () => clearTimeout(timer);
  }, [enabled, armed, turnKey, readyFor, waitForSpeech]);

  const running = enabled && armed && ready && !paused && !hidden && stage < 3;

  // The clock itself. Only transform is touched per frame; React hears about
  // stage changes, not about time.
  useEffect(() => {
    if (!running) return;
    const since = performance.now();
    let frame = 0;
    const tick = () => {
      const elapsed = elapsedRef.current + (performance.now() - since);
      const frac = Math.min(1, elapsed / budgetMs);
      if (lineRef.current) lineRef.current.style.transform = `scaleX(${1 - frac})`;
      const next: ClockStage = frac >= 1 ? 3 : frac >= 2 / 3 ? 2 : frac >= 1 / 3 ? 1 : 0;
      if (next !== stageRef.current) {
        const fresh = stageRef.current === -1;
        stageRef.current = next;
        setSt({ key: turnKey, stage: next });
        if (!fresh) latest.current.onStage?.(next);
        if (next === 3) {
          latest.current.onLapse();
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      elapsedRef.current += performance.now() - since;
    };
  }, [running, budgetMs, turnKey, lineRef]);

  /** Give the same line a fresh clock — after a lapse the other side never got to answer. */
  const restart = useCallback(() => {
    elapsedRef.current = 0;
    stageRef.current = 0;
    if (lineRef.current) lineRef.current.style.transform = "scaleX(1)";
    setSt({ key: turnKey, stage: 0 });
  }, [turnKey, lineRef]);

  return {
    stage,
    running,
    /** The line has something to show: the clock is on this line and has not run out. */
    visible: enabled && armed && ready && stage < 3,
    restart,
  };
}

/** Where the stages fall for a given patience, in whole seconds, for the copy that explains them. */
export function clockMarks(seconds: number): { a: number; b: number; c: number } {
  return { a: Math.round(seconds / 3), b: Math.round((seconds * 2) / 3), c: seconds };
}

/** The other side's patience, in seconds. A segmented pill like the theme picker in Settings. */
export function PatiencePicker({ value, onChange, lang }: { value: number; onChange: (p: Patience) => void; lang: Lang }) {
  return (
    <div className="inline-flex rounded-full border border-line p-0.5 text-[12px] font-medium" role="radiogroup" aria-label={t(lang, "pr_clock_patience")}>
      {PATIENCE_OPTIONS.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          className={clsx("press px-3 min-h-11 rounded-full inline-flex items-center num", value === p ? "bg-ink text-paper" : "text-ink-3")}
        >
          {t(lang, "pr_clock_seconds", { n: p })}
        </button>
      ))}
    </div>
  );
}
