// ToolsScope core types.
// ToolsScope is an in-browser analysis & visualization workbench: cleaned data
// (from Cadence, or any CSV/XLSX upload) flows in, and ToolsScope replicates the
// core analytical features researchers report in papers — the things you'd
// otherwise run in SPSS/R/jamovi — plus the figures that accompany them.
// Sibling of ScaleScope/TheoryScope; fills the *analyze* step of the Research
// Suite (Cadence collect → ToolsScope analyze → JournalTime write).

// How a column is treated in analyses. Auto-detected on import, user-overridable.
export type VarType =
  | 'numeric'       // continuous / interval
  | 'likert'        // ordered numeric responses on a small fixed scale (1–5, 1–7)
  | 'categorical'   // nominal groups (gender, condition)
  | 'text'          // free text (qualitative; not analysed quantitatively in v1)
  | 'id';           // identifier / not for analysis

export type Cell = number | string | null;

export interface Variable {
  name: string;
  type: VarType;
  levels?: (string | number)[]; // distinct observed values (categorical/likert)
  missing: number;              // count of missing/blank cells
  // likert metadata when detected
  likertMin?: number;
  likertMax?: number;
  // Cadence-derived metadata (set when imported from a Cadence "Download my data" file)
  cadenceScaleAbbr?: string;    // groups items into a multi-item scale
  cadenceDim?: string;          // sub-dimension within the scale
  cadenceReversed?: boolean;    // already reverse-recoded on import
  cadenceWaveCol?: boolean;     // marks waveNum column for repeated-measures workflows
  cadenceComposite?: boolean;   // auto-computed mean composite (UWES_vigor, etc.)
  cadenceCompositeItems?: string[]; // raw item column names that fed into this composite
  cadenceControl?: boolean;     // study designer marked this scale as a control variable (→ covariate)
}

export interface Dataset {
  name: string;
  source: 'upload' | 'paste' | 'cadence' | 'demo';
  variables: Variable[];
  rows: Record<string, Cell>[];
  cadenceStudyId?: string;        // when source = 'cadence'
}

// ---- Analysis result shapes (rendered by the Analyze view, narrated by AI) ----

export interface DescriptiveRow {
  variable: string;
  n: number;
  missing: number;
  mean: number;
  sd: number;
  min: number;
  max: number;
  median: number;
  skewness: number;
  kurtosis: number;
}

export interface ReliabilityResult {
  items: string[];
  n: number;            // complete cases used
  k: number;            // number of items
  alpha: number;        // Cronbach's α
  omega?: number;       // McDonald's ω (approx, from a single-factor loading est.)
  itemTotal: { item: string; corrected_r: number; alpha_if_deleted: number }[];
  reversedSuggestions: string[]; // items whose corrected item-total r is negative
}

export interface CorrelationResult {
  vars: string[];
  r: number[][];        // Pearson (or Spearman) matrix
  p: number[][];        // two-tailed p-values
  n: number[][];        // pairwise N
  method: 'pearson' | 'spearman';
}

export interface TTestResult {
  kind: 'independent' | 'paired' | 'one-sample';
  groups?: [string, string];
  m1: number; m2: number;
  sd1: number; sd2: number;
  n1: number; n2: number;
  t: number; df: number; p: number;
  meanDiff: number;
  cohensD: number;      // effect size
  ci95: [number, number]; // CI of the mean difference
}

export interface AnovaResult {
  factor: string;
  dv: string;
  groups: { level: string; n: number; mean: number; sd: number }[];
  fStat: number; dfBetween: number; dfWithin: number; p: number;
  etaSquared: number;   // effect size
  postHoc?: { a: string; b: string; meanDiff: number; p: number }[]; // Tukey-ish
}

export interface RegressionResult {
  dv: string;
  predictors: string[];
  n: number;
  r2: number; adjR2: number;
  fStat: number; dfModel: number; dfResid: number; pModel: number;
  coefficients: {
    term: string;       // 'intercept' or predictor name
    b: number;          // unstandardised
    se: number;
    beta: number;       // standardised (NaN for intercept)
    t: number;
    p: number;
    vif?: number;
  }[];
}

export interface ChiSquareResult {
  rowVar: string;
  colVar: string;
  observed: number[][];
  expected: number[][];
  rowLevels: string[];
  colLevels: string[];
  chi2: number; df: number; p: number;
  cramersV: number;     // effect size
}

// ---- v2: factor analysis (PCA / EFA) ----
export interface FactorAnalysisResult {
  method: 'pca' | 'efa';            // pca = principal component analysis; efa = principal-axis factoring
  items: string[];
  n: number;                        // complete cases
  k: number;                        // number of items
  kmo: number;                      // Kaiser-Meyer-Olkin measure of sampling adequacy
  bartlettChi2: number;             // Bartlett's test of sphericity
  bartlettDf: number;
  bartlettP: number;
  eigenvalues: number[];            // sorted descending
  varianceExplained: number[];      // proportion of variance per component
  cumulativeVariance: number[];
  nFactors: number;                 // factors retained (Kaiser by default; ≥ 1 eigenvalue)
  rotation: 'none' | 'varimax';
  loadings: number[][];             // items × factors, rotated if requested
  communalities: number[];          // per item
}

