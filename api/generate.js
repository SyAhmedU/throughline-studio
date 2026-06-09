// ============================================================================
// Throughline Studio — shared AI backend (Vercel serverless, Node runtime).
// Routes through the Vercel AI Gateway via the `ai` SDK, exactly like the rest
// of the suite (scalebase / karmamap). Auth is AUTOMATIC on Vercel: the
// deployment's OIDC token authenticates the gateway, so no key needs to be
// stored on the project. Set AI_GATEWAY_API_KEY only for local runs outside
// Vercel. If neither is present the call throws and we return 503, so the
// client renders its offline state.
//
// HARD RULE (matches the suite): never fabricate citations, authors, years,
// DOIs, or effect sizes. The system prompt enforces this; downstream stages
// must still hand-verify anything that becomes research content.
// ============================================================================

import { generateText } from 'ai'

const MODEL = process.env.TLS_MODEL || 'anthropic/claude-opus-4.8'
const FALLBACK_MODELS = ['anthropic/claude-sonnet-4.6']

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
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

  try {
    const { text } = await generateText({
      model: MODEL,
      system: sys,
      prompt,
      temperature: typeof temperature === 'number' ? temperature : 0.4,
      providerOptions: {
        gateway: {
          models: FALLBACK_MODELS,
          tags: ['project:throughline-studio', 'feature:generate'],
        },
      },
    })
    // Defensive: strip ```json fences in case the model wraps output.
    const clean = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    let data
    if (schema_hint) {
      try {
        data = JSON.parse(clean)
      } catch {
        /* model returned prose; leave data undefined */
      }
    }
    res.status(200).json({ text: clean, data })
  } catch (err) {
    // Degrade gracefully so the client renders its calm offline state instead
    // of crashing. 503 (-> client "unavailable") covers everything that's a
    // configuration/account state rather than a transient fault: missing auth
    // (no OIDC token / no key) AND the gateway's "add a credit card to unlock
    // free credits" billing gate, which blocks the whole suite until a card is
    // on file. Anything else is treated as a transient error (502).
    const msg = String((err && err.message) || err)
    const unavailable =
      /api key|unauthor|oidc|credential|gateway_api_key|forbidden|401|403/i.test(msg) ||
      /credit card|requires a valid|free credits|billing|quota|insufficient|payment/i.test(msg)
    res.status(unavailable ? 503 : 502).json({
      error: unavailable ? 'AI not configured' : 'AI gateway error',
      text: '',
    })
  }
}

function safeParse(s) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}
