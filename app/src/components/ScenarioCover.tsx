"use client";
import { clsx } from "clsx";
import type { Scenario } from "@/data/corpus/types";
import { ScenarioIcon, scenarioIconName } from "@/data/scenario-icons";
import { useLang } from "@/store/useApp";

/** A small, curated palette follows the scene's subject, shared by tiles and covers. */
function scenarioTone(scenario: Scenario) {
  const icon = scenarioIconName(scenario);
  if (["flame", "message-square-warning", "shield-alert", "megaphone", "user-x"].includes(icon)) return "clay";
  if (["banknote", "piggy-bank", "trophy", "receipt", "gift"].includes(icon)) return "ochre";
  if (["heart", "heart-crack", "coffee", "moon", "wine"].includes(icon)) return "rose";
  if (["split", "clock", "calendar-x", "clipboard-list", "package", "scale", "briefcase", "battery-low"].includes(icon)) return "olive";
  return "teal";
}

/** The opening clause, so the annotation lands on the telling phrase. */
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

  const tone = scenarioTone(scenario);

  if (!full && !tall) {
    return (
      <span
        className={clsx("scenario-tile relative shrink-0 rounded-xl grid place-items-center border", className)}
        data-tone={tone}
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
    <div className={clsx("scenario-cover absolute inset-0 overflow-hidden", className)} data-tone={tone} aria-hidden>
      {/* manuscript margin */}
      <span className="absolute inset-y-0 left-8 w-px lg:left-10" style={{ background: "var(--scene-rule)" }} />

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
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: "var(--scene-color)" }} />
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
            style={{ textDecorationColor: "var(--scene-color)" }}
          >
            {head}
          </span>
          {rest}
        </p>
      </div>


    </div>
  );
}
