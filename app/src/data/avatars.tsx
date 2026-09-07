import { hueColor, huePair } from "@/lib/format";

/**
 * Avatars: a cameo, the bust seen from the side.
 *
 * The first version composed a head circle with a shoulder dome and varied five
 * axes independently. Two things were wrong with it, and both were the same
 * mistake. The head never touched the shoulders — measured across every one of
 * the 360 combinations, the gap ran from 1.4 to 4.2 units in a 24-unit box, so
 * there was never a neck — and it read as the operating system's default account
 * glyph, because a front-facing head over symmetrical shoulders IS that glyph.
 * Curating each vocabulary is not enough when what varies freely is the
 * relationship between them: nobody had looked at any actual combination.
 *
 * So the figure is a profile, and the whole outline is ONE path. A profile
 * cannot collide with the default glyph, carries far more identity (brow, nose,
 * lip, chin, hair silhouette, and which way they face), and is a paper craft to
 * begin with, which is the aesthetic this product already lives in. Nothing can
 * come apart, because there are no separate parts.
 *
 * Two things it still does not do. Colour is never random: every character in
 * the corpus carries an author-assigned `hue`, so the axis that can clash stays
 * curated. And the proportions are fixed ranges around a vetted base, not free
 * numbers — a nose given room to grow becomes a beak, which is what it did.
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
const n = (v: number) => v.toFixed(2);

export interface CameoSpec {
  cx: number;
  /** Top of the skull. */
  crown: number;
  /** Half-depth of the skull, front to back. */
  depth: number;
  brow: number;
  /** How far the nose leaves the face plane. Small on purpose. */
  nose: number;
  noseY: number;
  mouth: number;
  chin: number;
  /** Bottom of the throat, where the shoulders take over. */
  neck: number;
  shW: number;
}

/** The silhouette, from the nape up over the crown, down the face, out to the shoulders. */
export function cameoPath(p: CameoSpec): string {
  const { cx, crown, depth, brow, nose, noseY, mouth, chin, neck, shW } = p;
  const back = cx - depth;
  const face = cx + depth * 0.82; // the plane the nose projects from
  const nape = back + 2.0;
  const shTop = neck + 0.6;
  return (
    `M${n(nape)} ${n(neck)}` +
    `C${n(back - 0.4)} ${n(neck - 2.2)} ${n(back - 0.7)} ${n(crown + 3.2)} ${n(back + 0.8)} ${n(crown + 1.4)}` +
    `C${n(back + 2.3)} ${n(crown - 0.4)} ${n(face - 1.0)} ${n(crown - 0.4)} ${n(face + 0.1)} ${n(brow - 1.6)}` +
    `C${n(face + 0.7)} ${n(brow - 0.8)} ${n(face + 0.5)} ${n(brow - 0.1)} ${n(face + 0.2)} ${n(brow + 0.5)}` +
    // the bridge out to a rounded tip: three curves, never a corner
    `C${n(face + 0.1)} ${n(brow + 1.1)} ${n(face + nose * 0.55)} ${n(noseY - 0.85)} ${n(face + nose)} ${n(noseY - 0.2)}` +
    `C${n(face + nose + 0.16)} ${n(noseY + 0.14)} ${n(face + nose - 0.3)} ${n(noseY + 0.4)} ${n(face + nose - 0.85)} ${n(noseY + 0.48)}` +
    `C${n(face - 0.3)} ${n(noseY + 0.72)} ${n(face - 0.5)} ${n(mouth - 0.45)} ${n(face - 0.12)} ${n(mouth - 0.08)}` +
    // the mouth as one soft swell; a notch here reads as an open jaw
    `C${n(face + 0.34)} ${n(mouth + 0.16)} ${n(face + 0.2)} ${n(mouth + 0.62)} ${n(face - 0.28)} ${n(mouth + 0.9)}` +
    `C${n(face - 0.04)} ${n(chin - 0.85)} ${n(face - 0.14)} ${n(chin - 0.22)} ${n(face - 0.9)} ${n(chin)}` +
    `C${n(face - 2.5)} ${n(chin + 0.85)} ${n(cx + 0.5)} ${n(chin + 1.1)} ${n(cx + 0.3)} ${n(neck - 0.3)}` +
    `C${n(cx + 0.5)} ${n(shTop + 0.5)} ${n(cx + 2.0)} ${n(shTop + 0.9)} ${n(cx + 4.2)} ${n(shTop + 1.7)}` +
    `C${n(cx + shW * 0.62)} ${n(shTop + 2.7)} ${n(cx + shW)} ${n(shTop + 4.4)} ${n(cx + shW)} 24` +
    `L${n(cx - shW)} 24` +
    `C${n(cx - shW)} ${n(shTop + 4.2)} ${n(back - 1.4)} ${n(shTop + 1.6)} ${n(nape)} ${n(neck)}` +
    "Z"
  );
}

