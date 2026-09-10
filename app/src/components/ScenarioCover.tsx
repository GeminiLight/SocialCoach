"use client";
import { clsx } from "clsx";
import type { Scenario } from "@/data/corpus/types";
import { AvatarFigure } from "@/data/avatars";
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

/**
 * The opening clause, so the annotation lands on the telling phrase. A one-word
 * interjection ("嘿，" / "Hey,") is not a phrase yet, so clauses accumulate until
 * there are a few characters of substance; a line with no punctuation at all is
 * underlined whole, as before.
 */
function firstClause(text: string): [string, string] {
  let head = "";
  for (const m of text.matchAll(/[^，,。；;！？!?…]+[，,。；;！？!?…]?/g)) {
    head += m[0];
    if (head.replace(/[，,。；;！？!?…\s]/g, "").length >= 4) break;
  }
  if (!head) head = text;
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
  // A full-width 「 hangs by its whole em; a curly quote by about half of one.
  const hang = lang === "zh" ? "1em" : "0.5em";

  if (tall) {
    /*
      The desktop cover is a page of the transcript, not a poster. Ruled paper
      runs the full height and is anchored to the bottom edge, with the quote
      anchored there too, so every line of it sits on a rule however many lines
      it takes. The person saying it gets a face; the quote gets the mark a
      quotation marks the line deserves, the opening one hung into the gutter as
      a typesetter would. Nothing here is a category illustration — every element
      comes from this scenario.
    */
    return (
      <div className={clsx("scenario-cover scenario-cover-tall absolute inset-0 overflow-hidden", className)} data-tone={tone} aria-hidden>
        <span className="scenario-ruling absolute inset-0" />
        {/* manuscript margin */}
        <span className="absolute inset-y-0 left-10 w-px" style={{ background: "var(--scene-rule)" }} />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 pl-16 pr-8 pb-[calc(var(--rule)*2)]">
          {speaker && (
            <span className="flex items-center gap-3">
              <AvatarFigure seed={speaker.name[lang]} hue={speaker.hue} size={36} />
              <span className="flex flex-col min-w-0">
                <span className="eyebrow truncate">{speaker.role[lang]}</span>
                {speaker.name[lang] !== speaker.role[lang] && <span className="text-[12px] text-ink-3 truncate">{speaker.name[lang]}</span>}
              </span>
            </span>
          )}
          {/* Hanging punctuation: the opening mark sits in the gutter so the
              first character lines up with the ones below it. The clamp clips
              overflow, so the box is widened by the hang and shifted back. */}
          <p
            className="display text-ink text-[20px] leading-[var(--rule)] line-clamp-4"
            style={{ textIndent: `-${hang}`, marginLeft: `-${hang}`, paddingLeft: hang }}
          >
            {lang === "zh" ? "「" : "\u201C"}
            <span
              className="underline decoration-[2.5px] underline-offset-[5px] [text-decoration-skip-ink:none]"
              style={{ textDecorationColor: "var(--scene-color)" }}
            >
              {head}
            </span>
            {rest}
            {lang === "zh" ? "」" : "\u201D"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("scenario-cover absolute inset-0 overflow-hidden", className)} data-tone={tone} aria-hidden>
      {/* manuscript margin */}
      <span className="absolute inset-y-0 left-8 w-px lg:left-10" style={{ background: "var(--scene-rule)" }} />

      {/*
        `full` is used at two very different heights — 96px in the arena grid and
        160-176px on the home card and briefing — so it centres a two-line quote
        with even padding instead of reserving a fixed top strip. At 160px+ that
        leaves ~49px above the text, which clears the badges call sites overlay
        at `left-4 top-4` (16px + 28px). `tall` (280px+) is its own layout above.
      */}
      <div className="absolute inset-0 flex flex-col justify-center gap-1.5 pr-4 pl-11 lg:pl-14 py-4">
        {speaker && (
          <span className="flex items-center gap-1.5 eyebrow">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: "var(--scene-color)" }} />
            <span className="truncate">{speaker.role[lang]}</span>
          </span>
        )}

        <p className="display text-ink text-[14px] leading-snug line-clamp-2">
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
