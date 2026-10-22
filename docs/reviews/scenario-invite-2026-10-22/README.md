# Same-scene invitation acceptance — 2026-10-22

All practice words, profiles and reviews in these files are synthetic acceptance inputs. They are not real user feedback or evidence of growth. No friend was contacted. No research or credentials are included.

- `browser/`: 8 combinations of Chinese/English, light/dark, 375/1440 pixels, two isolated sender/receiver sessions. All model and telemetry requests intercepted. PNGs decoded locally, new pages checked with axe. The final run also asserts zero page errors.
- `release/first-visit/`: 4 combinations of invite language and fresh/existing opposite-language profile, unavailable model fixture. Checks server-rendered text, client notice/button/dialog, page errors and profile preservation. It now immediately opens the invite on a fresh page before seeding profiles, covering the archive-hydration click race.
- `release/local/`: iPhone 13 user-agent emulation at 375×900; fixture model and health. The full public-link journey includes two replies, reopening the outer invitation URL, resuming the same record, review and reinviting without private words.
- `release/main/`: same public journey on Vercel with fixture model responses and real hosted health. Metadata, PNG and Draco WASM fetched from the published origin and checked by SHA-256.
- Directories ending `-live` use real hosted roleplay/assessment with the same synthetic words. Telemetry and voice calls are blocked. These are controlled engineering runs, not user tests.
- `release/first-attempts/`: retained failures. The first harness missed the existing “看复盘” interstitial; separately, the app emitted React 418 due to an SSR/client language mismatch. The latter was reproduced in development and fixed, with four explicit regressions and page-error checks added to the eight-group matrix.

The ModelScope public URL must contain `app_path`. Testing is through the actual public outer page and its application iframe, including reloading the outer address. Do not replace this with an authenticated API URL or a redirect that drops the scene path.

Real iOS/Android native share panels, WeChat and physical-camera scanning still need real-device observation. Successful copying, saving or opening a share sheet does not mean delivery. No invitation tracking, friend relationship storage or inferred conversion is recorded.
