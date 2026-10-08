# site/ — 官网

SocialCoach 的对外官网：中英双语、纯静态，独立于 `app/` 的 Next.js 应用。首页之外有五个来自现有语料的对话练习预览，每个场景都有中英文页面。

| 文件 | 作用 |
|---|---|
| `content.mjs` | 官网首页文案，`L(zh, en)` 双语对象，与 app 同一套约定。事实以 `wiki/00-product-proposal.md` 和 `README.md` 为准 |
| `guides.mjs` | 五个情境的双语编辑文案；只写公开练习预览，不暴露角色的 `hidden`、成功条件或模型指令 |
| `home.mjs` | 首页内容区渲染与响应式样式：真实场景、对练复盘、3D、视频和结尾体验入口 |
| `design-tokens.mjs` | 构建时读取 `app/src/app/globals.css` 的浅 / 深色配置，SVG 与元信息按 OKLCH 转换为 sRGB |
| `build.mjs` | 零依赖构建：`node site/build.mjs` → `dist/`（首页中文在 `/`、英文在 `/en/`；情境页在 `/guides/{id}/` 与 `/en/guides/{id}/`），附 `sitemap.xml` / `robots.txt` / `llms.txt` / JSON-LD / hreflang。场景标题、简介及来源直接读 `app/src/data/corpus/scenarios-*.ts`，情境分类读 `taxonomy.ts`，支持多行双语与已知出处工厂；缺字段、场景数量与文案不一致或不存在对应语料时构建失败 |
| `scripts/og.mjs` | 用 `app/node_modules` 里的 sharp 生成 1200×630 社交预览图到 `assets/og-{zh,en}.png`，改文案后重跑一次并提交 |
| `assets/` | `icon.svg`（与 `app/public/icon.svg` 同源）、OG 图、产品截图 |
| `../.github/workflows/site.yml` | 官网、应用色板、场景语料、分类或论文 PDF 变更时运行构建与地图检查；`main` 推送在已启用 GitHub Pages 时发布 |

## 本地预览

```bash
node site/build.mjs
open site/dist/index.html          # 或 npx serve site/dist
```

## 部署

网站地图包含全部中英文页面及本地论文 PDF；缺少 `docs/social-coach-paper.pdf` 时构建会失败，避免发布失效的引用与地图记录。研究区的「补充材料 / Supplementary materials」入口指向现有补充材料站。命中上述变更路径的 PR 会运行构建与地图检查，通过后合并到 `main` 才部署；未启用 Pages 的 Fork 也会验证构建。PR 检查使用 `content.mjs` 的默认站点地址，不依赖 Pages 配置，也不会取消正在进行的发布。

用 GitHub Pages 的 **GitHub Actions** 来源，不需要 `gh-pages` 分支：仓库 Settings → Pages → Source 选 "GitHub Actions"，之后改动 `site/**`、`app/src/app/globals.css`、`app/src/data/corpus/**`、`app/src/data/taxonomy.ts` 或论文 PDF 并推送到 `main` 即发布。绑自有域名后 `configure-pages` 会把域名传给构建；工作流统一把它转成 HTTPS，使 canonical、hreflang、sitemap、OG 和 JSON-LD 使用同一地址。

本地构建默认以 `https://tianfuwang.tech/SocialCoach` 为站点地址，用 `SITE_URL=https://example.com node site/build.mjs` 覆盖。线上应用入口由 `content.mjs` 的 `site.appUrl` 配置。

同一份 `dist/` 也可以直接丢给 Vercel / Cloudflare Pages / 任何静态托管，资源使用相对路径；canonical 与跨页面链接由 `SITE_URL` 决定。

## 产品截图

2026-10-09 首页展示真实 3D 场景、当前桌面场景目录、原始复盘摘录、猫咪教练和两支视频封面。截图压缩为 WebP，明确保留局部截取和示例标注。来源与裁切记录见 [ASSETS.md](./ASSETS.md)。

`verify-seo.py` 在检查全部页面与论文地图之外，解析本地图片、链接、锚点和语言切换目标；缺失资源会阻止发布。视频入口指向应用的视频课堂，3D 入口使用已有 `scene` / `opening` 参数，不自动清除用户的当前练习。

重拍场景目录：`node site/scripts/screenshots.mjs --arena-only --lang=zh`（英文用 `--lang=en`），不调用模型。重拍今日推荐：`--home-only`，会调用一次排程模型。完整流程仍用 `node site/scripts/screenshots.mjs --lang=zh`（再跑一次英文）。脚本用 DevTools 协议驱动本机 Chrome，默认对 Vercel 正式应用种一个演示档案，输出到 `docs/screenshots/`（全页原图在 `raw/`，不入库）；官网图片再拷到 `site/assets/`。

`site.appUrl` 是按地域分流的分享入口，适合首页按钮；该 302 跳转不保留子路径和查询。场景目录及专题页的深链接因此使用 `site.appDeepUrl` 直达 Vercel，保证 `/arena?q=...` 能打开对应场景。

## 边界

- 仓库已有 Apache 2.0 `LICENSE`；对外可准确描述为开源。
- 不写用户数、留存、好评等没有口径的数字。
- SEL 使用 CASEL 的标准术语与五类能力；说明 SocialCoach 是个人练习工具，不声称是认证学校课程或具有已验证的学习成效。
- 论文与线上产品是两个版本：论文的 43,170 条研究语料不是产品内置规模；页面「研究」一节和 `llms.txt` 都明确了这条边界。
- 主句改动仍遵守四处同源（`README.md` / `layout.tsx` / `manifest.webmanifest`），这里的 `hero.h1` 是第四处，改主句时一起改。
