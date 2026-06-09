# Throughline Studio

**Conduct social-science research, A → Z.** The shippable capstone of the research suite — one connected workspace where a research *project* advances through seven lifecycle stages, each unifying the tools you already use, with your topic carried across every hand-off.

> "Throughline" = the single line that runs the whole way through. A project starts at **A** (Discover) and ends at **Z** (Publish).

## The seven stages

| # | Stage | A–Z brief category | Unifies |
|---|-------|--------------------|---------|
| 1 | **Discover** | Literature review & discovery | PaperCards · Syed's Research Book · BookScope · ScholarScope |
| 2 | **Frame** | Question, theory & study design | ResearchFlow · TheoryScope · FallacyScope |
| 3 | **Measure** | Instruments & measurement scales | ScaleScope |
| 4 | **Collect** | Survey creation & data collection | Cadence |
| 5 | **Analyze** | Quantitative & qualitative analysis | ToolsScope |
| 6 | **Write** | Academic writing | JournalTime |
| 7 | **Publish** | Where to publish & open science | ScholarScope (Publish) · OSF |

Each stage deep-links into the real, deployed tool with the project's research question seeded as the topic (mirrors the suite hub's `buildDeepLink`).

## Stack

- **Vite + React 19 + TypeScript** — hand-rolled hash router (zero routing deps).
- **Hand-crafted CSS design system** (`src/styles/theme.css` tokens + `app.css`) in the Syed Fire / Throughline house style — no Tailwind, dark default + light, `prefers-reduced-motion` honoured.
- **`/api/generate`** — Vercel serverless AI seam. Dependency-free `fetch` to the Vercel AI Gateway; degrades gracefully (503 → offline mode) when `AI_GATEWAY_API_KEY` is unset. Enforces the suite's **no-fabrication** rule in its system prompt.
- **localStorage** persistence (`tls_projects`, `tls_active`) — no server; the project is owned by the browser.

## Develop

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # tsc -b && vite build  → dist/
npm run preview
```

For the AI endpoint locally, run under `vercel dev` with `AI_GATEWAY_API_KEY` set; otherwise the app runs fully (AI panels show their offline state).

## Layout

```
src/
  main.tsx              entry
  App.tsx               shell + routing
  lib/
    types.ts            Project / Stage domain types
    stages.ts           the 7-stage registry + deepLink()  ← edit to retune the spine
    store.ts            localStorage CRUD + progress
    router.ts           tiny hash router
    api.ts              client seam to /api/generate
    theme.ts            dark/light toggle
  components/           BrandBar · Spine · Icon
  views/                Hub (landing+dashboard) · ProjectView (workspace)
  stages/StageShell.tsx the per-stage workspace (tools + notes + status)
  styles/               theme.css (tokens) · app.css (components)
api/generate.js         shared AI backend (Vercel)
```

## Status

**Scaffold.** The spine, routing, persistence, theming, and the deep-linked tool hand-offs are functional. The per-stage workspaces (`StageShell`) are the seam where the embedded experiences land next — each stage panel is ready to grow into the real tool.
