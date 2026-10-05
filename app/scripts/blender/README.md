# Blender asset production

This pipeline builds all 15 NPCs, the player, two first-person arms, five rooms and tea / wine props. The browser loads GLB exports; Blender and MPFB are not runtime requirements.

Verified environment: Blender **5.2.2 LTS** (`d13f752e3b9c`), MPFB **2.0.17** commit `afb9f530a7c2741dedb8df0ebae2e0b183caec21`, Three.js **0.180.0**. Source permissions and checksums: [`public/3d/ATTRIBUTION.md`](../../public/3d/ATTRIBUTION.md), [`sources.json`](../../public/3d/sources.json).

## Source layout

Choose an external working directory, supplied as `--asset-root`. Unzip the CC0 **MakeHuman system assets**, **Suits 01** and **Faceunits 01** packs into its `system/`, `suits/`, `faceunits/` directories. Pack contents should start at `clothes/`, `skins/` etc.; Faceunits at `targets/faceunits/`. Download links and SHA-256 are recorded in `sources.json`. Clone the official [MPFB source](https://github.com/makehumancommunity/mpfb2) separately at the commit above; do not copy its GPL code into this repository.

Place Poly Haven's 1K JPEG `Diffuse`, `nor_gl`, `Rough` maps in `textures/`, named `{wood_table_001,wood_floor_deck}_{diff,nor_gl,rough}.jpg`. Recorded exact URLs and checksums are in `sources.json`. Original photographs stay in the external cache; exporters create reduced copies under `texture-cache/`.

## Rebuild

Run from `app/`. Replace the example paths with your source/cache paths. Each command runs an isolated background process with factory defaults, leaving open Blender projects and user preferences alone.

```sh
BLENDER=/Applications/Blender.app/Contents/MacOS/Blender
ASSET_WORK=/path/to/asset-work
MPFB_SOURCE=/path/to/mpfb2

"$BLENDER" --background --factory-startup --python-exit-code 1 --python scripts/blender/build_characters.py -- \
  --mpfb-source "$MPFB_SOURCE" --asset-root "$ASSET_WORK" --out public/3d/v2 \
  --only chen,lin,zhou,aunt,mom,dad,senior,yue,kai,fang,qiao,cheng,he,ning,rui,player
"$BLENDER" --background --factory-startup --python-exit-code 1 --python scripts/blender/build_rooms.py -- \
  --asset-root "$ASSET_WORK" --out public/3d/v2 --css src/app/globals.css
"$BLENDER" --background --factory-startup --python-exit-code 1 --python scripts/blender/build_hands.py -- \
  --source "$ASSET_WORK/player.blend" --out public/3d/v2
node scripts/blender/finalize.mjs
pnpm test:dinner
```

Independent neutral head, chin, cheek and nose targets in `identities.py` are baked before fitting eyes, hair and the rig; age, gender or recoloring alone do not define a face.

Each character exports 12 named pose clips: standing / seated idle, toast, phone, palm, folded arms and leaning forward. Six neutral face shapes drive blinking, jaw opening, a small smile, raised inner brows, lowered brows and pressed lips. Runtime emotions use small, smoothed combinations; oral interior and solid brows follow the corresponding face controls.

The live direction is **adult animation** (`adult-animation-v1`). `animation_style.py` applies a mild head enlargement to the continuous skin, fitted accessories, all shape keys and rest skeleton, with a smooth neck transition. It authors matte vertex pigments, a curved painted eyeball, fitted opaque brows and sculpted hair masses with short / bob / gathered styles and mature temples. Broad 256px garment and wood color maps preserve collars, tailoring and grain. The current build has no photo skin, alpha hair cards or photo eyes; no outline postprocessing is required.

Every character and room also saves a **packed, editable `.blend`** in `ASSET_WORK`. Local delivered source files live in `.blender-work/generated/` at the repository root and are ignored by Git. Reproducible production scripts, source manifests and GLBs are committed; large source packs and Blender caches are not uploaded with the web app.

Use `--only chen` (characters) or `--only work` (rooms) for a targeted rebuild. `--render` on the character builder produces an offline diagnostic portrait, not browser acceptance evidence. After any model change, run `finalize.mjs` to refresh camera anchors and asset hashes. Regenerate first-person arms after changing the player's anatomy or sleeves.

## Validation and browser acceptance

Install the official `gltf-validator` in a separate tooling directory, then:

```sh
GLTF_VALIDATOR_PATH=/path/to/tooling/node_modules/gltf-validator \
  node scripts/blender/validate.mjs /path/to/validation-report.json
```

Check the actual deformed shoes in all 16 editable sources as well:

```sh
"$BLENDER" --background --factory-startup --python-exit-code 1 --python scripts/blender/verify_sources.py -- \
  --asset-root "$ASSET_WORK" --report "$ASSET_WORK/contact-report.json"
```

This checks both feet in standing and seated poses (32 posture pairs), rather than assuming rig markers prove contact.

Also check eye/eyelid contact on the actual deformed geometry:

```sh
"$BLENDER" --background --factory-startup --python-exit-code 1 --python scripts/blender/verify_animation.py -- \
  --source "$ASSET_WORK" --report "$ASSET_WORK/eye-contact.json"
```

This checks neutral iris visibility, closed-lid coverage and raw mesh/Basis agreement for every actor. It does not replace visual near-view checks for grazing camera angles, emotional blends or props.

For fast art iteration on already fitted **pre-animation** packed sources, `restyle_characters.py --source /path/to/immutable-originals --save /path/to/new-sources --out public/3d/v2 --only chen` applies the same treatment. Never use a restyled source as input, or the anatomical transform will accumulate. The regular `build_characters.py` command above remains the clean rebuild path.

The command fails on glTF errors **or warnings**. Khronos currently reports Draco as an unsupported extension (informational); therefore browser decoding and animation playback are also required. Do not suppress transform or tangent warnings. Current exports triangulate normal-mapped surfaces and put skinned meshes at the glTF scene root.

The scene preserves existing navigation coordinates and old saves. One virtual unit is approximately 0.56 m; actors are around 3 virtual units tall. Seated pelvis, per-actor leg lengths, camera eye heights and hand anchors are solved consistently. Colors are read from the OKLCH tokens in `globals.css`; texture photographs retain their own authored color.

Browser acceptance covers: seated / standing; first / third views; independent movement; tracking and free look; leader and group toasts; cups / phone; doors and documents; Chinese / English; portrait framing; draft editing and history. Check cold loading separately from warmed rendering. All 24 animation exports total approximately 30.0 MiB but **only the current room and cast load**; do not preload every character or put them into the service worker's offline shell.

The earlier 2026-10-05 finish pass used 2K skin / 1K cloth photographs and alpha wigs; the animation pass supersedes those appearance assets. Triangulation still preserves shape keys / UV / weights, including vertex pigments. Keep raw mesh positions aligned with edited Basis coordinates before BMesh triangulation; otherwise the old head is restored while the eye/teeth transform remains changed.

Dining rooms have thinner glazed rims, shaped dishes with different meal combinations, folded foliage and quieter walnut normals. The work table has fitted linen. Work / family rugs are joined into `Floor`, preserving click-to-walk; other decorative surfaces must not consume floor hits. Exporters save editable sources under `--asset-root`; run `finalize.mjs` after the whole batch, never halfway through an export.

The follow-up composition pass adds woven individual settings and concave porcelain spoons. Plate wells, bowl feet and resting cup heights agree with the placemat top. Wine and tea use distinct existing pigments; the wine foot is narrower. Only three dining rooms and props are re-exported; character anatomy, poses and navigation anchors remain the same. Camera framing, grip placement and shared anisotropic filtering live in the runtime; see the [acceptance record](../../../wiki/reviews/review-2026-10-05-3d-framing.md).

The reference comparison pass reopens visual acceptance: the user rejected the quality gap to concept A. Work-table dimensions and anchors now come from `dinnerGeometry.json`, shared with navigation and props; classic rooms keep their original geometry. The work cast / player have smaller head exaggeration, fitted almond-eye openings, recessed glossy eyes, more restrained lips and revised garments. `pose(..., id=...)` authors connected table-resting idle arms for the three work actors. Preserve this id when generating their clips. These assets still fall short of the reference's character artistry; a validated export is not visual approval.

The work mural is an imagegen-authored artwork texture at `public/3d/art/work-landscape-reference.webp` (about 225 KiB), with its reference and prompt in `docs/art-direction/3d-animation/work-landscape-reference.json`. It is not a flattened scene or a substitute for 3D characters. Rebuild `--only work` after changing the shared geometry, and regenerate the player's arms after changing its appearance.