// ---- v3: confirmatory factor analysis (ML, simple structure) ----
// Tests a researcher-specified measurement model: each item loads on exactly
// one named factor; factors may correlate. Standardized-latent parameterization
// (factor variances fixed to 1), maximum-likelihood estimation.
export interface CfaLoading {
  factor: string;
  item: string;
  std: number;          // standardized loading λ/√(λ²+θ)
  unstd: number;        // unstandardized loading (factor SD = 1 metric)
  se: number;           // standard error of the unstandardized loading
  z: number;            // unstd / se
  p: number;            // two-tailed
}
export interface CfaResult {
  kind: 'cfa';
  items: string[];
  factors: string[];
  spec: Record<string, string[]>;   // factor → items
  n: number;                        // complete cases
  p: number;                        // observed variables
  q: number;                        // free parameters
  df: number;                       // p(p+1)/2 − q
  converged: boolean;
  iterations: number;
  fMin: number;                     // F_ML at the minimum
  // model test (minimum fit function χ² = (N−1)·F_ML)
  chi2: number; chi2P: number;
  baselineChi2: number; baselineDf: number;
  // approximate / incremental fit
  cfi: number; tli: number; rmsea: number; srmr: number;
  // estimates
  loadings: CfaLoading[];
  errorVariances: { item: string; theta: number; r2: number }[]; // r2 = 1 − std error variance
  factorCorrelations: { f1: string; f2: string; r: number }[];
  reliability: { factor: string; omega: number; ave: number }[]; // from standardized loadings
  warnings: string[];
}

// ---- v2: nonparametric tests ----
export interface MannWhitneyResult {
  kind: 'mann-whitney';
  groups: [string, string];
  n1: number; n2: number;
  u: number; w: number;             // U statistic + Wilcoxon W
  z: number; p: number;
  meanRank1: number; meanRank2: number;
  rankBiserial: number;             // effect size r = 1 - 2U/(n1*n2)
}
export interface WilcoxonResult {
  kind: 'wilcoxon-signed-rank';
  vars: [string, string];
  n: number;                        // non-zero pairs
  w: number;                        // sum of signed ranks (smaller of W+/W-)
  z: number; p: number;
  matchedR: number;                 // r = z / sqrt(N)
}
export interface KruskalWallisResult {
  kind: 'kruskal-wallis';
  factor: string;
  dv: string;
  groups: { level: string; n: number; meanRank: number }[];
  h: number; df: number; p: number;
  epsilonSquared: number;           // effect size
}

// ---- v2: mediation (PROCESS Model 4) + moderation (Model 1) ----
export interface MediationResult {
  x: string; m: string; y: string;
  n: number;
  a: number; aSE: number; aP: number;          // X → M
  b: number; bSE: number; bP: number;          // M → Y | X
  cPrime: number; cPrimeSE: number; cPrimeP: number; // X → Y | M (direct)
  c: number; cSE: number; cP: number;          // X → Y (total)
  indirect: number;                            // a * b
  sobelZ: number; sobelP: number;
  bootstrapCI95: [number, number];             // percentile CI for indirect
  bootstrapN: number;
}
export interface ModerationResult {
  x: string; w: string; y: string;
  n: number;
  bX: number; seX: number; pX: number;
  bW: number; seW: number; pW: number;
  bXW: number; seXW: number; pXW: number;      // interaction term
  intercept: number;
  r2: number; r2Change: number;                // ΔR² for the interaction
  simpleSlopes: { wLevel: string; w: number; slope: number; se: number; t: number; p: number }[];
}

// ---- v3: factorial (two-way) ANOVA — Type III SS via GLM with effect coding ----
export interface TwoWayAnovaResult {
  kind: 'two-way-anova';
  dv: string; factorA: string; factorB: string;
  levelsA: string[]; levelsB: string[];
  n: number;
  cells: { a: string; b: string; n: number; mean: number; sd: number }[];
  // effects in order: factor A, factor B, A × B interaction
  effects: { name: string; df: number; ss: number; ms: number; F: number; p: number; partialEtaSq: number }[];
  dfResidual: number; ssResidual: number; msResidual: number;
  balanced: boolean;            // equal cell counts? (Type III matters most when false)
}

// ---- v3: one-way repeated-measures ANOVA (within-subjects) ----
export interface RepeatedMeasuresResult {
  kind: 'repeated-measures-anova';
  conditions: string[];
  n: number; k: number;         // complete subjects × conditions
  means: { condition: string; mean: number; sd: number }[];
  ssConditions: number; dfConditions: number; msConditions: number;
  ssSubjects: number; dfSubjects: number;
  ssError: number; dfError: number; msError: number;
  F: number; p: number;
  partialEtaSq: number;
}

