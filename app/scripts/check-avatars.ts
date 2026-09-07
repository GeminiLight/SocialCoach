/** Run from app/: npx tsx scripts/check-avatars.ts
 *
 * The previous avatar composed a head circle with a shoulder dome and let five
 * axes vary independently. Every one of the 360 combinations had a gap between
 * the head and the shoulders — there was never a neck — because what varied
 * freely was the relationship between vocabularies nobody had looked at
 * together. These assertions are about that class of bug, not that instance.
 */
import assert from "node:assert/strict";
import { cameoFor, cameoPath, learnerSeed } from "../src/data/avatars";

const SEEDS = [
  "Linda", "Jason", "Ben", "妈妈", "学姐", "室友", "Mei", "你", "Ana", "小赵",
  "导师", "前台", "Sam", "Anna", "哥哥", "房东", "Kim", "老王", "表姐", "邻居",
  ...Array.from({ length: 180 }, (_, i) => `seed-${i}`),
  ...Array.from({ length: 12 }, (_, i) => learnerSeed("林可", i)),
  "", "?", "a", "🙂", "  ",
];

function coords(d: string): number[] {
  const out = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  assert.ok(out.length > 40, "path should carry a real outline");
  return out;
}

/**
 * The smallest y in a path. Parity alone does not give y: `a` takes seven
 * numbers, not pairs, so it breaks the alternation — reading y as "every space-
 * preceded number" was comparing x values against a y bound, which is how this
 * check first failed on a correct drawing.
 */
function topOf(d: string): number {
  let min = Infinity;
  for (const seg of d.split("M").slice(1)) {
    if (seg.includes("a")) continue; // an arc; its own extent is bounded by its centre
    const nums = (seg.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    for (let i = 1; i < nums.length; i += 2) min = Math.min(min, nums[i]);
  }
  return min;
}

let bands = 0, hairs = 0, facingLeft = 0;
const shapes = new Set<string>();

for (const seed of SEEDS) {
  const c = cameoFor(seed);
  const d = cameoPath(c.spec);

  // 1. ONE subpath. This is what makes a detached head impossible: there are no
  //    separate parts to misalign, so the failure mode cannot recur.
  assert.equal((d.match(/M/g) ?? []).length, 1, `${seed}: outline must be a single subpath`);
  assert.equal((d.match(/Z/g) ?? []).length, 1, `${seed}: outline must close exactly once`);
  assert.ok(d.startsWith("M") && d.endsWith("Z"), `${seed}: outline must open with M and close with Z`);

  // 2. No NaN reaches the DOM. A single undefined parameter would silently
  //    render nothing at all rather than render wrongly.
  assert.ok(!/NaN|undefined|Infinity/.test(d), `${seed}: path contains a non-number`);

  // 3. The drawing stays in a sane box. The shoulders are meant to run past the
  //    frame; the head is not.
  const nums = coords(d);
  for (const v of nums) assert.ok(Number.isFinite(v) && v > -14 && v < 40, `${seed}: coordinate ${v} out of range`);
  const { spec } = c;
  const noseTip = spec.cx + spec.depth * 0.82 + spec.nose;
  assert.ok(noseTip < 21, `${seed}: nose reaches ${noseTip.toFixed(1)}, too close to the frame`);

  // 4. Vertical order of the face has to hold, or the profile is scrambled.
  assert.ok(spec.crown < spec.brow, `${seed}: crown below brow`);
  assert.ok(spec.brow < spec.noseY, `${seed}: brow below nose`);
  assert.ok(spec.noseY < spec.mouth, `${seed}: nose below mouth`);
  assert.ok(spec.mouth < spec.chin, `${seed}: mouth below chin`);
  assert.ok(spec.chin < spec.neck, `${seed}: chin below the throat`);
  // The visible neck is short. Long is what made the earlier version a lollipop.
  assert.ok(spec.neck - spec.chin <= 2.2, `${seed}: neck ${(spec.neck - spec.chin).toFixed(1)} too long`);

  // 5. Hair, where present, must overlap the skull rather than float above it.
  if (c.hair) {
    const h = c.hair(spec);
    assert.ok(!/NaN|undefined/.test(h), `${seed}: hair path contains a non-number`);
    for (const v of h.match(/-?\d+(\.\d+)?/g)!.map(Number)) {
      assert.ok(Number.isFinite(v) && v > -14 && v < 40, `${seed}: hair coordinate ${v} out of range`);
    }
    assert.ok(topOf(h) > spec.crown - 3.4, `${seed}: hair rises too far above the crown`);
    hairs++;
  }
  if (c.band !== null) bands++;
  if (c.facingLeft) facingLeft++;
  shapes.add(`${spec.depth}|${spec.crown}|${spec.nose}|${spec.chin}|${c.hair ? HAIRS(c) : "bald"}|${c.facingLeft}`);
}

function HAIRS(c: ReturnType<typeof cameoFor>) {
  return c.hair!(c.spec).slice(0, 12);
}

// 6. The seed has to actually spread. A generator that returns near-identical
//    figures is the other half of what was wrong with the last one.
const ratio = shapes.size / SEEDS.length;
assert.ok(ratio > 0.55, `only ${shapes.size} distinct figures from ${SEEDS.length} seeds`);
assert.ok(facingLeft > SEEDS.length * 0.3 && facingLeft < SEEDS.length * 0.7, `facing is lopsided: ${facingLeft}`);
assert.ok(hairs > SEEDS.length * 0.6, `too few figures have hair: ${hairs}`);

// 7. Stable across calls, or an avatar would change on every render.
for (const seed of ["Linda", "妈妈", learnerSeed("林可", 3)]) {
  assert.equal(cameoPath(cameoFor(seed).spec), cameoPath(cameoFor(seed).spec), `${seed}: not deterministic`);
}
// …and a re-roll must actually re-roll.
assert.notEqual(
  cameoPath(cameoFor(learnerSeed("林可", 0)).spec),
  cameoPath(cameoFor(learnerSeed("林可", 1)).spec),
  "re-roll produced the same figure",
);

console.log(
  `avatars: ${SEEDS.length} seeds, ${shapes.size} distinct figures (${(ratio * 100).toFixed(0)}%), ` +
    `${facingLeft} facing left, ${hairs} with hair, ${bands} with a horizon — all assertions passed`,
);
