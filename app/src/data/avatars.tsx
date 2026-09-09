import type { CSSProperties } from "react";

/** Fixed portrait geometry; identity comes from drawn hairstyles and pigments,
 * never from randomly stretching facial features. No external image requests. */
export const AVATAR_PALETTES = ["clay", "ochre", "olive", "teal", "rose"] as const;
export const HAIR_COUNT = 8;
export interface Portrait {
  hair: number;
  skin: number;
  hairTone: number;
  glasses: boolean;
  shirt: number;
  palette: number;
}

function hash(seed: string) {
  let h = 0x811c9dc5;
  for (const char of seed) h = Math.imul(h ^ char.codePointAt(0)!, 0x01000193) >>> 0;
  return h;
}

export function portraitSeed(p: Portrait): string {
  return `portrait:v1:${p.hair}:${p.skin}:${p.hairTone}:${Number(p.glasses)}:${p.shirt}:${p.palette}`;
}

export function parsePortrait(seed: string): Portrait | null {
  const match = /^portrait:v1:([0-7]):([0-3]):([0-2]):([01]):([0-2]):([0-4])$/.exec(seed);
  if (!match) return null;
  const [hair, skin, hairTone, glasses, shirt, palette] = match.slice(1).map(Number);
  return { hair, skin, hairTone, glasses: !!glasses, shirt, palette };
}

export function portraitFor(seed: string, hue = 40): Portrait {
  const saved = parsePortrait(seed);
  if (saved) return saved;
  let h = hash(seed || "?");
  const next = (count: number) => { const value = h % count; h = Math.floor(h / count); return value; };
  return {
    hair: next(8), skin: next(4), hairTone: next(3), glasses: next(4) === 0, shirt: next(3),
    // Authored character hue selects a nearby muted paper pigment.
    palette: hue < 55 ? 0 : hue < 100 ? 1 : hue < 165 ? 2 : hue < 260 ? 3 : 4,
  };
}

/** Keep old numeric seeds readable. Once chosen, the portrait survives renaming. */
export function learnerSeed(name: string, nth = 0, portrait?: string) {
  return portrait && parsePortrait(portrait) ? portrait : `${name.trim() || "you"}#${nth}`;
}

/** Three browsable sets, with all eight silhouettes in each. */
export function portraitCollection(page: number): Portrait[] {
  return Array.from({ length: 8 }, (_, hair) => ({
    hair, skin: (hair + page) % 4, hairTone: (hair + page) % 3,
    glasses: (hair + page) % 3 === 1, shirt: (hair + page) % 3, palette: (hair + page * 2) % 5,
  }));
}

const HAIR_BACK = [
  "", "", "M28 54C20 35 27 19 47 18C70 16 80 33 72 61L77 83H23Z",
  "M27 49C16 48 19 35 24 31C20 22 30 15 38 17C44 8 56 11 60 17C72 14 82 27 76 34C85 45 77 57 69 55Z",
  "M29 54C22 37 28 24 41 21C31 15 38 7 47 9C60 7 67 15 58 22C76 27 77 44 69 56Z",
  "M25 54C19 33 30 17 49 18C70 16 80 34 74 55L71 74Q64 82 59 72L39 73Q26 82 25 54Z",
  "", "",
];
const HAIR_FRONT = [
  "M29 43C23 32 30 20 43 20C51 13 67 20 71 30L71 44L65 38L62 29C51 36 42 31 36 35L34 45Z",
  "M28 44C23 27 32 18 48 19C62 14 74 28 72 43L66 39L63 30C52 40 42 33 34 40L33 47Z",
  "M28 49C24 28 32 20 49 20C69 19 76 35 70 49L65 43L61 30C51 38 40 38 34 36L34 51Z",
  "M27 43C22 36 25 27 32 28C31 20 41 17 46 22C52 16 62 18 65 25C74 23 77 36 70 43L65 37L62 32C55 37 48 31 44 33C39 38 35 33 34 39L33 47Z",
  "M28 47C24 29 33 20 49 21C64 20 75 32 71 47L65 42L62 30Q50 39 37 31L34 45Z",
  "M27 48C23 30 33 20 49 20C65 18 76 30 72 49L65 43L64 34L58 34L56 30L52 35L35 35L34 48Z",
  "M29 41C25 30 34 23 48 23C61 20 72 30 71 41L65 36C55 31 42 32 35 37L34 44Z",
  "", // clean shaved head
];

