// ============================================================================
// Throughline Studio — worked examples (case studies).
//
// Ten REAL, published papers, each walked through the seven-stage Throughline
// spine to show how the workspace would carry a study from A to Z. Every paper
// fact is real and DOI-verified (Crossref): authors, year, journal, DOI, the
// construct, the theory, the instrument, the design, and the headline finding.
//
// The JOURNEY is an illustrative reconstruction — these papers predate the
// tool, so their authors did not use it. The stage-by-stage "what / why this
// tool / why not the alternatives" shows how a researcher producing the same
// paper today would move through the suite. Nothing about the papers is
// invented; the workflow narrative is clearly framed as a reconstruction in the
// UI. (No-fabrication rule: see CLAUDE.md.)
// ============================================================================

import type { StageId } from './types'

export interface JourneyStep {
  stage: StageId
  /** the suite surface used at this stage */
  tool: string
  /** timeline label, e.g. "Weeks 1–3" */
  when: string
  /** what the researcher does here */
  did: string
  /** why this stage / tool was the right call */
  why: string
  /** why NOT the alternative tool(s) — omitted when there's no real fork */
  insteadOf?: string
}

export interface CaseStudy {
  slug: string
  /** pacing tier — 'short' = quick-design study (weeks–months); undefined/'long'
   *  = a multi-month build (field study, scale development, longitudinal, etc.) */
  tier?: 'short' | 'long'
  // ── real, DOI-verified paper facts ──
  title: string
  authors: string
  year: number
  journal: string
  doi: string
  design: string
  construct: string
  theory: string
  instrument: string
  finding: string
  // ── the illustrative journey ──
  /** one line: what this particular journey demonstrates */
  angle: string
  totalTime: string
  steps: JourneyStep[]
}

