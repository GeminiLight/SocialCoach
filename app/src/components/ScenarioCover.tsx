"use client";
import { clsx } from "clsx";
import type { Scenario } from "@/data/corpus/types";
import { ScenarioIcon } from "@/data/scenario-icons";
import { useLang } from "@/store/useApp";
import { hueColor } from "@/lib/format";

/**
 * Covers are built from the scenario's own words, not from a template.
 *
 * The previous version keyed one bubble motif per `context` — but 14 of 34
 * scenarios are `workplace`, so the four cards you see side by side on the home
 * page all drew the same picture, and the palette came from character hues that
 * span the whole wheel (mint, purple, magenta — none of them ours).
 *
 * Rule that replaced it: **structure comes from content, category only picks
 * colour.** Here the content is `opening.text` — the line the other person
 * opens with. Every scenario has a different one, so no two covers can repeat,
 * and the cover does something an illustration cannot: it tells you what you
 * are walking into. The 44px tile shows the person instead — see below.
 */

/** The opening clause, so the coach's ochre mark lands on the telling phrase. */
function firstClause(text: string): [string, string] {
  const m = text.match(/^[^，,。；;！？!?…]{2,}[，,。；;！？!?…]?/);
  const head = m?.[0] ?? text;
  return [head, text.slice(head.length)];
}

export function ScenarioCover({
  scenario,
  size = 48,
  full = false,
  tall = false,
  className,
}: {
  scenario: Scenario;
  size?: number;
  full?: boolean;
  tall?: boolean;
  className?: string;
}) {
  const lang = useLang();
  const npc =
    scenario.characters.find((c) => c.id === scenario.opening.characterId) ??
    scenario.characters.find((c) => c.id !== "you" && !c.playable);

  /*
    A 44px tile cannot meaningfully separate 34 scenarios — context is 41%
    workplace and the primary competency is 50% relationship-skills, so keying
    the mark on either category collapses back to one picture. The only thing
    that genuinely differs per scenario is the person: show who you are up
    against. Same source as the large cover, one step quieter.
  */
  if (!full && !tall) {
    return (
      <span
        className={clsx("relative shrink-0 rounded-xl grid place-items-center bg-paper-deep border border-line text-ink-2", className)}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <ScenarioIcon scenario={scenario} size={Math.round(size * 0.46)} />
      </span>
    );
  }

  const speaker = npc;
  const [head, rest] = firstClause(scenario.opening.text[lang]);

  return (
    <div className={clsx("absolute inset-0 overflow-hidden bg-paper-deep", className)} aria-hidden>
      {/* manuscript margin */}
      <span className="absolute inset-y-0 left-8 w-px bg-line lg:left-10" />

      {/*
        `full` is used at two very different heights — 96px in the arena grid and
        160-176px on the home card and briefing — so it centres a two-line quote
        with even padding instead of reserving a fixed top strip. At 160px+ that
        leaves ~49px above the text, which clears the badges call sites overlay
        at `left-4 top-4` (16px + 28px). `tall` is 280px+ and does reserve one.
      */}
      <div
        className={clsx(
          "absolute inset-0 flex flex-col justify-center gap-1.5 pr-4 pl-11 lg:pl-14",
          tall ? "pt-14 pb-6 gap-2.5" : "py-4",
        )}
      >
        {speaker && (
          <span className="flex items-center gap-1.5 eyebrow">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: hueColor(speaker.hue, 0.55, 0.11) }} />
            <span className="truncate">{speaker.role[lang]}</span>
          </span>
        )}

        <p
          className={clsx(
            "display text-ink",
            tall ? "text-[19px] leading-[1.45] line-clamp-4" : "text-[14px] leading-snug line-clamp-2",
          )}
        >
          {/* colour via inline style: an unrecognised `decoration-*` utility fails
              silently in Tailwind v4 — no error, just no colour. */}
          <span
            className="underline decoration-[2.5px] underline-offset-[5px] [text-decoration-skip-ink:none]"
            style={{ textDecorationColor: "var(--accent)" }}
          >
            {head}
          </span>
          {rest}
        </p>
      </div>

      <span className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-paper-deep to-transparent" />
    </div>
  );
}