export function AvatarFigure({ seed, hue, size = 40, className }: {
  seed: string; hue: number; size?: number; className?: string;
}) {
  const p = portraitFor(seed, hue);
  const palette = AVATAR_PALETTES[p.palette];
  const style = {
    width: size, height: size,
    "--portrait-skin": `var(--avatar-skin-${p.skin})`,
    "--portrait-shade": `var(--avatar-shade-${p.skin})`,
    "--portrait-hair": `var(--avatar-hair-${p.hairTone})`,
    "--portrait-ground": `var(--avatar-${palette}-paper)`,
    "--portrait-shirt": `var(--avatar-${palette}-ink)`,
  } as CSSProperties;
  return (
    <span className={`avatar-portrait inline-block shrink-0 overflow-hidden rounded-full align-middle${className ? ` ${className}` : ""}`} style={style}>
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false" style={{ display: "block" }}>
        <rect width="100" height="100" fill="var(--portrait-ground)" />
        {HAIR_BACK[p.hair] && <path d={HAIR_BACK[p.hair]} fill="var(--portrait-hair)" />}
        {/* Shoulders overlap a short neck, which overlaps the jaw. */}
        <path d="M13 102L17 87Q20 78 39 74H60Q79 77 84 88L89 102Z" fill="var(--portrait-shirt)" />
        <path d="M40 61L39 77Q49 89 60 77L59 60Z" fill="var(--portrait-skin)" />
        <path d="M40 62L59 62L59 71Q49 78 40 70Z" fill="var(--portrait-shade)" />
        <ellipse cx="30" cy="49" rx="5" ry="7" fill="var(--portrait-skin)" />
        <ellipse cx="70" cy="49" rx="5" ry="7" fill="var(--portrait-skin)" />
        <path d="M30 39C30 26 39 22 50 22C63 22 70 30 70 41L68 57C66 68 57 74 50 74C41 74 33 66 32 57Z" fill="var(--portrait-skin)" />
        {HAIR_FRONT[p.hair] && <path d={HAIR_FRONT[p.hair]} fill="var(--portrait-hair)" />}
        <g fill="none" stroke="var(--avatar-feature)" strokeLinecap="round" strokeLinejoin="round">
          <path d="M37 44Q40 42 44 44M56 44Q60 42 63 44" strokeWidth="1.5" />
          <path d="M50 49L48 56L51 57" stroke="var(--portrait-shade)" strokeWidth="1.8" />
          <path d="M45 63Q50 65 55 62" strokeWidth="1.5" />
        </g>
        <g fill="var(--avatar-feature)"><ellipse cx="41" cy="49" rx="1.5" ry="1.8" /><ellipse cx="59" cy="49" rx="1.5" ry="1.8" /></g>
        {p.glasses && <g fill="none" stroke="var(--avatar-feature)" strokeWidth="1.7">
          <rect x="33" y="44" width="14" height="12" rx="4.5" /><rect x="53" y="44" width="14" height="12" rx="4.5" />
          <path d="M47 48Q50 46 53 48M29 46L33 47M67 47L71 46" />
        </g>}
        {p.shirt === 0 && <path d="M36 76L43 83L49 80L42 91ZM63 76L56 83L50 80L57 91Z" fill="var(--avatar-linen)" />}
        {p.shirt === 1 && <path d="M36 77Q50 94 64 77" fill="none" stroke="var(--avatar-linen)" strokeWidth="3" />}
        {p.shirt === 2 && <path d="M34 78L44 89L39 100M65 78L56 89L61 100" fill="none" stroke="var(--avatar-linen)" strokeWidth="1.5" opacity="0.55" />}
      </svg>
    </span>
  );
}