export const CASE_STUDIES: CaseStudy[] = [
  // 1 ───────────────────────────────────────────────────────────────────────
  {
    slug: 'edmondson-1999',
    title: 'Psychological Safety and Learning Behavior in Work Teams',
    authors: 'Amy C. Edmondson',
    year: 1999,
    journal: 'Administrative Science Quarterly',
    doi: '10.2307/2666999',
    design: 'Mixed-methods field study · 51 teams in one manufacturing firm',
    construct: 'Team psychological safety → team learning behavior → team performance',
    theory: 'Organizational / team learning theory',
    instrument: 'Author-developed 7-item team psychological safety scale + observer-rated learning behavior + interviews',
    finding:
      'Team psychological safety predicts team learning behavior, which in turn predicts team performance; safety mediates the effect of supportive team-leader coaching and context.',
    angle: 'A new construct is born: when no validated scale exists, Measure becomes scale-building.',
    totalTime: '≈16 months',
    steps: [
      {
        stage: 'discover',
        tool: "Syed's Research Book + PaperCards",
        when: 'Weeks 1–4',
        did: 'Mapped the team-learning and error literatures and traced citations forward; saw that "learning" was theorized at the organization level but rarely observed inside intact work teams.',
        why: 'The hand-coded corpus + citation tracing surface the empirical edge of a construct, not just its famous reviews.',
        insteadOf:
          'BookScope would return textbook treatments of learning, but the gap lived in recent empirical papers — so the paper-level tools led, not the book index.',
      },
      {
        stage: 'frame',
        tool: 'TheoryScope + FallacyScope',
        when: 'Weeks 5–8',
        did: 'Committed to team-learning theory as the lens, framed psychological safety as the enabling shared belief, and flagged the levels trap (a team property measured with individual responses).',
        why: 'TheoryScope locks in a defensible lens; FallacyScope’s measurement/levels pitfalls force an aggregation plan up front.',
        insteadOf:
          'ResearchFlow’s full 10-stage wizard was more than needed once the question was already sharp — the targeted need was a lens plus a pitfalls check.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope (as the gap check)',
        when: 'Weeks 9–14',
        did: 'Searched the validated-scale catalogue, confirmed no team-level psychological-safety measure existed, then authored a 7-item scale with an explicit "this team" referent.',
        why: 'Proving the absence of a validated measure before building is what justifies a new instrument — the scale itself is the contribution.',
        insteadOf:
          'Adopting an off-the-shelf climate scale would have measured a different construct; here scale development was the point, not scale reuse.',
      },
      {
        stage: 'collect',
        tool: 'Cadence + observer ratings',
        when: 'Months 4–8',
        did: 'Fielded the team survey across 51 teams behind a consent gate, and gathered observer ratings and interviews as independent second sources.',
        why: 'A second, non-self-report source guards against same-source bias on the new scale; Cadence handles the consented team-by-team fielding.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope',
        when: 'Months 8–11',
        did: 'Tested within-team agreement before aggregating, ran reliability on the 7-item scale, then regressed learning behavior and performance on psychological safety.',
        why: 'Reliability + agreement + OLS are native to ToolsScope, and it forces the aggregation justification the levels trap demanded.',
        insteadOf: 'No need to export to SPSS — the aggregation and regression ran in the browser.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Months 11–14',
        did: 'Structured the manuscript around safety as the mediator between context and learning, for a theory-building audience.',
        why: 'The Article Developer keeps a new-construct argument tight: definition → measure → nomological evidence.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope',
        when: 'Months 14–16',
        did: 'Targeted Administrative Science Quarterly — a theory-forward outlet that fits an inductive, construct-introducing paper.',
        why: 'ScholarScope’s fit + turnaround data point a new-theory paper at a theory-receptive journal.',
        insteadOf: 'OSF preregistration is a weak fit for an inductive, mixed-methods build, so the open-science step was lighter here.',
      },
    ],
  },

  // 2 ───────────────────────────────────────────────────────────────────────
  {
    slug: 'hackman-oldham-1976',
    title: 'Motivation Through the Design of Work: Test of a Theory',
    authors: 'J. Richard Hackman & Greg R. Oldham',
    year: 1976,
    journal: 'Organizational Behavior and Human Performance',
    doi: '10.1016/0030-5073(76)90016-7',
    design: 'Cross-sectional field test · 658 employees on 62 jobs across 7 organizations',
    construct: 'Five core job characteristics → critical psychological states → work outcomes (moderated by Growth Need Strength)',
    theory: 'Job Characteristics Model',
    instrument: 'Job Diagnostic Survey (JDS); Motivating Potential Score (MPS)',
    finding:
      'Skill variety, task identity, task significance, autonomy, and feedback relate to motivation and satisfaction through three psychological states; the links are stronger for employees high in growth-need strength.',
    angle: 'Testing a full a-priori model — Frame carries a moderated mediation design, not just a question.',
    totalTime: '≈18 months',
    steps: [
      {
        stage: 'discover',
        tool: "Syed's Research Book + BookScope",
        when: 'Weeks 1–5',
        did: 'Synthesized the job-enrichment and motivation literatures, pulling both the empirical critiques and the foundational books on work design.',
        why: 'A model-testing paper needs the theoretical canon (books) plus the empirical state of play (papers) — both Discover surfaces earn their place here.',
        insteadOf: 'ScholarScope (who-leads/where-to-publish) is premature at the read-the-field stage; it returns later, at Publish.',
      },
      {
        stage: 'frame',
        tool: 'ResearchFlow',
        when: 'Weeks 6–11',
        did: 'Used the full wizard to specify the model: five characteristics → three psychological states → outcomes, with Growth Need Strength as the moderator, and stated each hypothesis.',
        why: 'A multi-path moderated-mediation model is exactly what ResearchFlow’s 10-stage scaffold is for — it keeps idea→hypotheses→design coherent.',
        insteadOf: 'TheoryScope alone would name the lens but not lay out the hypothesis web; the wizard was the right level of structure.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope (build the JDS)',
        when: 'Months 3–6',
        did: 'Operationalized each job dimension and psychological state as multi-item subscales, assembling the Job Diagnostic Survey and the Motivating Potential Score formula.',
        why: 'The model demanded one coherent instrument; the survey composer keeps subscales, anchors, and scoring in one place.',
      },
      {
        stage: 'collect',
        tool: 'Cadence',
        when: 'Months 6–10',
        did: 'Administered the JDS to 658 employees across 62 jobs and 7 organizations, with job role captured as a grouping variable.',
        why: 'Job-level variation needs many jobs and organizations; Cadence’s waves + participant codes keep the multi-site fielding organized.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope',
        when: 'Months 10–13',
        did: 'Ran subscale reliabilities, correlations among characteristics, states, and outcomes, then split-sample regressions to test the growth-need moderation.',
        why: 'Reliability → correlation → moderated regression is a single ToolsScope pass, with effect benchmarks for interpretation.',
        insteadOf: 'No external stats package needed; the moderation test was native.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Months 13–16',
        did: 'Wrote the model as a falsifiable theory: each path stated, supported, or qualified by the data.',
        why: 'The Article Developer keeps a theory-test paper disciplined — claims tied to specific tested paths.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope',
        when: 'Months 16–18',
        did: 'Placed the paper in a rigorous empirical OB outlet matched on scope and method.',
        why: 'A model-test belongs where reviewers expect strong measurement and design — ScholarScope’s field lens finds that fit.',
      },
    ],
  },

  // 3 ───────────────────────────────────────────────────────────────────────
  {
    slug: 'allen-meyer-1990',
    title: 'The Measurement and Antecedents of Affective, Continuance and Normative Commitment to the Organization',
    authors: 'Natalie J. Allen & John P. Meyer',
    year: 1990,
    journal: 'Journal of Occupational Psychology',
    doi: '10.1111/j.2044-8325.1990.tb00506.x',
    design: 'Scale development + validation · multiple employee samples',
    construct: 'Three components of organizational commitment: affective, continuance, normative',
    theory: 'Three-component model of organizational commitment',
    instrument: 'Author-developed Affective (ACS), Continuance (CCS), and Normative (NCS) Commitment Scales',
    finding:
      'Commitment is empirically separable into three components with distinct antecedents; the three scales are internally reliable and largely independent.',
    angle: 'A pure measurement paper — the deliverable is the instrument itself, so Measure is the spine.',
    totalTime: '≈20 months',
    steps: [
      {
        stage: 'discover',
        tool: "Syed's Research Book",
        when: 'Weeks 1–4',
        did: 'Catalogued how "commitment" had been measured and showed the existing measures conflated an emotional bond with a cost-based stay decision.',
        why: 'Construct search across the hand-coded corpus exposes definitional drift — the wedge for a multi-component model.',
      },
      {
        stage: 'frame',
        tool: 'TheoryScope + FallacyScope',
        when: 'Weeks 5–8',
        did: 'Framed commitment as three distinguishable mindsets and flagged the construct-validity / common-method pitfalls a same-survey scale set must beat.',
        why: 'The contribution is conceptual separation, so the lens and the measurement pitfalls — not a hypothesis web — were the work.',
        insteadOf: 'ResearchFlow’s design wizard was unnecessary; there was no treatment or sampling design to plan, only a construct to split.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope (author the three scales)',
        when: 'Months 2–7',
        did: 'Confirmed no three-component instrument existed, generated item pools for each component, and drafted the ACS/CCS/NCS with parallel response anchors.',
        why: 'This stage is the paper: ScaleScope verifies the gap, then the survey composer holds the three subscales as one instrument.',
        insteadOf: 'Reusing a single global commitment scale would defeat the entire premise — the goal was to prove three factors, not one.',
      },
      {
        stage: 'collect',
        tool: 'Cadence',
        when: 'Months 7–11',
        did: 'Fielded the item pools to employee samples with consent, capturing antecedents (e.g., role clarity, investments) alongside the items.',
        why: 'Validation needs antecedents in the same dataset to show the components diverge; Cadence fields items + covariates together.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope (EFA → reliability)',
        when: 'Months 11–15',
        did: 'Ran exploratory factor analysis to recover the three factors, computed Cronbach’s α per scale, and checked inter-scale correlations and distinct antecedent patterns.',
        why: 'EFA + reliability + correlations are exactly ToolsScope’s factor and reliability modules — the core evidence for a scale paper.',
        insteadOf: 'A confirmatory model could wait for a later replication; EFA was the honest first-pass for newly written items.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Months 15–18',
        did: 'Reported item development, factor structure, reliabilities, and antecedents as a measurement contribution.',
        why: 'The Article Developer organizes a scale paper into the expected dev → structure → validity arc.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope',
        when: 'Months 18–20',
        did: 'Targeted an occupational-psychology outlet that publishes instrument development.',
        why: 'A measurement paper belongs in a journal that values psychometrics; ScholarScope’s journal data finds that audience.',
      },
    ],
  },

  // 4 ───────────────────────────────────────────────────────────────────────
  {
    slug: 'colquitt-2001',
    title: 'On the Dimensionality of Organizational Justice: A Construct Validation of a Measure',
    authors: 'Jason A. Colquitt',
    year: 2001,
    journal: 'Journal of Applied Psychology',
    doi: '10.1037/0021-9010.86.3.386',
    design: 'Construct validation · two samples (university + field), confirmatory factor analysis',
    construct: 'Four dimensions of organizational justice: distributive, procedural, interpersonal, informational',
    theory: 'Organizational justice theory',
    instrument: 'Author-developed multidimensional justice measure',
    finding:
      'A four-factor structure fits organizational justice better than two- or three-factor alternatives; the dimensions predict distinct outcomes, supporting their separation.',
    angle: 'CFA-first: competing factor models are pitted head-to-head — Analyze decides the construct.',
    totalTime: '≈17 months',
    steps: [
      {
        stage: 'discover',
        tool: "Syed's Research Book + PaperCards",
        when: 'Weeks 1–4',
        did: 'Traced the justice literature and found dimensions defined inconsistently — sometimes two, sometimes three — with no head-to-head test.',
        why: 'Citation tracing exposes an unresolved structural debate, which is precisely a CFA-shaped gap.',
      },
      {
        stage: 'frame',
        tool: 'ResearchFlow + FallacyScope',
        when: 'Weeks 5–9',
        did: 'Framed the question as "how many factors?", specified competing measurement models, and flagged the jingle-jangle fallacy (same label, different constructs).',
        why: 'Setting up rival models in advance is what makes a confirmatory test fair; FallacyScope keeps the labels honest.',
        insteadOf: 'TheoryScope names the justice lens, but the work here was design and competing-model specification — ResearchFlow’s job.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope',
        when: 'Months 2–6',
        did: 'Assembled items for all four dimensions into one instrument with consistent anchors so the factor test would be clean.',
        why: 'A construct-validation paper needs the candidate items in one survey; the composer enforces parallel formatting.',
      },
      {
        stage: 'collect',
        tool: 'Cadence (two samples)',
        when: 'Months 6–10',
        did: 'Fielded the measure to a university sample and an independent field sample, with the outcome variables needed to test discriminant prediction.',
        why: 'Two samples test whether the factor structure replicates; Cadence’s study-per-link setup keeps them separate but identical.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope (CFA)',
        when: 'Months 10–14',
        did: 'Ran confirmatory factor analysis comparing one-, two-, three-, and four-factor models on fit indices, then tested each dimension’s distinct outcome relationships.',
        why: 'ToolsScope’s CFA (χ²/CFI/TLI/RMSEA/SRMR) lets competing models be compared directly — the decisive evidence.',
        insteadOf: 'This is the one paper that historically needed dedicated SEM software; ToolsScope’s in-browser CFA removes that detour.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Months 14–16',
        did: 'Reported the model comparison and the discriminant-prediction evidence as a single validation story.',
        why: 'The Article Developer keeps fit statistics and validity evidence in their expected order.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope + OSF',
        when: 'Months 16–17',
        did: 'Targeted a top applied-psychology outlet and, in a modern run, posted the measure and CFA syntax openly.',
        why: 'A widely-reused measure benefits from open materials; ScholarScope picks the outlet, OSF hosts the instrument.',
      },
    ],
  },

  // 5 ───────────────────────────────────────────────────────────────────────
  {
    slug: 'luthans-2007',
    title: 'Positive Psychological Capital: Measurement and Relationship with Performance and Satisfaction',
    authors: 'Fred Luthans, Bruce J. Avolio, James B. Avey & Steven M. Norman',
    year: 2007,
    journal: 'Personnel Psychology',
    doi: '10.1111/j.1744-6570.2007.00083.x',
    design: 'Measurement + criterion validation · multiple samples, higher-order CFA',
    construct: 'Psychological Capital (PsyCap): hope, efficacy, resilience, optimism — as one higher-order resource',
    theory: 'Positive Organizational Behavior',
    instrument: 'Psychological Capital Questionnaire (PCQ-24), adapted from validated facet measures',
    finding:
      'The four positive resources load on a single higher-order PsyCap factor that relates to performance and satisfaction more strongly than any one component alone.',
    angle: 'A higher-order construct: the claim is that the whole beats its parts — a hierarchical CFA call.',
    totalTime: '≈15 months',
    steps: [
      {
        stage: 'discover',
        tool: "Syed's Research Book",
        when: 'Weeks 1–4',
        did: 'Reviewed hope, efficacy, resilience, and optimism as separate streams and noted they were rarely modeled as one organizing resource.',
        why: 'Construct co-occurrence in the corpus reveals four literatures that had never been combined — the synthesis gap.',
      },
      {
        stage: 'frame',
        tool: 'TheoryScope',
        when: 'Weeks 5–8',
        did: 'Adopted Positive Organizational Behavior as the lens and argued the four resources share a common core ("state-like" and developable).',
        why: 'TheoryScope supplies the higher-order framing that licenses combining the four facets.',
        insteadOf: 'FallacyScope was a quick sanity check, not the main act — the risk here was conceptual overlap, addressed by the higher-order model.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope',
        when: 'Months 2–5',
        did: 'Selected validated facet items for each of the four resources and adapted them to the work context to build the 24-item PCQ.',
        why: 'Reusing each facet’s validated items (not reinventing them) is exactly ScaleScope’s catalogue use; the contribution is the combination.',
        insteadOf: 'Writing all-new items would have discarded decades of facet validation; here adaptation, not invention, was correct.',
      },
      {
        stage: 'collect',
        tool: 'Cadence',
        when: 'Months 5–9',
        did: 'Fielded the PCQ with supervisor-rated performance and self-rated satisfaction as criteria, across more than one sample.',
        why: 'A higher-order claim needs criteria and replication; Cadence collects the PCQ plus the outcome ratings together.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope (hierarchical CFA)',
        when: 'Months 9–12',
        did: 'Tested whether the four facets load on one second-order factor, compared it to a four-correlated-factors model, and related the composite to the criteria.',
        why: 'ToolsScope’s CFA + composite reliability (ω) evaluate the higher-order structure and its criterion links in one place.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Months 12–14',
        did: 'Argued the integrative case: PsyCap predicts outcomes beyond its components.',
        why: 'The Article Developer foregrounds incremental validity — the heart of a higher-order paper.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope',
        when: 'Months 14–15',
        did: 'Placed it in a leading personnel-psychology journal that publishes measurement-plus-validity work.',
        why: 'ScholarScope matches a measure-and-criterion paper to a psychometrically rigorous outlet.',
      },
    ],
  },

  // 6 ───────────────────────────────────────────────────────────────────────
  {
    slug: 'rich-2010',
    title: 'Job Engagement: Antecedents and Effects on Job Performance',
    authors: 'Bruce Louis Rich, Jeffrey A. LePine & Eean R. Crawford',
    year: 2010,
    journal: 'Academy of Management Journal',
    doi: '10.5465/amj.2010.51468988',
    design: 'Multi-source field study · 245 firefighters + supervisors, structural equation modeling',
    construct: 'Job engagement (physical, emotional, cognitive) mediating antecedents → job performance',
    theory: 'Kahn’s theory of personal engagement',
    instrument: 'Job Engagement Scale (JES, 18 items) + supervisor-rated task performance and OCB',
    finding:
      'Job engagement mediates the effects of value congruence, perceived organizational support, and core self-evaluations on task performance and citizenship behavior — outperforming narrower attitudes as a mediator.',
    angle: 'A multi-source mediation model tested with SEM — Collect must yoke two raters per case.',
    totalTime: '≈19 months',
    steps: [
      {
        stage: 'discover',
        tool: "Syed's Research Book + PaperCards",
        when: 'Weeks 1–5',
        did: 'Mapped engagement against satisfaction, involvement, and intrinsic motivation, and found engagement under-tested as a mediator with objective-ish criteria.',
        why: 'Side-by-side construct cards expose where engagement adds explanatory value over its neighbors — the mediation gap.',
      },
      {
        stage: 'frame',
        tool: 'ResearchFlow + TheoryScope',
        when: 'Weeks 6–11',
        did: 'Set Kahn’s engagement as the lens and specified a mediation model: three antecedents → engagement → performance + OCB.',
        why: 'A multi-antecedent mediation path needs both a lens (TheoryScope) and a hypothesis/design scaffold (ResearchFlow).',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope',
        when: 'Months 3–6',
        did: 'Composed the instrument from a validated engagement scale plus established antecedent measures, and defined supervisor-rated performance items.',
        why: 'Reusing validated antecedent and engagement scales keeps the test about the model, not about new measurement.',
      },
      {
        stage: 'collect',
        tool: 'Cadence (two linked sources)',
        when: 'Months 6–11',
        did: 'Collected self-reports from 245 employees and matched supervisor ratings of each employee’s performance via participant codes.',
        why: 'Predicting performance from self-reported engagement demands a different rater for the outcome; Cadence’s participant codes link the two surveys.',
        insteadOf: 'A single self-report survey would have inflated the mediation through common-method bias — the multi-source design exists to avoid exactly that.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope (SEM / mediation)',
        when: 'Months 11–16',
        did: 'Estimated the measurement model, then tested the structural paths and the indirect effects of antecedents through engagement.',
        why: 'ToolsScope’s mediation (bootstrapped indirect effects) and CFA cover the measurement-then-structure sequence an SEM paper needs.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Months 16–18',
        did: 'Told the mediation story: engagement as the conduit from context and disposition to behavior.',
        why: 'The Article Developer keeps an indirect-effects argument legible — each path stated and supported.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope',
        when: 'Months 18–19',
        did: 'Targeted a flagship management journal that rewards strong multi-source designs.',
        why: 'ScholarScope’s leaders view points a methodologically strong study at a top-tier outlet.',
      },
    ],
  },

  // 7 ───────────────────────────────────────────────────────────────────────
  {
    slug: 'tepper-2000',
    title: 'Consequences of Abusive Supervision',
    authors: 'Bennett J. Tepper',
    year: 2000,
    journal: 'Academy of Management Journal',
    doi: '10.2307/1556375',
    design: 'Two-wave longitudinal survey · employed adults, moderated structural model',
    construct: 'Abusive supervision → attitudes, strain, and conflict (moderated by job mobility)',
    theory: 'Organizational justice / perceived powerlessness',
    instrument: 'Author-developed 15-item abusive supervision scale + validated outcome measures',
    finding:
      'Perceived abusive supervision predicts lower job and life satisfaction and organizational commitment, and higher conflict and psychological distress; effects are stronger for subordinates with less job mobility.',
    angle: 'Time-lagged design: the moderator (mobility) and two waves are decided at Frame, not bolted on.',
    totalTime: '≈22 months',
    steps: [
      {
        stage: 'discover',
        tool: "Syed's Research Book",
        when: 'Weeks 1–4',
        did: 'Found leadership research dominated by positive styles, with the destructive side largely unmeasured — a clear under-studied construct.',
        why: 'The corpus makes the asymmetry obvious: many transformational-leadership entries, almost no abuse measure.',
      },
      {
        stage: 'frame',
        tool: 'ResearchFlow + FallacyScope',
        when: 'Weeks 5–10',
        did: 'Framed abuse through justice/powerlessness, planned a two-wave lag to order cause and effect, and added job mobility as a moderator; flagged reverse-causality and common-method traps.',
        why: 'The temporal design and the moderator are the paper’s rigor — ResearchFlow plans the waves, FallacyScope names the threats they defuse.',
        insteadOf: 'A cross-sectional design (the easy path) was rejected here on purpose; the wizard locked in the lag instead.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope',
        when: 'Months 3–7',
        did: 'Confirmed no abusive-supervision scale existed, authored a 15-item measure, and paired it with validated satisfaction, commitment, conflict, and distress scales.',
        why: 'A new toxic-behavior measure needs care; ScaleScope verifies the gap and standardizes the borrowed outcome scales around it.',
      },
      {
        stage: 'collect',
        tool: 'Cadence (two waves)',
        when: 'Months 7–14',
        did: 'Ran a Time-1 survey, then re-surveyed the same participants at Time-2 via persistent participant codes, with consent at both waves.',
        why: 'Cadence’s wave + participant-code design is built for exactly this paired-over-time collection.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope',
        when: 'Months 14–19',
        did: 'Validated the new scale, modeled Time-2 outcomes on Time-1 abuse, and tested the mobility moderation.',
        why: 'Reliability → lagged structural paths → moderation all run in ToolsScope, with the lag strengthening causal claims.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Months 19–21',
        did: 'Built the harm narrative across outcomes and emphasized why the time lag licenses stronger inference.',
        why: 'The Article Developer keeps a multi-outcome, time-lagged story disciplined.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope',
        when: 'Months 21–22',
        did: 'Targeted a top management journal where a rigorous longitudinal design lands well.',
        why: 'ScholarScope matches the design’s strength to a high-bar outlet.',
      },
    ],
  },

  // 8 ───────────────────────────────────────────────────────────────────────
  {
    slug: 'grant-2008',
    title: 'The Significance of Task Significance: Job Performance Effects, Relational Mechanisms, and Boundary Conditions',
    authors: 'Adam M. Grant',
    year: 2008,
    journal: 'Journal of Applied Psychology',
    doi: '10.1037/0021-9010.93.1.108',
    design: 'Field experiments + field quasi-experiment · fundraising callers, objective performance',
    construct: 'Task significance → persistence and job performance (relational mechanism)',
    theory: 'Relational job design / prosocial motivation',
    instrument: 'Task-significance perception items + objective output (calls, pledges, revenue)',
    finding:
      'A brief intervention connecting callers to a beneficiary (a scholarship recipient) raised perceived task significance and substantially increased persistence and money raised versus control conditions.',
    angle: 'Causal by design: an experiment with an objective DV — Collect runs a manipulation, not just a survey.',
    totalTime: '≈14 months',
    steps: [
      {
        stage: 'discover',
        tool: "Syed's Research Book + PaperCards",
        when: 'Weeks 1–4',
        did: 'Reviewed work-design research as overwhelmingly correlational and self-report, and identified task significance as a cause worth testing experimentally.',
        why: 'The corpus makes the design gap visible — strong theory, weak causal evidence.',
      },
      {
        stage: 'frame',
        tool: 'ResearchFlow + FallacyScope',
        when: 'Weeks 5–8',
        did: 'Designed a field experiment with random assignment to a beneficiary-contact condition, an objective performance DV, and task significance as the mediator; flagged demand effects and self-report bias.',
        why: 'The whole value proposition is causal inference, so the design — random assignment + objective DV — is the Frame deliverable.',
        insteadOf: 'A self-report survey study (the common default) was deliberately rejected; ResearchFlow locked in the experiment instead.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope',
        when: 'Weeks 8–11',
        did: 'Used validated task-significance perception items as the manipulation check and defined the objective output metrics as the primary DV.',
        why: 'With an objective DV, the scale’s role shrinks to a clean manipulation check — ScaleScope supplies the validated items.',
        insteadOf: 'No elaborate multi-scale survey was needed; behavior, not perception, was the outcome.',
      },
      {
        stage: 'collect',
        tool: 'Field manipulation + Cadence (checks)',
        when: 'Months 3–7',
        did: 'Ran the beneficiary-contact intervention in the call center, logged objective performance from records, and used a short consented survey for the manipulation check.',
        why: 'The "collection" is the experiment plus archival performance data; Cadence handles only the brief perception check.',
        insteadOf: 'Cadence is not the centerpiece here — the data are behavioral and archival, which is exactly the point of an experiment.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope',
        when: 'Months 7–10',
        did: 'Compared conditions on persistence and revenue (t-tests / ANOVA with effect sizes), confirmed the manipulation, and tested task significance as the mediator.',
        why: 'Between-condition comparison + mediation is a single ToolsScope pass; random assignment makes the causal reading defensible.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Months 10–13',
        did: 'Led with the causal claim and the relational mechanism, with boundary conditions.',
        why: 'The Article Developer foregrounds the experiment’s internal validity — the paper’s edge.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope + OSF',
        when: 'Months 13–14',
        did: 'Targeted a top applied-psychology journal and, in a modern run, preregistered the experiment and posted materials on OSF.',
        why: 'Experiments gain the most from preregistration; OSF is the right open-science home, ScholarScope the outlet finder.',
      },
    ],
  },

  // 9 ───────────────────────────────────────────────────────────────────────
  {
    slug: 'judge-bono-2001',
    title: 'Relationship of Core Self-Evaluations Traits with Job Satisfaction and Job Performance: A Meta-Analysis',
    authors: 'Timothy A. Judge & Joyce E. Bono',
    year: 2001,
    journal: 'Journal of Applied Psychology',
    doi: '10.1037/0021-9010.86.1.80',
    design: 'Meta-analysis · self-esteem, generalized self-efficacy, locus of control, emotional stability',
    construct: 'Core self-evaluations → job satisfaction and job performance',
    theory: 'Core self-evaluations framework',
    instrument: 'No new instrument — coded effect sizes from primary studies using established trait measures',
    finding:
      'The four traits each relate to job satisfaction and performance and cohere as one higher-order trait; corrected correlations with job satisfaction (≈ .41 overall) exceed those with performance (≈ .23 overall).',
    angle: 'No primary data: Collect becomes literature coding and Cadence is correctly skipped.',
    totalTime: '≈12 months',
    steps: [
      {
        stage: 'discover',
        tool: "PaperCards + Syed's Research Book",
        when: 'Weeks 1–6',
        did: 'Used citation tracing and construct search to assemble the full primary-study set for all four traits and their correlations with satisfaction and performance.',
        why: 'A meta-analysis lives or dies on exhaustive retrieval; PaperCards’ citation network + the corpus drive systematic coverage.',
        insteadOf: 'BookScope is irrelevant here — the inputs are primary empirical studies, not books.',
      },
      {
        stage: 'frame',
        tool: 'ResearchFlow + FallacyScope',
        when: 'Weeks 6–9',
        did: 'Framed the four traits as indicators of one disposition, set inclusion/exclusion and coding rules, and flagged publication bias and the jingle-jangle problem across trait labels.',
        why: 'A meta-analysis’ rigor is its protocol; ResearchFlow fixes the rules, FallacyScope names the biases to test for.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope (as a coding reference)',
        when: 'Weeks 9–12',
        did: 'Used the scale catalogue to confirm which validated trait measures each primary study used and recorded their reliabilities for artifact correction.',
        why: 'Correcting for measurement unreliability needs each source measure’s α — ScaleScope is the reference, not a survey builder here.',
      },
      {
        stage: 'collect',
        tool: 'Coding protocol (no survey)',
        when: 'Months 3–6',
        did: 'Coded effect sizes, sample sizes, and reliabilities from each primary study into the meta-analytic database.',
        why: 'There are no participants to survey — the "data" are prior studies’ statistics.',
        insteadOf: 'Cadence is deliberately skipped: a meta-analysis collects no primary responses, so the survey tool simply does not apply.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope (meta-analysis)',
        when: 'Months 6–9',
        did: 'Computed sample-weighted mean correlations, corrected for unreliability, and examined heterogeneity for each trait–outcome pair.',
        why: 'ToolsScope’s meta-analysis module does the weighting, artifact correction, and heterogeneity tests directly.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Months 9–11',
        did: 'Reported the corrected correlations and argued the four traits form a single core self-evaluation.',
        why: 'The Article Developer keeps a cumulative-evidence paper organized around the corrected estimates.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope + OSF',
        when: 'Months 11–12',
        did: 'Placed it in a top applied-psychology outlet and, in a modern run, posted the coding sheet openly for reproducibility.',
        why: 'Open coding data is the meta-analytic standard; OSF hosts it, ScholarScope picks the journal.',
      },
    ],
  },

  // 10 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'eisenberger-1986',
    title: 'Perceived Organizational Support',
    authors: 'Robert Eisenberger, Robin Huntington, Steven Hutchison & Debora Sowa',
    year: 1986,
    journal: 'Journal of Applied Psychology',
    doi: '10.1037/0021-9010.71.3.500',
    design: 'Scale development + criterion study · employee samples, exploratory factor analysis',
    construct: 'Perceived organizational support (POS) → attendance / commitment',
    theory: 'Organizational support theory (social exchange)',
    instrument: 'Survey of Perceived Organizational Support (SPOS, 36 items)',
    finding:
      'Employees form a global belief about how much the organization values their contributions and cares about their well-being; this single-factor POS relates to attendance and expectations of reward.',
    angle: 'Introducing a now-foundational construct from social-exchange theory — Frame leads with the lens.',
    totalTime: '≈18 months',
    steps: [
      {
        stage: 'discover',
        tool: "Syed's Research Book + BookScope",
        when: 'Weeks 1–5',
        did: 'Reviewed commitment and exchange research and noticed the employee→organization side was well-studied while the organization→employee side had no measure.',
        why: 'Reading both the empirical corpus and the social-exchange source texts reveals a one-sided literature — the opening.',
      },
      {
        stage: 'frame',
        tool: 'TheoryScope',
        when: 'Weeks 6–9',
        did: 'Adopted social-exchange theory as the lens and proposed POS as the employee’s belief about the organization’s reciprocity.',
        why: 'The construct only makes sense inside an exchange framing — TheoryScope supplies and justifies that lens.',
        insteadOf: 'ResearchFlow’s design wizard was light-touch here; the novelty was conceptual definition, not a complex design.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope (author the SPOS)',
        when: 'Months 2–7',
        did: 'Confirmed no support measure existed, generated 36 items capturing valuing-of-contribution and care-for-well-being, and set the response anchors.',
        why: 'The instrument is the deliverable; ScaleScope verifies the gap and holds the item set.',
      },
      {
        stage: 'collect',
        tool: 'Cadence',
        when: 'Months 7–11',
        did: 'Fielded the SPOS to employee samples with consent, capturing attendance and attitudinal criteria alongside.',
        why: 'Validating a new global belief needs criteria in the same dataset; Cadence fields items + outcomes together.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope (EFA → reliability)',
        when: 'Months 11–15',
        did: 'Ran exploratory factor analysis (recovering a strong single factor), computed reliability, and related POS to the attendance and attitude criteria.',
        why: 'EFA + reliability + criterion correlations are ToolsScope’s factor and reliability modules — the evidence a first POS paper needs.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Months 15–17',
        did: 'Introduced POS, its single-factor structure, and its early criterion links as a new construct.',
        why: 'The Article Developer frames a construct-introduction paper: definition → measure → first evidence.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope',
        when: 'Months 17–18',
        did: 'Targeted a top applied-psychology journal where a new, broadly useful construct would travel.',
        why: 'ScholarScope points a high-reuse construct at a high-visibility outlet.',
      },
    ],
  },

  // ══ SHORT-TURNAROUND STUDIES (tier: 'short') ═══════════════════════════════
  // Quick-design studies — single experiments, secondary data, contained field
  // trials. Same A→Z spine, compressed to weeks/months. All real + DOI-verified.

  // 11 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'tversky-kahneman-1981',
    tier: 'short',
    title: 'The Framing of Decisions and the Psychology of Choice',
    authors: 'Amos Tversky & Daniel Kahneman',
    year: 1981,
    journal: 'Science',
    doi: '10.1126/science.7455683',
    design: 'Between-subjects scenario experiments · survey respondents',
    construct: 'Framing effects — preference reversal under logically equivalent descriptions',
    theory: 'Prospect theory',
    instrument: 'Hypothetical risky-choice problems (e.g., the "Asian disease" problem)',
    finding:
      'Describing identical options as gains versus losses reverses risk preference — people are risk-averse for gains and risk-seeking for losses, violating descriptive invariance.',
    angle: 'A paper made of paper: a few well-designed scenarios, no collection apparatus.',
    totalTime: '≈6 weeks',
    steps: [
      {
        stage: 'discover',
        tool: 'PaperCards',
        when: 'Week 1',
        did: 'A focused citation trace through expected-utility violations to locate exactly where invariance had not been tested with simple framing.',
        why: 'A single sharp effect needs a pinpoint trace, not a broad survey.',
        insteadOf: "Syed's Research Book and BookScope are built for breadth; a one-effect question wanted PaperCards’ targeted tracing.",
      },
      {
        stage: 'frame',
        tool: 'ResearchFlow + FallacyScope',
        when: 'Week 1',
        did: 'Specified a between-subjects design pairing gain- and loss-framed versions of identical problems, and flagged the wording-confound trap.',
        why: 'The contribution is a clean manipulation of description holding outcomes constant — design is the whole game.',
        insteadOf: 'The lens (prospect theory) was already given, so TheoryScope took a back seat to airtight design.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope (minimal)',
        when: 'Week 2',
        did: 'Wrote the choice problems themselves as the stimulus; the dependent measure was a single forced choice.',
        why: 'A forced-choice outcome needs no scale catalogue — the items are the experiment.',
        insteadOf: 'The full survey composer would be overkill for one-question problems.',
      },
      {
        stage: 'collect',
        tool: 'Cadence',
        when: 'Weeks 2–3',
        did: 'Administered the problems to respondents, each seeing one frame, behind a consent gate.',
        why: 'One-question-at-a-time fits single-item scenario problems exactly.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope',
        when: 'Week 3',
        did: 'Compared choice proportions across frames with chi-square tests.',
        why: 'A categorical outcome across two conditions is a one-line chi-square.',
        insteadOf: 'No modelling software needed for simple proportions.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Weeks 4–5',
        did: 'Wrote a tight report: invariance, the violation, and the prospect-theory explanation.',
        why: 'A short, high-impact result calls for the Article Developer’s lean report mode.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope',
        when: 'Weeks 5–6',
        did: 'Targeted a short-format, high-visibility general-science outlet.',
        why: 'ScholarScope points a brief, broadly important finding at a fast, wide-reach journal.',
      },
    ],
  },

  // 12 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'frederick-2005',
    tier: 'short',
    title: 'Cognitive Reflection and Decision Making',
    authors: 'Shane Frederick',
    year: 2005,
    journal: 'Journal of Economic Perspectives',
    doi: '10.1257/089533005775196732',
    design: 'Brief individual-difference measure + correlational studies · many samples',
    construct: 'Cognitive reflection → time preference, risk preference, decision biases',
    theory: 'Dual-process (System 1 / System 2)',
    instrument: 'The 3-item Cognitive Reflection Test (CRT)',
    finding:
      'A three-question test of the tendency to override an intuitive wrong answer predicts time and risk preferences and performance on classic decision biases.',
    angle: 'Tiny instrument, big reach: three items, then correlate with everything.',
    totalTime: '≈3 months',
    steps: [
      {
        stage: 'discover',
        tool: 'PaperCards',
        when: 'Weeks 1–2',
        did: 'Traced dual-process and heuristics work to find that "reflectiveness" had no compact, predictive measure.',
        why: 'A targeted trace exposes the missing short measure fast.',
      },
      {
        stage: 'frame',
        tool: 'TheoryScope',
        when: 'Week 2',
        did: 'Framed reflection as the System-2 override of a tempting System-1 answer and planned to relate it to preferences.',
        why: 'TheoryScope supplies the dual-process lens the measure operationalizes.',
        insteadOf: 'No elaborate design wizard was needed — the plan was measure-then-correlate.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope (author the CRT)',
        when: 'Weeks 3–4',
        did: 'Built a 3-item test whose items each bait an intuitive but wrong response.',
        why: 'The measure is the contribution; ScaleScope confirms nothing equivalent existed and holds the items.',
        insteadOf: 'A long battery would defeat the point — the value is a 3-item predictor.',
      },
      {
        stage: 'collect',
        tool: 'Cadence + archival',
        when: 'Months 1–2',
        did: 'Administered the CRT alongside time/risk-preference questions across many samples, pooling some existing datasets.',
        why: 'Pooling brief samples is cheap; Cadence fields the CRT + preference items together.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope',
        when: 'Month 2',
        did: 'Correlated CRT scores with preferences and bias-task performance.',
        why: 'Correlations and group comparisons are a single ToolsScope pass.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Month 3',
        did: 'Introduced the measure and its predictive validity across decisions.',
        why: 'The Article Developer frames a new-measure-with-correlates paper cleanly.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope',
        when: 'Month 3',
        did: 'Placed it in an outlet read across economics and psychology.',
        why: 'ScholarScope matches a cross-disciplinary measure to a broad-readership journal.',
      },
    ],
  },

  // 13 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'mueller-oppenheimer-2014',
    tier: 'short',
    title: 'The Pen Is Mightier Than the Keyboard: Advantages of Longhand Over Laptop Note Taking',
    authors: 'Pam A. Mueller & Daniel M. Oppenheimer',
    year: 2014,
    journal: 'Psychological Science',
    doi: '10.1177/0956797614524581',
    design: 'Controlled lab experiments · students, comprehension tests',
    construct: 'Note-taking medium (longhand vs laptop) → conceptual learning',
    theory: 'Encoding / desirable difficulty',
    instrument: 'Factual vs conceptual comprehension tests + coded note transcripts',
    finding:
      'Laptop note-takers transcribe lectures more verbatim and learn less conceptually than longhand note-takers, who must reframe content as they write.',
    angle: 'A clean lab experiment: random assignment, an objective test, weeks of work.',
    totalTime: '≈3 months',
    steps: [
      {
        stage: 'discover',
        tool: 'PaperCards',
        when: 'Weeks 1–2',
        did: 'Traced the note-taking and encoding literature to find the medium comparison under-tested for conceptual (not just factual) learning.',
        why: 'A precise prior-work trace defines the gap quickly.',
      },
      {
        stage: 'frame',
        tool: 'ResearchFlow + FallacyScope',
        when: 'Week 2',
        did: 'Designed a randomized lab experiment with a conceptual-vs-factual test split, and flagged the "amount written" confound.',
        why: 'The result hinges on isolating processing from sheer quantity — careful design is the contribution.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope',
        when: 'Week 3',
        did: 'Defined the comprehension test items (factual + conceptual) and a transcript-overlap coding scheme.',
        why: 'A purpose-built test is the DV; ScaleScope holds the item set and anchors.',
        insteadOf: 'Borrowing a generic learning scale would miss the factual/conceptual contrast the design needs.',
      },
      {
        stage: 'collect',
        tool: 'Lab session + Cadence',
        when: 'Weeks 4–7',
        did: 'Students watched lectures, took notes by their assigned medium, then completed the test; notes captured for coding.',
        why: 'A short in-person session collects behavior + test; Cadence handles the post-test items.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope',
        when: 'Weeks 7–9',
        did: 'Compared conditions on conceptual vs factual scores (ANOVA) and related verbatim overlap to performance.',
        why: 'Condition × question-type effects and the mediation by verbatim overlap run natively.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Weeks 9–11',
        did: 'Wrote a short report centered on the processing mechanism.',
        why: 'A single-message experiment fits the lean report format.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope',
        when: 'Weeks 11–12',
        did: 'Targeted a short-format empirical psychology outlet.',
        why: 'ScholarScope points a crisp experiment at a fast journal.',
      },
    ],
  },

  // 14 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'dunn-2008',
    tier: 'short',
    title: 'Spending Money on Others Promotes Happiness',
    authors: 'Elizabeth W. Dunn, Lara B. Aknin & Michael I. Norton',
    year: 2008,
    journal: 'Science',
    doi: '10.1126/science.1150952',
    design: 'National survey + windfall study + small field experiment',
    construct: 'Prosocial spending → subjective happiness',
    theory: 'Prosocial behavior and well-being',
    instrument: 'Brief happiness measures + spending allocation (self vs others)',
    finding:
      'How people spend matters more than how much: directing money toward others predicts and causally raises happiness relative to spending on oneself.',
    angle: 'Three small studies, one message — converging methods, fast.',
    totalTime: '≈4 months',
    steps: [
      {
        stage: 'discover',
        tool: "PaperCards + Syed's Research Book",
        when: 'Weeks 1–3',
        did: 'Reviewed income–happiness work and noticed spending allocation (not amount) was largely untested.',
        why: 'A quick scan reframes a crowded question around a neglected variable.',
      },
      {
        stage: 'frame',
        tool: 'ResearchFlow + FallacyScope',
        when: 'Weeks 3–4',
        did: 'Planned a converging set — survey, a windfall study, and a give-money field experiment — and flagged reverse causality (happy people give more).',
        why: 'A causal claim needs an experiment to back the correlation; the multi-study design defuses the obvious confound.',
        insteadOf: 'A survey alone (the cheap option) was deliberately supplemented with an experiment to earn causal language.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope',
        when: 'Week 4',
        did: 'Used brief validated happiness items plus a simple self-vs-other spending allocation.',
        why: 'Short, validated measures keep three studies light; ScaleScope supplies them.',
      },
      {
        stage: 'collect',
        tool: 'Cadence + field experiment',
        when: 'Months 1–3',
        did: 'Ran the national survey and windfall study via Cadence, then handed participants real money to spend on self or others and measured evening happiness.',
        why: 'Cadence fields the surveys; the field manipulation supplies the causal leg.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope',
        when: 'Month 3',
        did: 'Tested the spending–happiness link in the survey and compared happiness across the experimental conditions.',
        why: 'Regression plus a between-condition t-test cover both legs in one pass.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Months 3–4',
        did: 'Wove the three studies into one short, converging argument.',
        why: 'The Article Developer keeps a multi-study brief report coherent.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope',
        when: 'Month 4',
        did: 'Targeted a top general-science outlet for a broadly resonant finding.',
        why: 'ScholarScope matches reach to audience.',
      },
    ],
  },

  // 15 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'kahneman-deaton-2010',
    tier: 'short',
    title: 'High Income Improves Evaluation of Life but Not Emotional Well-Being',
    authors: 'Daniel Kahneman & Angus Deaton',
    year: 2010,
    journal: 'Proceedings of the National Academy of Sciences',
    doi: '10.1073/pnas.1011492107',
    design: 'Secondary analysis of large survey data · >450,000 US respondents',
    construct: 'Income → emotional well-being vs life evaluation',
    theory: 'Hedonic vs evaluative well-being distinction',
    instrument: 'Existing Gallup-Healthways daily survey items (no new instrument)',
    finding:
      'Life evaluation rises steadily with log income, but day-to-day emotional well-being improves with income only up to a moderate threshold and then flattens.',
    angle: 'No data collection at all: a big existing dataset, asked a sharper question.',
    totalTime: '≈2 months',
    steps: [
      {
        stage: 'discover',
        tool: "PaperCards + Syed's Research Book",
        when: 'Weeks 1–2',
        did: 'Surveyed the income–happiness debate and saw two "well-being" outcomes had been conflated.',
        why: 'A fast read distinguishes evaluative from emotional well-being — the wedge.',
      },
      {
        stage: 'frame',
        tool: 'ResearchFlow + FallacyScope',
        when: 'Week 2',
        did: 'Reframed the question around two distinct outcomes and flagged the jingle fallacy of treating both as one "happiness".',
        why: 'The contribution is conceptual separation tested on existing data; framing is the work.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope (as reference)',
        when: 'Week 2',
        did: 'Identified which existing survey items index evaluation versus daily emotion, recording their properties.',
        why: 'With secondary data, ScaleScope is a reference to map items to constructs — not a survey builder.',
      },
      {
        stage: 'collect',
        tool: 'Secondary data (no survey)',
        when: 'Weeks 2–3',
        did: 'Assembled the existing large-sample survey records rather than collecting new responses.',
        why: 'The data already exist at a scale no new study could match.',
        insteadOf: 'Cadence is deliberately skipped — a secondary analysis fields no survey of its own.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope',
        when: 'Weeks 3–6',
        did: 'Regressed each well-being outcome on log income and traced where the emotional-well-being curve flattens.',
        why: 'Regression on a log predictor and a simple change-point read run directly.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Weeks 6–8',
        did: 'Reported the two diverging income curves as a single clean contrast.',
        why: 'The Article Developer keeps a two-outcome result legible.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope + OSF',
        when: 'Week 8',
        did: 'Targeted a top multidisciplinary outlet; in a modern run, posted the analysis code openly.',
        why: 'A secondary-data result gains trust from open code; OSF hosts it, ScholarScope picks the journal.',
      },
    ],
  },

  // 16 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'norton-2012',
    tier: 'short',
    title: 'The IKEA Effect: When Labor Leads to Love',
    authors: 'Michael I. Norton, Daniel Mochon & Dan Ariely',
    year: 2012,
    journal: 'Journal of Consumer Psychology',
    doi: '10.1016/j.jcps.2011.08.002',
    design: 'Series of lab experiments · valuation of self-made objects',
    construct: 'Self-performed labor → valuation of the resulting object',
    theory: 'Effort justification / endowment',
    instrument: 'Willingness-to-pay bids for self-assembled vs pre-made items',
    finding:
      'People place inflated value on objects they built themselves — valuing their own (often amateur) creations as highly as experts’ work, provided assembly is completed.',
    angle: 'A handful of crisp lab experiments around one counterintuitive effect.',
    totalTime: '≈3 months',
    steps: [
      {
        stage: 'discover',
        tool: 'PaperCards',
        when: 'Weeks 1–2',
        did: 'Traced endowment and effort-justification work to position labor as a distinct driver of valuation.',
        why: 'A targeted trace isolates the novel mechanism among neighbors.',
      },
      {
        stage: 'frame',
        tool: 'ResearchFlow + FallacyScope',
        when: 'Week 2',
        did: 'Designed assembly experiments with WTP outcomes and a non-completion control, flagging demand effects.',
        why: 'A completion-vs-not control is what proves it is labor, not mere exposure.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope',
        when: 'Week 3',
        did: 'Used incentive-compatible WTP bids as the valuation measure.',
        why: 'A behavioral bid beats a self-report rating for valuation; ScaleScope frames the elicitation.',
      },
      {
        stage: 'collect',
        tool: 'Lab / online sessions + Cadence',
        when: 'Weeks 4–8',
        did: 'Participants assembled items (or did not), then bid; Cadence collected the bids and brief checks.',
        why: 'Short sessions yield behavior fast; Cadence captures the structured responses.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope',
        when: 'Weeks 8–10',
        did: 'Compared bids across made-vs-given and completed-vs-not conditions (ANOVA).',
        why: 'Factorial condition comparisons are a single ToolsScope pass.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Weeks 10–12',
        did: 'Built the multi-experiment story around the labor-completion boundary.',
        why: 'The Article Developer sequences several short experiments toward one claim.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope',
        when: 'Week 12',
        did: 'Targeted a consumer-psychology outlet that fits behavioral experiments.',
        why: 'ScholarScope matches the method to a receptive journal.',
      },
    ],
  },

  // 17 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'mehl-2010',
    tier: 'short',
    title: 'Eavesdropping on Happiness: Well-Being Is Related to Having Less Small Talk and More Substantive Conversations',
    authors: 'Matthias R. Mehl, Simine Vazire, Shannon E. Holleran & C. Shelby Clark',
    year: 2010,
    journal: 'Psychological Science',
    doi: '10.1177/0956797610362675',
    design: 'Naturalistic observational study · audio sampling over days',
    construct: 'Substantive vs small-talk conversation → well-being',
    theory: 'Social connection and well-being',
    instrument: 'Electronically Activated Recorder (EAR) audio sampling + well-being measures',
    finding:
      'Greater well-being is associated with spending less time alone and in small talk and more time in substantive conversation — an observed, not self-reported, behavioral correlate.',
    angle: 'Observational by design: real behavior captured passively; causality stays cautious.',
    totalTime: '≈4 months',
    steps: [
      {
        stage: 'discover',
        tool: "PaperCards + Syed's Research Book",
        when: 'Weeks 1–3',
        did: 'Reviewed well-being correlates and found most were self-reported rather than observed behavior.',
        why: 'The gap is a measurement one — observed conversation, not recalled sociability.',
      },
      {
        stage: 'frame',
        tool: 'TheoryScope + FallacyScope',
        when: 'Weeks 3–4',
        did: 'Framed conversation quality through social-connection theory and explicitly flagged the correlational limit (no causal claim).',
        why: 'Honest framing of a correlational design is the integrity move here.',
        insteadOf: 'No experiment was claimed; ResearchFlow’s heavy design path was unnecessary for an observational correlate.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope',
        when: 'Week 4',
        did: 'Paired validated well-being scales with a conversation-coding scheme (small talk vs substantive).',
        why: 'A behavioral coding scheme plus a brief well-being scale is the measurement core.',
      },
      {
        stage: 'collect',
        tool: 'EAR sampling + Cadence',
        when: 'Months 1–3',
        did: 'Participants wore an audio recorder sampling ambient sound over days; conversations were later coded; well-being collected via Cadence.',
        why: 'Passive sampling captures real behavior; Cadence collects the well-being side.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope',
        when: 'Month 3',
        did: 'Correlated conversation types with well-being and checked robustness.',
        why: 'Correlations with controls are a direct ToolsScope task.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Months 3–4',
        did: 'Reported the observed correlates, carefully bounding the causal language.',
        why: 'The Article Developer keeps claims matched to an observational design.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope',
        when: 'Month 4',
        did: 'Targeted a short-format empirical psychology outlet.',
        why: 'ScholarScope fits a crisp observational result to a fast journal.',
      },
    ],
  },

  // 18 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'gneezy-rustichini-2000',
    tier: 'short',
    title: 'A Fine Is a Price',
    authors: 'Uri Gneezy & Aldo Rustichini',
    year: 2000,
    journal: 'The Journal of Legal Studies',
    doi: '10.1086/468061',
    design: 'Field experiment · day-care centers, archival late-pickup counts',
    construct: 'Monetary fine → behavior (deterrence vs motivation crowding-out)',
    theory: 'Incentives and motivation crowding',
    instrument: 'Objective records of late pickups (no questionnaire)',
    finding:
      'Introducing a fine for late pickup increased lateness — the fine recast a social obligation as a purchasable service — and removing it did not restore the original norm.',
    angle: 'A real-world manipulation with an objective count: behavior, not surveys.',
    totalTime: '≈5 months',
    steps: [
      {
        stage: 'discover',
        tool: "PaperCards + Syed's Research Book",
        when: 'Weeks 1–3',
        did: 'Reviewed incentive theory and identified motivation crowding-out as testable in a real setting.',
        why: 'A quick scan surfaces a counterintuitive prediction worth a field test.',
      },
      {
        stage: 'frame',
        tool: 'ResearchFlow + FallacyScope',
        when: 'Weeks 3–4',
        did: 'Designed a multi-site field experiment introducing a fine at some centers, with a baseline period, and flagged history/selection threats.',
        why: 'A natural manipulation with a pre/post baseline is exactly what licenses the causal read.',
        insteadOf: 'A lab analogue would lose the real-stakes behavior; the field design is the contribution.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope (minimal)',
        when: 'Week 4',
        did: 'Used the centers’ own count of late pickups as the objective dependent measure.',
        why: 'An archival behavioral count needs no scale — the record is the measure.',
        insteadOf: 'A survey of intentions would miss the actual behavior the theory predicts.',
      },
      {
        stage: 'collect',
        tool: 'Field records (no survey)',
        when: 'Months 1–4',
        did: 'Logged weekly late pickups across centers through baseline, fine, and post-fine periods.',
        why: 'The data are behavioral counts gathered on site over weeks.',
        insteadOf: 'Cadence is not central — the outcome is an administrative record, not a questionnaire.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope',
        when: 'Month 4',
        did: 'Compared late-pickup rates across periods and between treated and control centers.',
        why: 'A between-group, pre/post comparison is a direct ToolsScope analysis.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Months 4–5',
        did: 'Told the crowding-out story and the failure of the norm to return.',
        why: 'The Article Developer foregrounds the counterintuitive causal result.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope',
        when: 'Month 5',
        did: 'Targeted an outlet bridging economics and behavior.',
        why: 'ScholarScope matches a cross-field field experiment to the right readership.',
      },
    ],
  },

  // 19 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'milkman-2011',
    tier: 'short',
    title: 'Using Implementation Intentions Prompts to Enhance Influenza Vaccination Rates',
    authors: 'Katherine L. Milkman, John Beshears, James J. Choi, David Laibson & Brigitte C. Madrian',
    year: 2011,
    journal: 'Proceedings of the National Academy of Sciences',
    doi: '10.1073/pnas.1103170108',
    design: 'Randomized field experiment · employees at a large firm, vaccination records',
    construct: 'Planning prompt (implementation intention) → vaccination behavior',
    theory: 'Implementation intentions',
    instrument: 'Mailed prompt variants + objective vaccination records',
    finding:
      'Prompting employees to write down a specific date — and especially a date and time — to get vaccinated raised vaccination rates over a plain reminder, at no extra cost.',
    angle: 'A one-shot nudge with an objective outcome: minimal manipulation, real records.',
    totalTime: '≈4 months',
    steps: [
      {
        stage: 'discover',
        tool: "PaperCards + Syed's Research Book",
        when: 'Weeks 1–2',
        did: 'Reviewed the intention–behavior gap and found implementation-intention prompts under-tested at scale in the field.',
        why: 'A quick trace points to a cheap, scalable lever worth a real test.',
      },
      {
        stage: 'frame',
        tool: 'ResearchFlow + FallacyScope',
        when: 'Weeks 2–3',
        did: 'Designed a randomized trial varying prompt content (reminder, write-date, write-date+time) with vaccination as the outcome, flagging selection and spillover.',
        why: 'Randomization plus an objective record is the whole basis for a causal, policy-relevant claim.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope (minimal)',
        when: 'Week 3',
        did: 'Used the mailer wording as the manipulation and clinic records as the binary outcome.',
        why: 'A behavioral, archival outcome needs no scale — the record is the measure.',
      },
      {
        stage: 'collect',
        tool: 'Field mailers + records',
        when: 'Months 1–3',
        did: 'Distributed the randomized prompts and pulled who actually got vaccinated from administrative records.',
        why: 'The intervention is a single mailing; the outcome is an objective record.',
        insteadOf: 'Cadence plays only a minor role — the outcome is administrative, not a self-report survey.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope',
        when: 'Month 3',
        did: 'Compared vaccination rates across prompt conditions (proportions / logistic regression).',
        why: 'A binary outcome across randomized arms is a direct ToolsScope analysis.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Months 3–4',
        did: 'Reported the effect and its low-cost, scalable policy implication.',
        why: 'The Article Developer frames a crisp, actionable field result.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope + OSF',
        when: 'Month 4',
        did: 'Targeted a top multidisciplinary outlet; in a modern run, preregistered the trial on OSF.',
        why: 'A field RCT is the ideal preregistration case; OSF hosts it, ScholarScope picks the journal.',
      },
    ],
  },

  // 20 ──────────────────────────────────────────────────────────────────────
  {
    slug: 'bryan-2011',
    tier: 'short',
    title: 'Motivating Voter Turnout by Invoking the Self',
    authors: 'Christopher J. Bryan, Gregory M. Walton, Todd Rogers & Carol S. Dweck',
    year: 2011,
    journal: 'Proceedings of the National Academy of Sciences',
    doi: '10.1073/pnas.1103343108',
    design: 'Field experiments before real elections · survey wording + official turnout',
    construct: 'Noun ("be a voter") vs verb ("to vote") self-framing → turnout',
    theory: 'Self and identity',
    instrument: 'Survey wording manipulation + official state voting records',
    finding:
      'Framing voting as a matter of being "a voter" (an identity) rather than "to vote" (a behavior) increased actual turnout, verified against official records.',
    angle: 'A one-word manipulation, validated against real behavior — small change, hard outcome.',
    totalTime: '≈3 months',
    steps: [
      {
        stage: 'discover',
        tool: "PaperCards + Syed's Research Book",
        when: 'Weeks 1–2',
        did: 'Reviewed identity and self-concept work and saw turnout interventions rarely manipulated identity framing.',
        why: 'A fast trace pinpoints an untested, minimal lever.',
      },
      {
        stage: 'frame',
        tool: 'ResearchFlow + FallacyScope',
        when: 'Week 2',
        did: 'Designed pre-election experiments contrasting noun vs verb phrasing with turnout as the outcome, flagging social-desirability and self-report turnout bias.',
        why: 'Validating against official records, not claimed votes, is the design move that makes it credible.',
        insteadOf: 'Self-reported intention to vote (the easy DV) was rejected in favor of verified behavior.',
      },
      {
        stage: 'measure',
        tool: 'ScaleScope (minimal)',
        when: 'Week 2',
        did: 'Used the questionnaire wording as the manipulation and official turnout as the objective outcome.',
        why: 'The manipulation is the survey itself; the outcome is an external record.',
      },
      {
        stage: 'collect',
        tool: 'Cadence + voter records',
        when: 'Weeks 3–8',
        did: 'Fielded the worded survey to eligible voters before elections, then matched respondents to official turnout records.',
        why: 'Cadence delivers the wording manipulation; turnout comes from the public record.',
      },
      {
        stage: 'analyze',
        tool: 'ToolsScope',
        when: 'Weeks 8–10',
        did: 'Compared verified turnout between wording conditions (proportions / logistic regression).',
        why: 'A binary, records-verified outcome across conditions is a direct test.',
      },
      {
        stage: 'write',
        tool: 'JournalTime',
        when: 'Weeks 10–12',
        did: 'Reported the identity-framing effect on real turnout.',
        why: 'The Article Developer frames a minimal-manipulation, hard-outcome result.',
      },
      {
        stage: 'publish',
        tool: 'ScholarScope + OSF',
        when: 'Week 12',
        did: 'Targeted a top multidisciplinary outlet; in a modern run, preregistered and posted materials on OSF.',
        why: 'A small-manipulation field effect benefits from preregistration; OSF + ScholarScope handle it.',
      },
    ],
  },
]

export function caseStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((c) => c.slug === slug)
}

/** Pacing tier, defaulting the original (multi-month) studies to 'long'. */
export function paceOf(c: CaseStudy): 'short' | 'long' {
  return c.tier ?? 'long'
}

/** APA-ish one-line reference for display. */
export function apaRef(c: CaseStudy): string {
  return `${c.authors} (${c.year}). ${c.title}. ${c.journal}.`
}

export function doiUrl(doi: string): string {
  return `https://doi.org/${doi}`
}