/**
 * Hair, over the skull. Each shape is anchored to the points the outline already
 * uses, so it cannot float free of the head, and each closes on a curve — a
 * path that ends on a corner reads as a spike, which is what it looked like.
 */
const HAIR: (((p: CameoSpec) => string) | null)[] = [
  null,
  // cropped close
  (p) => {
    const back = p.cx - p.depth, face = p.cx + p.depth * 0.82;
    return (
      `M${n(back + 0.3)} ${n(p.brow + 1.3)}` +
      `C${n(back - 1.2)} ${n(p.crown + 2.4)} ${n(back + 2.2)} ${n(p.crown - 1.2)} ${n(face - 0.5)} ${n(p.brow - 2.0)}` +
      `C${n(face + 0.4)} ${n(p.brow - 1.3)} ${n(face - 1.5)} ${n(p.brow - 0.9)} ${n(face - 2.4)} ${n(p.brow - 0.5)}` +
      `C${n(back + 2.6)} ${n(p.brow + 0.1)} ${n(back + 1.4)} ${n(p.brow + 0.8)} ${n(back + 0.3)} ${n(p.brow + 1.3)}Z`
    );
  },
  // swept back, volume above the brow
  (p) => {
    const back = p.cx - p.depth, face = p.cx + p.depth * 0.82;
    return (
      `M${n(back - 0.7)} ${n(p.brow + 2.2)}` +
      `C${n(back - 2.1)} ${n(p.crown + 2.0)} ${n(back + 1.5)} ${n(p.crown - 1.9)} ${n(face - 0.3)} ${n(p.brow - 2.5)}` +
      `C${n(face + 0.7)} ${n(p.brow - 1.5)} ${n(face - 1.7)} ${n(p.brow - 1.0)} ${n(face - 2.8)} ${n(p.brow - 0.5)}` +
      `C${n(back + 2.2)} ${n(p.brow + 0.3)} ${n(back + 0.8)} ${n(p.brow + 1.5)} ${n(back - 0.7)} ${n(p.brow + 2.2)}Z`
    );
  },
  // gathered at the nape
  (p) => {
    const back = p.cx - p.depth, face = p.cx + p.depth * 0.82;
    return (
      `M${n(back + 0.2)} ${n(p.chin + 0.4)}` +
      `C${n(back - 2.4)} ${n(p.chin - 0.6)} ${n(back - 2.2)} ${n(p.crown + 1.8)} ${n(back + 0.9)} ${n(p.crown + 0.7)}` +
      `C${n(back + 2.5)} ${n(p.crown - 0.9)} ${n(face - 1.1)} ${n(p.crown - 0.9)} ${n(face - 0.4)} ${n(p.brow - 1.9)}` +
      `C${n(face - 1.7)} ${n(p.brow - 0.6)} ${n(back + 2.5)} ${n(p.brow + 0.5)} ${n(back + 1.9)} ${n(p.brow + 2.4)}` +
      `C${n(back + 1.6)} ${n(p.chin - 1.4)} ${n(back + 1.9)} ${n(p.chin - 0.2)} ${n(back + 0.2)} ${n(p.chin + 0.4)}Z`
    );
  },
  // long, falling behind the shoulder
  (p) => {
    const back = p.cx - p.depth, face = p.cx + p.depth * 0.82;
    return (
      `M${n(back - 1.5)} ${n(p.neck + 3.6)}` +
      `C${n(back - 2.9)} ${n(p.chin - 0.2)} ${n(back - 2.1)} ${n(p.crown + 1.5)} ${n(back + 1.0)} ${n(p.crown + 0.6)}` +
      `C${n(back + 2.6)} ${n(p.crown - 1.0)} ${n(face - 1.1)} ${n(p.crown - 1.0)} ${n(face - 0.4)} ${n(p.brow - 2.0)}` +
      `C${n(face - 1.8)} ${n(p.brow - 0.5)} ${n(back + 2.3)} ${n(p.brow + 0.7)} ${n(back + 2.1)} ${n(p.chin - 0.6)}` +
      `C${n(back + 2.0)} ${n(p.neck + 1.2)} ${n(back + 1.4)} ${n(p.neck + 2.6)} ${n(back + 1.0)} ${n(p.neck + 3.5)}` +
      `C${n(back + 0.2)} ${n(p.neck + 4.1)} ${n(back - 0.9)} ${n(p.neck + 4.1)} ${n(back - 1.5)} ${n(p.neck + 3.6)}Z`
    );
  },
  // a knot at the crown
  (p) => {
    const back = p.cx - p.depth, face = p.cx + p.depth * 0.82;
    return (
      `M${n(back + 0.3)} ${n(p.brow + 1.2)}` +
      `C${n(back - 1.3)} ${n(p.crown + 2.3)} ${n(back + 2.1)} ${n(p.crown - 1.0)} ${n(face - 0.5)} ${n(p.brow - 1.9)}` +
      `C${n(face - 1.6)} ${n(p.brow - 0.7)} ${n(back + 2.3)} ${n(p.brow + 0.3)} ${n(back + 0.3)} ${n(p.brow + 1.2)}Z` +
      `M${n(back + 1.1)} ${n(p.crown - 0.7)}a1.7 1.55 0 1 0 0.01 0Z`
    );
  },
];