// ---- v3: intraclass correlation (ICC) — Shrout & Fleiss / McGraw & Wong forms ----
export interface IccResult {
  kind: 'icc';
  n: number; k: number;         // subjects (targets) × raters/measures
  msR: number; msC: number; msE: number; msW: number;
  estimates: {
    type: string;               // e.g. 'ICC(2,1)'
    label: string;              // human description
    icc: number;
    ci95: [number, number];
  }[];
}

// ---- v3: binary logistic regression (IRLS / Newton–Raphson) ----
export interface LogisticRegressionResult {
  kind: 'logistic-regression';
  dv: string;
  predictors: string[];
  n: number;
  events: number;               // count of y = 1
  iterations: number;
  converged: boolean;
  coefficients: {
    term: string;               // 'intercept' or predictor name
    b: number; se: number;
    z: number; p: number;
    oddsRatio: number;          // exp(b)
    orCI95: [number, number];   // exp(b ± 1.96·SE)
  }[];
  logLik: number; nullLogLik: number;
  mcFaddenR2: number;
  lrChi2: number; lrDf: number; lrP: number;   // overall model test vs null
}

// ---- v3: Cohen's kappa — chance-corrected agreement between two raters (categorical) ----
export interface CohensKappaResult {
  kind: 'cohens-kappa';
  rater1: string; rater2: string;
  n: number;                    // paired complete cases
  categories: string[];
  matrix: number[][];           // confusion matrix, categories × categories
  po: number;                   // observed agreement
  pe: number;                   // chance-expected agreement
  kappa: number;
  se: number;                   // approximate large-sample SE (Cohen, 1960)
  ci95: [number, number];
  z: number; p: number;         // test of κ = 0
  interpretation: string;       // Landis & Koch (1977) band
}

// ---- v3: Poisson regression (count outcomes, log link, IRLS) ----
export interface PoissonRegressionResult {
  kind: 'poisson-regression';
  dv: string;
  predictors: string[];
  n: number;
  sumY: number;                 // total events observed
  iterations: number;
  converged: boolean;
  coefficients: {
    term: string;               // 'intercept' or predictor name
    b: number; se: number;      // log-rate scale
    z: number; p: number;
    rateRatio: number;          // exp(b) — incidence rate ratio (IRR)
    rrCI95: [number, number];
  }[];
  logLik: number; nullLogLik: number;
  mcFaddenR2: number;
  lrChi2: number; lrDf: number; lrP: number;   // overall model test vs null
  dispersion: number;           // Pearson χ² / df — ≫ 1 signals overdispersion
}

// ---- v3: partial correlation (Pearson r controlling for covariates) ----
export interface PartialCorrelationResult {
  kind: 'partial-correlation';
  x: string; y: string; controls: string[];
  n: number;
  partialR: number;             // r_xy · controls
  zeroOrderR: number;           // raw Pearson r_xy (for comparison)
  df: number;
  t: number; p: number;
  ci95: [number, number];       // Fisher-z confidence interval
}

// ---- v3: ANCOVA — factor effect on a continuous DV, adjusted for covariate(s) ----
export interface AncovaResult {
  kind: 'ancova';
  dv: string; factor: string; covariates: string[];
  n: number;
  levels: string[];
  ssFactor: number; dfFactor: number; msFactor: number;
  ssError: number; dfError: number; msError: number;
  F: number; p: number; partialEtaSq: number;
  covariateEffects: { name: string; b: number; se: number; t: number; p: number }[];
  adjustedMeans: { level: string; n: number; adjMean: number }[];   // EMMs at grand-mean covariates
}

// ---- v2: qualitative analysis ----
export interface QualCode {
  id: string;
  label: string;
  color: string;
  theme?: string;
}
export interface QualSpan {
  docId: string;
  start: number; end: number;
  codeId: string;
  text: string;
}
export interface QualDoc {
  id: string;
  name: string;
  text: string;
}
export interface QualProject {
  docs: QualDoc[];
  codes: QualCode[];
  spans: QualSpan[];
}
export interface WordFreqRow { word: string; count: number; docs: number }
export interface CodeFreqRow { code: string; label: string; count: number; docs: number; theme?: string }
export interface CoocCell { a: string; b: string; count: number }

// Visualization spec the Visualize view builds from.
export type ChartType =
  | 'histogram'
  | 'bar-means'         // group means with error bars
  | 'boxplot'
  | 'scatter'           // + fit line
  | 'heatmap'           // correlation matrix
  | 'likert-stacked';   // stacked distribution of Likert items

export interface ChartSpec {
  type: ChartType;
  title?: string;
  x?: string;
  y?: string;
  group?: string;
  items?: string[];     // for likert-stacked / heatmap
}
