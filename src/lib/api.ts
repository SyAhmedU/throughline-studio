// ============================================================================
// Throughline Studio — client seam to the shared AI backend.
// POSTs to the local /api/generate serverless function. Degrades gracefully:
// when the endpoint is absent (dev without `vercel dev`) or unconfigured
// (503, no AI_GATEWAY_API_KEY), callers get { ok:false } and render their
// offline state rather than crashing. No fabricated content ever — the
// serverless prompt enforces "real sources only".
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

export async function generate(prompt: string, opts: GenOptions = {}): Promise<GenResult> {
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt,
        schema_hint: opts.schemaHint,
        temperature: opts.temperature ?? 0.4,
      }),
      signal: opts.signal,
    })
    if (res.status === 404 || res.status === 503) return { ok: false, reason: 'unavailable' }
    if (!res.ok) return { ok: false, reason: 'error' }
    const json = await res.json()
    return { ok: true, text: json.text, data: json.data }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}
