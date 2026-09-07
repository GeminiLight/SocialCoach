import { hueColor } from "@/lib/format";

/**
 * Avatars.
 *
 * Three decisions hold this together, and each one is a reaction to how
 * procedural avatars usually fail.
 *
 * 1. **The vocabulary is drawn by hand; only the choosing is procedural.**
 *    Generating shapes from a seed is what makes an avatar set look cheap —
 *    the result is always a shape nobody would have drawn. So the seed picks
 *    from small curated sets instead. This is the same call `scenario-icons`
 *    already makes with its explicit allow-list rather than a dynamic lookup.
 *
 * 2. **Colour is not random.** Every character in the corpus already carries an
 *    author-assigned `hue`, so the axis that can clash is already curated and
 *    the generator never touches it. Randomising form cannot produce an ugly
 *    palette; randomising palette eventually will.
 *
 * 3. **The figure is a presence, not a description.** It reads as "a person is
 *    speaking" at 28px, which is what an avatar in a two-character scene is
 *    actually for — there is never a wall of them to tell apart. The masses are
 *    deliberately abstract: nothing here should amount to a claim about how
 *    someone looks, least of all inferred from their name.
 *
 * Five independent axes give 360 figures, which is far more than this product
 * needs and enough that two characters in one scene will not collide.
 */

/** FNV-1a into xorshift32: stable across renders, platforms and reloads. */
function seeded(str: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.codePointAt(i)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  let s = h || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}
const pick = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)];

/** Shoulders, from narrow to broad. The figure sits in a 24-unit box. */
const SHOULDERS = [
  "M2.6 24c0-5.3 4.2-8.3 9.4-8.3s9.4 3 9.4 8.3z",
  "M0.8 24c1-6.1 4.7-8.7 11.2-8.7S22.2 17.9 23.2 24z",
  "M4.2 24c0-4.3 3.5-7.4 7.8-7.4s7.8 3.1 7.8 7.4z",
  "M0 24c1.8-5.2 5.4-8 12-8s10.2 2.8 12 8z",
  "M3 24c.4-5 3.9-7.9 9-7.9s8.6 2.9 9 7.9z",
] as const;

/**
 * A darker mass over the crown of the head. Read it as weight and shadow, not
 * as hair: the shapes are asymmetric and abstract on purpose, and one is empty
 * so a share of figures carry none at all.
 */
const CROWNS = [
  "M6.5 8.4C6.5 4.1 8.9 2.2 12 2.2s5.5 1.9 5.5 6.2c-1.4-2.5-3-3-5.5-3s-4.1.5-5.5 3",
  "M6.2 9.2C5.8 4.4 8.5 1.9 12 1.9s5.9 2.3 5.7 7.3c-.8-3.1-2.5-4.4-5.7-4.4S7 6.1 6.2 9.2",
  "M6.8 7.8C7.4 3.9 9.4 2.1 12 2.1c3.5 0 5.3 2.5 5.3 6.4-.7-1.5-1.3-2.1-2.1-2.5-1.3 1.5-5.5 1.7-8.4 1.8",
  "M6.4 8.6C6.4 4.3 8.8 2 12 2c3.4 0 5.7 2.4 5.6 6.8-.5-1.2-1-1.9-1.7-2.4-.4 1.6-1.6 2.3-3.9 2.3-2.6 0-4.5-1-5.6-2.7",
  "M7 7.4c.3-3.6 2.2-5.3 5-5.3s4.7 1.7 5 5.3c-1.2-1.6-2.8-2.2-5-2.2s-3.8.6-5 2.2",
  "",
] as const;

const HEAD_R = [4.0, 4.4, 4.8] as const;
const HEAD_Y = [8.4, 9.1] as const;
/**
 * Horizontal offset for the whole figure. This is the axis that decides whether
 * the avatar reads as a designed portrait or as the operating system's default
 * account glyph: a head centred over symmetrical shoulders is exactly that
 * glyph, no matter how the masses vary. Off-centre, it reads as a crop.
 */
const OFFSET = [-1.7, -0.8, 0.8, 1.7] as const;

/** Every colour goes through `hueColor`, which resolves per scheme, so the
 *  ground darkens and the figure lightens in dark mode without a second set. */
const GROUND = (hue: number) => hueColor(hue, 0.928, 0.022);
const BAND = (hue: number) => hueColor(hue, 0.895, 0.03);
const FIGURE = (hue: number) => hueColor(hue, 0.42, 0.05);
const CROWN_INK = (hue: number) => hueColor(hue, 0.3, 0.045);
const RING = (hue: number) => hueColor(hue, 0.815, 0.03);

export interface FigureSpec {
  shoulders: string;
  crown: string;
  headR: number;
  headY: number;
  dx: number;
  band: number | null;
}

/** Resolve a seed to one figure. Exported so a picker can show alternatives. */
export function figureFor(seed: string): FigureSpec {
  const r = seeded(seed || "?");
  return {
    shoulders: pick(r, SHOULDERS),
    crown: pick(r, CROWNS),
    headR: pick(r, HEAD_R),
    headY: pick(r, HEAD_Y),
    dx: pick(r, OFFSET),
    // A horizon behind the figure, on most of them: it gives the ground
    // something to be, and its height is the one freely-varying number here.
    band: r() < 0.62 ? 8.5 + r() * 8 : null,
  };
}

/**
 * The learner's own seed. Every scenario calls their character 「你」, so the
 * name alone would give every user the same figure; `nth` is the re-roll.
 */
export function learnerSeed(name: string, nth = 0) {
  return `${name.trim() || "you"}#${nth}`;
}

export function AvatarFigure({
  seed,
  hue,
  size = 40,
  className,
}: {
  seed: string;
  hue: number;
  size?: number;
  className?: string;
}) {
  const f = figureFor(seed);
  // The round crop is CSS, not an SVG clipPath: a clip needs a unique id per
  // instance, and a counter that advances on every render makes the server and
  // client disagree about what the markup was.
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full align-middle${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false" style={{ display: "block" }}>
        <rect width="24" height="24" fill={GROUND(hue)} />
        {f.band !== null && <path d={`M0 ${f.band.toFixed(1)}h24v24H0z`} fill={BAND(hue)} />}
        {/* Scaled about the bottom edge so the shoulders run off the frame like
            a portrait crop rather than sitting inside it like an icon. */}
        <g transform={`translate(${(12 + f.dx).toFixed(2)} 24) scale(1.06) translate(-12 -24)`}>
          <path d={f.shoulders} fill={FIGURE(hue)} />
          <circle cx="12" cy={f.headY} r={f.headR} fill={FIGURE(hue)} />
          {f.crown && <path d={f.crown} fill={CROWN_INK(hue)} />}
        </g>
        <circle cx="12" cy="12" r="11.5" fill="none" stroke={RING(hue)} strokeWidth="0.9" />
      </svg>
    </span>
  );
}
