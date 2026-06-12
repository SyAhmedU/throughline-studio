// ============================================================================
// Throughline Studio — the seven-stage spine.
// Each stage realizes one A-to-Z research category and *unifies* the existing
// suite apps. The first tool in each `tools[]` is the stage's primary surface.
// URLs + topic-handoff params mirror the suite hub (research-suite/index.html
// TOOL_INFO) so a project's topic deep-links straight into the real tool.
// ============================================================================

import type { StageId } from './types'

export interface ToolRef {
  name: string
  /** function-first verb phrase shown before the product name on link buttons —
   *  a bare product name means nothing to a first-time user (persona audit) */
  action?: string
  /** what this tool contributes at this stage */
  role: string
  url: string
  /** topic-handoff query param the tool reads on a bare URL (omit if none) */
  param?: string
  /** true for third-party tools (OSF) vs. Syed's own suite apps */
  external?: boolean
}

export interface StageDef {
  id: StageId
  n: number
  title: string
  verb: string
  /** the A-to-Z brief category this stage realizes */
  brief: string
  /** one line: what the researcher does here */
  blurb: string
  /** what this stage hands to the next (the "throughline" carry) */
  carries: string
  tools: ToolRef[]
}

export const STAGES: StageDef[] = [
  {
    id: 'discover',
    n: 1,
    title: 'Discover',
    verb: 'Read the field',
    brief: 'Literature review & discovery',
    blurb:
      'Search the literature, pull the foundational papers, and synthesize what is already known — so the study starts from the edge of the field, not the middle.',
    carries: 'a reading list + the gap',
    tools: [
      {
        name: 'PaperCards',
        action: 'Dissect a paper',
        role: 'Any paper as a glanceable card — constructs, effects, method. Trace the citation network to find what to read next.',
        url: 'https://papercards.vercel.app/',
        param: 'seed',
      },
      {
        name: "Syed's Research Book",
        action: 'Browse the corpus',
        role: 'Search 9,388 hand-coded papers across 167 OB/management constructs.',
        url: 'https://syahmedu.github.io/syeds-research-book/',
      },
      {
        name: 'BookScope',
        action: 'Search the books',
        role: 'Full-text search across 288 academic reference books (~141K pages).',
        url: 'https://bookscope.vercel.app/',
      },
      {
        name: 'ScholarScope',
        action: 'See who leads the field',
        role: 'See who leads the field — institutions, journals, authors (live OpenAlex).',
        url: 'https://syahmedu.github.io/scholarscope/',
      },
    ],
  },
  {
    id: 'frame',
    n: 2,
    title: 'Frame',
    verb: 'Shape the question',
    brief: 'Question, theory & study design',
    blurb:
      'Turn a raw idea into a sharp question, a stated gap, and a defensible design — grounded in a real theoretical lens and checked against the pitfalls that bend social-science research.',
    carries: 'a question, a lens & a design',
    tools: [
      {
        name: 'ResearchFlow',
        action: 'Run the guided wizard',
        role: 'Ten-stage wizard: idea → question → literature → theory → hypotheses → design.',
        url: 'https://researchflow-syahmedus-projects.vercel.app/',
        param: 'idea',
      },
      {
        name: 'TheoryScope',
        action: 'Pick a theory lens',
        role: 'Pick the lens your study looks through, from ~400 mapped theories.',
        url: 'https://theoryscope.vercel.app/',
        param: 'q',
      },
      {
        name: 'FallacyScope',
        action: 'Check the pitfalls',
        role: 'Check the 48 paradoxes, fallacies & biases that bend research — by lifecycle stage.',
        url: 'https://syahmedu.github.io/fallacyscope/',
      },
    ],
  },
  {
    id: 'measure',
    n: 3,
    title: 'Measure',
    verb: 'Operationalise',
    brief: 'Instruments & measurement scales',
    blurb:
      'Turn abstract constructs into real, validated items — with reliability, dimensions, and citations — and compose the survey instrument.',
    carries: 'your instruments',
    tools: [
      {
        name: 'ScaleScope',
        action: 'Find a validated scale',
        role: 'Validated measurement scales with Cronbach’s α, dimensions, and APA citations; survey composer + reliability calculator.',
        url: 'https://scalescope.vercel.app/',
        param: 'q',
      },
    ],
  },
  {
    id: 'collect',
    n: 4,
    title: 'Collect',
    verb: 'Field the survey',
    brief: 'Preregistration & data collection',
    blurb:
      'Lock the preregistration and clear the ethics checks before the first participant, then deploy the instrument and gather responses — informed-consent gate, branching, waves, and live analytics.',
    carries: 'a locked prereg + a clean dataset',
    tools: [
      {
        name: 'Cadence',
        action: 'Field the survey',
        role: 'Typeform-style, one-question-at-a-time survey deployment with consent, resume, waves, and scale-mean analytics.',
        url: 'https://syahmedu.github.io/cadence/',
        param: 'gen',
      },
      {
        name: 'OSF',
        action: 'File the prereg',
        role: 'File the locked preregistration (OSF Registries) before fielding — the timestamp is the point.',
        url: 'https://osf.io/',
        external: true,
      },
    ],
  },
  {
    id: 'analyze',
    n: 5,
    title: 'Analyze',
    verb: 'Find the signal',
    brief: 'Quantitative & qualitative analysis',
    blurb:
      'Run the statistics and code the themes — descriptives to mediation, reliability to factor analysis, plus qualitative coding — and let it draft the APA results.',
    carries: 'results + figures',
    tools: [
      {
        name: 'ToolsScope',
        action: 'Run the full stats engine',
        role: 'Real, dependency-free stats engine in the browser (t-tests → ANOVA → OLS → EFA/CFA → mediation); qualitative coding; writes APA write-ups and draws the figures.',
        url: 'https://toolsscope.vercel.app/',
        param: 'plan',
      },
    ],
  },
  {
    id: 'write',
    n: 6,
    title: 'Write',
    verb: 'Draft the paper',
    brief: 'Academic writing',
    blurb:
      'Develop the manuscript — find the gap, structure the argument, and write for your target journal with a guided studio.',
    carries: 'a manuscript',
    tools: [
      {
        name: 'JournalTime',
        action: 'Develop & format the manuscript (.docx)',
        role: 'Research Compass (AI gap finder), Article Developer (full draft), and Journal Studio (write for a specific journal).',
        url: 'https://syahmedu.github.io/journaltime/',
        param: 'topic',
      },
    ],
  },
  {
    id: 'publish',
    n: 7,
    title: 'Publish',
    verb: 'Place it & open it up',
    brief: 'Where to publish & open science',
    blurb:
      'Choose where to submit on real turnaround data, then share your data, materials, and analysis log in the open — the preregistration was locked back at Collect, before the data existed.',
    carries: 'a placed, open paper',
    tools: [
      {
        name: 'ScholarScope',
        action: 'Choose the journal',
        role: 'Publish desk: 1,959 journals’ turnaround data, Find-My-Journal wizard, and live OpenAlex journal metrics.',
        url: 'https://syahmedu.github.io/scholarscope/',
      },
      {
        name: 'OSF',
        action: 'Share data & materials',
        role: 'Open Science Framework — share data, materials, the analysis log, and the frozen preregistration.',
        url: 'https://osf.io/',
        external: true,
      },
    ],
  },
]

export const STAGE_IDS: StageId[] = STAGES.map((s) => s.id)

export function stageDef(id: StageId): StageDef {
  const found = STAGES.find((s) => s.id === id)
  if (!found) throw new Error(`Unknown stage: ${id}`)
  return found
}

/** Function-first link label: "Field the survey → Cadence", never a bare product name. */
export function toolLabel(t: ToolRef): string {
  return t.action ? `${t.action} → ${t.name}` : t.name
}

/** Build a topic deep-link into an external tool (mirrors the suite hub's buildDeepLink). */
export function deepLink(tool: ToolRef, topic?: string): string {
  const t = topic?.trim()
  if (tool.param && t) {
    const sep = tool.url.includes('?') ? '&' : '?'
    return `${tool.url}${sep}${tool.param}=${encodeURIComponent(t)}`
  }
  return tool.url
}
