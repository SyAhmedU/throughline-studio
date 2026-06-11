// ============================================================================
// Throughline Studio — client seam to the shared AI backend.
// POSTs to the local /api/generate serverless function; when that is absent
// (dev without `vercel dev`) or unconfigured (503, gateway not billed), it
// falls back to the suite's shared Groq backend (ResearchFlow's /api/generate,
// CORS-open). Only when BOTH are unreachable do callers get { ok:false } and
// render their offline state. No fabricated content ever — both serverless
// prompts enforce "real sources only", and every caller treats AI output as a
// draft to verify, never as a citation.
// ============================================================================

export interface GenOptions {
  /** a short description of the JSON shape you expect back */
  schemaHint?: string
  temperature?: number
  signal?: AbortSignal
}

export interface GenResult {
  ok: boolean
  text?: string
  /** parsed JSON when a schemaHint was supplied and the model returned JSON */
  data?: unknown
  reason?: 'unavailable' | 'error'
}

/** The suite's shared Groq backend (ResearchFlow). Response shape differs from
 *  the Studio's own endpoint: { result: <parsed JSON>, _source } vs { text, data }. */
const FALLBACK_URL = 'https://researchflow-syahmedus-projects.vercel.app/api/generate'

async function post(url: string, prompt: string, opts: GenOptions): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt,
      schema_hint: opts.schemaHint,
      temperature: opts.temperature ?? 0.4,
    }),
    signal: opts.signal,
  })
}

function normalize(json: Record<string, unknown>): GenResult {
  // RF backend: { result } — Studio backend: { text, data }
  if (json.result !== undefined) {
    return {
      ok: true,
      data: json.result,
      text: typeof json.result === 'string' ? json.result : undefined,
    }
  }
  return { ok: true, text: json.text as string | undefined, data: json.data }
}

export async function generate(prompt: string, opts: GenOptions = {}): Promise<GenResult> {
  // 1) the Studio's own endpoint
  try {
    const res = await post('/api/generate', prompt, opts)
    if (res.ok) return normalize(await res.json())
    if (res.status !== 404 && res.status !== 503) return { ok: false, reason: 'error' }
    // 404/503 → fall through to the shared backend
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return { ok: false, reason: 'unavailable' }
    // network failure → fall through to the shared backend
  }

  // 2) the suite's shared Groq backend
  try {
    const res = await post(FALLBACK_URL, prompt, opts)
    if (res.status === 404 || res.status === 503) return { ok: false, reason: 'unavailable' }
    if (!res.ok) return { ok: false, reason: 'error' }
    return normalize(await res.json())
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}
