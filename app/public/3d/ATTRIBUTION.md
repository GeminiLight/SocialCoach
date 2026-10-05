# SocialCoach 3D asset attribution

Exported 2026-10-05 with Blender 5.2.2 LTS. The live cast uses the cohesive adult animation direction. File checksums, sizes and animation contracts are in `v2/manifest.json`; downloaded source checksums are in `sources.json`.

| Material | Author / source | License | SocialCoach changes |
|---|---|---|---|
| Human base, anatomical targets and game-engine rig | MakeHuman Community / Data Collection AB, Joel Palmius, Jonas Hauquier; [MPFB asset license](https://github.com/makehumancommunity/mpfb2/blob/afb9f530a7c2741dedb8df0ebae2e0b183caec21/LICENSE.ASSETS.md) | CC0-1.0 | Bake 16 identities; remove helpers and covered skin; fit skeleton, clothing and camera anchors |
| Fitted anatomy, source appearance references, teeth, casual / male formal clothes, shoes | [MakeHuman system assets](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html), makehuman_system | CC0-1.0 | Mild connected head/eye proportions; replace photo skin and alpha hair/brows with authored vertex pigments and solid geometry; simplify garment colors and oral interior; keep fitted clothing weights |
| Female formal suits | Margaret Toigo (MRT), [Suits 01](https://static.makehumancommunity.org/assets/assetpacks/suits01.html) | CC0-1.0 | Fit to Lin and Fang; reduce textures; preserve garment weights |
| ARKit-style face units | Mika Suominen, [Faceunits 01](https://static.makehumancommunity.org/assets/assetpacks/faceunits01.html) | CC0-1.0 | Combine blink/smile; adapt all targets to connected head proportions, add brow-down and lip press, move lower oral interior with jaw; neutral weights start at zero |
| Wood Table 001 texture | Dimitrios Savva (photography), Rico Cilliers (processing), [Poly Haven](https://polyhaven.com/a/wood_table_001) | CC0-1.0 | Reduce to 256px broad grain, repaint with CSS pigments, retain metric UVs |
| Wood Floor Deck texture | Dimitrios Savva, [Poly Haven](https://polyhaven.com/a/wood_floor_deck) | CC0-1.0 | Reduce to 256px broad grain, repaint with CSS pigments, retain metric UVs |
| Five environments, tableware, sculpted hair/brows, painted eyeballs, facial controls, eyeglass frames, poses and integration | SocialCoach contributors | Apache-2.0 | Authored in `app/scripts/blender`; no third-party furniture models or image-generated runtime meshes |
| Draco decoder (JavaScript and WebAssembly) | Google, distributed with Three.js 0.180.0; [Draco](https://github.com/google/draco) | Apache-2.0 | Copied unchanged, hosted locally |
| Three.js distribution containing the decoder files | Three.js authors | MIT | Runtime dependency; license preserved |

Powered by Poly Haven. See [Poly Haven's license](https://polyhaven.com/license) and the [Public API documentation](https://github.com/Poly-Haven/Public-API).

MPFB 2.0.17 source commit `afb9f530a7c2741dedb8df0ebae2e0b183caec21` is an **external production tool**, licensed GPL-3.0. Its code is not bundled into SocialCoach or the browser. Its CC0 graphical assets have a separate license. Blender is also an external production tool.

Full license notices are under `licenses/`. The application and SocialCoach additions retain the repository's Apache-2.0 license; upstream graphical materials retain CC0-1.0.
