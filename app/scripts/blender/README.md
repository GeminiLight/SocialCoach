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

Each character exports 12 named pose clips: standing / seated idle, toast, phone, palm, folded arms and leaning forward. Four neutral face shapes drive blinking, jaw opening, a small smile and brow emphasis.

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

The command fails on glTF errors **or warnings**. Khronos currently reports Draco as an unsupported extension (informational); therefore browser decoding and animation playback are also required. Do not suppress transform or tangent warnings. Current exports triangulate normal-mapped surfaces and put skinned meshes at the glTF scene root.

The scene preserves existing navigation coordinates and old saves. One virtual unit is approximately 0.56 m; actors are around 3 virtual units tall. Seated pelvis, per-actor leg lengths, camera eye heights and hand anchors are solved consistently. Colors are read from the OKLCH tokens in `globals.css`; texture photographs retain their own authored color.

Browser acceptance covers: seated / standing; first / third views; independent movement; tracking and free look; leader and group toasts; cups / phone; doors and documents; Chinese / English; portrait framing; draft editing and history. Check cold loading separately from warmed rendering. All 24 exports total 51.0 MiB but **only the current room and cast load**; do not preload every character or put them into the service worker's offline shell.

The 2026-10-05 finish pass keeps the original anatomy and anchors, with 2K skin / 1K cloth diffuse maps, JPEG quality 80 for opaque photographs, small baked micro normals and morph normals. `surface_detail.py` exports repeatable tangent-space data; it adds no runtime Blender dependency or external request. Transparent hair / brows retain their alpha images. Triangulate while preserving shape-key / UV / weight layers and export tangents for both the full rig and first-person arms.

Dining rooms have thinner glazed rims, shaped dishes with different meal combinations, folded foliage and quieter walnut normals. The work table has fitted linen. Work / family rugs are joined into `Floor`, preserving click-to-walk; other decorative surfaces must not consume floor hits. Exporters save editable sources under `--asset-root`; run `finalize.mjs` after the whole batch, never halfway through an export.
