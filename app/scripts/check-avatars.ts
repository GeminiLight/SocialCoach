/** Run from app/: npx tsx scripts/check-avatars.ts
 * Persistence and seed compatibility, independent of the portrait's art direction.
 * Visual quality is checked in the browser at 28, 40, 56 and 112 px. */
import assert from "node:assert/strict";
import { learnerSeed, parsePortrait, portraitCollection, portraitFor, portraitSeed } from "../src/data/avatars";

const oldSeed = learnerSeed(" 林可 ", 3);
assert.equal(oldSeed, "林可#3", "legacy names and numeric selections must remain readable");
assert.deepEqual(portraitFor(oldSeed), portraitFor(oldSeed), "reload must not randomize a portrait");
assert.notDeepEqual(portraitFor(learnerSeed("林可", 0)), portraitFor(oldSeed));
const presets = [0, 1, 2].flatMap(portraitCollection);
assert.equal(new Set(presets.map(portraitSeed)).size, 24, "browsing should offer distinct choices");
for (const p of presets) {
  const saved = portraitSeed(p);
  assert.deepEqual(parsePortrait(saved), p, "saving must retain every customization");
  assert.deepEqual(portraitFor(saved, 280), p, "a scenario's hue must not overwrite a chosen palette");
  assert.equal(learnerSeed("New name", 0, saved), saved, "renaming must preserve a saved portrait");
}
for (const invalid of ["", "portrait:v2:0:0:0:0:0:0", "portrait:v1:8:0:0:0:0:0", "portrait:v1:0:4:0:0:0:0", "portrait:v1:0:0:3:0:0:0", "portrait:v1:0:0:0:2:0:0", "portrait:v1:0:0:0:0:3:0", "portrait:v1:0:0:0:0:0:5", "portrait:v1:NaN:0:0:0:0:0", "portrait:v1:0:0:0:0:0:0:extra"]) {
  assert.equal(parsePortrait(invalid), null);
  assert.equal(learnerSeed("林可", 3, invalid), oldSeed, "malformed saved data must fall back safely");
}
console.log("avatars: 24 distinct presets; persistence, renaming, legacy seeds and malformed-data fallback passed");
