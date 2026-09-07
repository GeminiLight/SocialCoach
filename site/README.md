# site/ — 官网

SocialCoach 的对外官网：一页式、中英双语、纯静态，独立于 `app/` 的 Next.js 应用。

| 文件 | 作用 |
|---|---|
| `content.mjs` | 全部文案，`L(zh, en)` 双语对象，与 app 同一套约定。事实以 `wiki/00-product-proposal.md` 和 `README.md` 为准 |
| `build.mjs` | 零依赖构建：`node site/build.mjs` → `dist/`（中文在 `/`，英文在 `/en/`），附 `sitemap.xml` / `robots.txt` / `llms.txt` / JSON-LD / hreflang |
| `scripts/og.mjs` | 用 `app/node_modules` 里的 sharp 生成 1200×630 社交预览图到 `assets/og-{zh,en}.png`，改文案后重跑一次并提交 |
| `assets/` | `icon.svg`（与 `app/public/icon.svg` 同源）、OG 图、产品截图 |
| `../.github/workflows/site.yml` | 推送到 `main` 且改动了 `site/**` 时构建并发布到 GitHub Pages |

## 本地预览

```bash
node site/build.mjs
open site/dist/index.html          # 或 npx serve site/dist
```

## 部署

用 GitHub Pages 的 **GitHub Actions** 来源，不需要 `gh-pages` 分支：仓库 Settings → Pages → Source 选 "GitHub Actions"，之后每次改 `site/` 推送即发布。绑自有域名后 `configure-pages` 会把域名传给构建，canonical、hreflang、sitemap 自动跟随。

本地构建默认以 `https://geminilight.github.io/SocialCoach` 为站点地址，用 `SITE_URL=https://example.com node site/build.mjs` 覆盖。

同一份 `dist/` 也可以直接丢给 Vercel / Cloudflare Pages / 任何静态托管，页面内全部是相对路径。

## 产品截图

首屏与「复盘」一步预留了真实截图位，文件存在才渲染，不存在就不显示（不出现占位框）。按 `marketing/03-asset-plan.md` 的命名放进 `assets/`：

| 文件 | 出现位置 |
|---|---|
| `screenshot-01-home-{zh,en}.png` | 首屏右侧手机框，替代雷达装饰 |
| `screenshot-03-evidence-debrief-{zh,en}.png` | 「复盘先引用你的原话」一步右侧；同时把次要 CTA 从「看看它怎么练」换成「先看一次真实复盘」 |

竖屏 1170×2532 或等比例；画面里不能有真实姓名、公司、邮箱或 API key。

## 边界

- 不写「开源」，仓库尚无 LICENSE。
- 不写用户数、留存、好评等没有口径的数字。
- 论文与线上产品是两个版本：论文的 43,170 条研究语料不是产品内置规模；页面「研究」一节和 `llms.txt` 都明确了这条边界。
- 主句改动仍遵守三处同源（`README.md` / `layout.tsx` / `manifest.webmanifest`），这里的 `hero.h1` 是第四处，改主句时一起改。
