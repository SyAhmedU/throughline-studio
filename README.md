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

Each stage has an embedded workspace, with optional handoffs to the specialist tools. The same study record carries sources, design decisions, instruments, collection plans, captured analysis and manuscript sections through the journey.

## Research Kitchen and manuscript delivery

The Kitchen uses a cooking narrative alongside the research terminology: open the pantry, decide the dish, select utensils, prepare ingredients, analyze, plate the manuscript and serve/respond. Twenty existing recipes cover quantitative, qualitative, mixed-methods, secondary-data and evidence-screening work. Recipe selection is guidance; it does not establish design validity.

Write includes a section outline, live draft word counts, assembled preview and named manuscript versions. Restoring a version first saves the current draft. The most recent 12 versions are retained with a 2 MB history cap.

Publish includes recorded-evidence checks, a structured reviewer-response tracker and a study ZIP containing the exact project backup, manuscript, planning scaffold, saved reading list, analysis record, review checklist and reviewer responses. A SHA-256 manifest supports integrity checks. Packages may contain private data and transcripts; sharing and external submission remain deliberate author actions. Import the included JSON as a separate study copy.

The visual system is a professional expedition interface: navy/teal/gold, connected milestones, next actions and dark/light themes. Progress reflects recorded artifacts and current author reviews; it is not a scientific-quality score.

## Stack

- **Vite + React 19 + TypeScript** — hand-rolled hash router (zero routing deps).
- **Hand-crafted CSS design system** (`theme.css`, `app.css`, `product.css`) — no Tailwind, dark/light themes and reduced-motion support.
- **`/api/generate`** — Vercel serverless AI SDK endpoint with a client fallback to the suite’s shared backend. AI responses are drafts requiring verification; generation is not source validation.
- **Local persistence** (`tls_projects`, `tls_active`) with save-recovery controls, JSON import/export and optional Supabase account synchronization when configured.

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

All seven stages have working embedded flows. See `NOTES.md` for actual capabilities, runtime/data limits, validation evidence and deployment status. Studio supports conducting and documenting research; it does not obtain ethics approvals, recruit participants, guarantee source coverage or submit to journals automatically. Existing specialist handoffs remain available, including journal formatting.

Checks: `npm run build`, `npm run test:flow`, `npm run test:delivery`, `npm run test:kitchen`, `node storage.verify.ts`. Browser checks: `python scripts/check-research-home.py` and `python scripts/check-product.py`; the latter supports `--live` with isolated browser-local simulated records.
