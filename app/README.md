# SocialCoach · 社交教练

把最难开口的那场对话，先在这里练一遍。
Rehearse the conversation you're dreading, before it happens.

An LLM-powered social-skill coach built on the SocialCoach paper
(Wang et al., *SocialCoach: Personalized Social Skill Learning with Agentic Tutoring and Practice*, arXiv 2606.04155).

## What it does

| Paper component | In the app |
|---|---|
| Theory → Case → Scenario corpus with CASEL tags | `src/data/corpus/` — 34 scenarios, 34 theories, 24 cases, bilingual, each with a traceable source |
| Prescription → retrieval → adaptation scheduling | `/api/schedule` — LLM prescription JSON, tag-filtered retrieval with fixed relaxation order, personalized briefing |
| Goal-driven immersive simulation | `/api/roleplay` — streamed multi-NPC dialogue with objective tracking, hidden motives, turn caps and endings |
| Behavior diagnosis + deficit attribution + knowledge-grounded Socratic tutoring | `/api/assess` — evidence-quoting report, acquisition vs. performance labels, retrieved theory/cases, reflection questions, bounded proficiency deltas |
| Learner profile, history, proficiency state | Local, on-device store (zero sign-up); export as JSON anytime |

Plus a product-first feature the paper doesn't have: **Rehearse** — describe a real upcoming conversation and get a custom, fully tagged scenario in ~15 seconds.

## Run it

```bash
cd app
cp .env.example .env.local   # add your Anthropic key
pnpm install
pnpm dev                     # http://localhost:3000
```

Production build: `pnpm build && pnpm start`. Deploys as-is to Vercel (Node runtime API routes, no database required).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Zustand (persisted) · Framer Motion · Anthropic SDK.

Mobile-first PWA (manifest + service worker). UI in Simplified Chinese and English; all model output follows the learner's language.

## Design

See `.impeccable.md` for the design brief ("warm paper · editorial"): OKLCH palette, Young Serif + Hanken Grotesk with CJK system fallbacks, one primary action per screen, evidence before judgment, every wait shows what the coach is doing.

## Safety

For low-stakes practice and reflection only — not clinical assessment or hiring decisions. Proficiency numbers are estimates and are labeled as such.
