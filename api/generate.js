// ============================================================================
// Throughline Studio — shared AI backend (Vercel serverless, Node runtime).
// Proxies to the Vercel AI Gateway's OpenAI-compatible endpoint. No SDK deps
// (a plain fetch keeps the scaffold installable on a near-full disk).
// Configure AI_GATEWAY_API_KEY on the Vercel project to enable; without it the
// route returns 503 and the client renders its offline state.
//
// HARD RULE (matches the suite): never fabricate citations, authors, years,
// DOIs, or effect sizes. The system prompt enforces this; downstream stages
// must still hand-verify anything that becomes research content.
// ============================================================================

const MODEL = process.env.TLS_MODEL || 'anthropic/claude-opus-4.8'
const FALLBACK = 'anthropic/claude-sonnet-4.6'
const GATEWAY = 'https://ai-gateway.vercel.sh/v1/chat/completions'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }

  const key = process.env.AI_GATEWAY_API_KEY
  if (!key) {
    res.status(503).json({ error: 'AI not configured (set AI_GATEWAY_API_KEY)', text: '' })
    return
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {}
  const { prompt, schema_hint, temperature } = body
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'prompt (string) required' })
    return
  }

  const sys =
    'You are a careful social-science research assistant. ' +
    'Never fabricate citations, authors, years, DOIs, or effect sizes — if you are not ' +
    'certain a source is real, say so explicitly rather than inventing one. ' +
    (schema_hint ? 'Respond ONLY with JSON matching this shape: ' + schema_hint : '')

  async function call(model) {
    const r = await fetch(GATEWAY, {
      method: 'POST',
      headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: typeof temperature === 'number' ? temperature : 0.4,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!r.ok) throw new Error('gateway ' + r.status)
    const j = await r.json()
    return j.choices?.[0]?.message?.content ?? ''
  }

  try {
    let text
    try {
      text = await call(MODEL)
    } catch {
      text = await call(FALLBACK)
    }
    let data
    if (schema_hint) {
      try {
        data = JSON.parse(text)
      } catch {
        /* model returned prose; leave data undefined */
      }
    }
    res.status(200).json({ text, data })
  } catch {
    res.status(502).json({ error: 'AI gateway error', text: '' })
  }
}

function safeParse(s) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}