const DEPTH = [3.5, 3.8, 4.1] as const;
const CROWN = [4.3, 4.8] as const;
/** A nose given room to grow becomes a beak; this range is the vetted one. */
const NOSE = [0.72, 0.95, 1.2] as const;
const CHIN = [12.7, 13.2, 13.7] as const;

/** Every colour resolves per scheme, so dark mode needs no second palette. */
const GROUND = (hue: number) => hueColor(hue, 0.928, 0.022);
const BAND = (hue: number) => hueColor(hue, 0.898, 0.03);
const FIGURE = (hue: number) => hueColor(hue, 0.45, 0.048);
const RING = (hue: number) => hueColor(hue, 0.815, 0.03);
/**
 * Hair has to stay darker than the face in BOTH schemes, and the mirrored
 * mapping cannot do that: it sends the darker of two inputs further up, so hair
 * ends up lighter than skin in dark mode. `FIGURE` resolves to 0.73 there, so
 * this states 0.60 directly rather than deriving it.
 */
const HAIR_INK = (hue: number) => huePair(hue, 0.3, 0.6, 0.045);

export interface Cameo {
  spec: CameoSpec;
  hair: ((p: CameoSpec) => string) | null;
  facingLeft: boolean;
  band: number | null;
}

/** Resolve a seed to one cameo. Exported so a picker can show alternatives. */
export function cameoFor(seed: string): Cameo {
  const r = seeded(seed || "?");
  const depth = pick(r, DEPTH);
  const crown = pick(r, CROWN);
  const nose = pick(r, NOSE);
  const chin = pick(r, CHIN);
  const brow = crown + 3.5 + r() * 0.6;
  return {
    spec: {
      cx: 11.3 + r() * 0.7,
      crown,
      depth,
      brow,
      nose,
      noseY: brow + 1.6 + r() * 0.4,
      mouth: chin - 1.25,
      chin,
      neck: chin + 1.8,
      shW: 13.6,
    },
    hair: pick(r, HAIR),
    facingLeft: r() < 0.5,
    band: r() < 0.6 ? 7.5 + r() * 8 : null,
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
  const c = cameoFor(seed);
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
        {c.band !== null && <path d={`M0 ${c.band.toFixed(1)}h24v24H0z`} fill={BAND(hue)} />}
        <g transform={c.facingLeft ? "translate(24 0) scale(-1 1)" : undefined}>
          <path d={cameoPath(c.spec)} fill={FIGURE(hue)} />
          {c.hair && <path d={c.hair(c.spec)} fill={HAIR_INK(hue)} />}
        </g>
        <circle cx="12" cy="12" r="11.5" fill="none" stroke={RING(hue)} strokeWidth="0.9" />
      </svg>
    </span>
  );
}
