// Construct crosswalk for the researcher's OWN framed constructs.
// The Research Book publishes constructs.map.json (deterministic label match,
// no AI — syeds-research-book/scripts/build-construct-map.mjs): construct →
// TheoryScope theories + ScaleScope scales. Here we match the labels the
// researcher typed into Frame (IV/DV/mediators/moderators) against that map
// (byPhrase keys + hand-coded construct names, with a plural fold), so their
// constructs link straight into the suite's catalogs and corpus.
// Machine-matched → the UI must always badge "verify".

import { useEffect, useState } from 'react'

const BOOK = 'https://syahmedu.github.io/syeds-research-book'

export interface XwTheory { s: string; n: string }
export interface XwScale { id?: number; n: string; ab?: string }
interface XwEntry { theories: XwTheory[]; scales: XwScale[] }
interface XwMap { byCode: Record<string, XwEntry>; byPhrase: Record<string, XwEntry> }

export interface XwMatch {
  label: string          // the construct as the researcher framed it
  theories: XwTheory[]   // TheoryScope #/theory/<slug>
  scales: XwScale[]      // ScaleScope ?scale=<id>
  bookUrl: string        // Research Book deep link (papers on this construct)
}

let cmap: XwMap | null = null
let phraseIdx: Record<string, string> | null = null // normalized phrase → byPhrase key
let codeIdx: Record<string, string> | null = null   // normalized hand-coded name → code
let pending: Promise<void> | null = null

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ')
const fold = (s: string) => (s.endsWith('s') && s.length > 4 ? s.slice(0, -1) : s)

function load(): Promise<void> {
  if (cmap) return Promise.resolve()
  if (!pending) {
    pending = Promise.all([
      fetch(`${BOOK}/data/constructs.map.json`).then((r) => (r.ok ? r.json() : null)),
      fetch(`${BOOK}/data/constructs.json`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([m, c]) => {
        if (!m || !m.byCode) return
        cmap = m as XwMap
        phraseIdx = {}
        for (const k of Object.keys(cmap.byPhrase ?? {})) phraseIdx[fold(norm(k))] = k
        codeIdx = {}
        const arr = Array.isArray(c) ? c : c?.constructs
        for (const x of arr ?? []) if (x?.code && x?.name) codeIdx[fold(norm(x.name))] = x.code
      })
      .catch(() => { /* offline — chips simply don't render */ })
  }
  return pending
}

export function xwalkFor(labels: string[]): XwMatch[] {
  if (!cmap) return []
  const out: XwMatch[] = []
  for (const label of labels) {
    const key = fold(norm(label))
    if (!key) continue
    let entry: XwEntry | undefined
    let bookUrl = ''
    const phrase = phraseIdx?.[key]
    if (phrase) {
      entry = cmap.byPhrase[phrase]
      bookUrl = `${BOOK}/?q=${encodeURIComponent(phrase)}`
    } else {
      const code = codeIdx?.[key]
      if (code) {
        entry = cmap.byCode[code]
        bookUrl = `${BOOK}/?construct=${encodeURIComponent(code)}`
      }
    }
    if (!entry || (!entry.theories?.length && !entry.scales?.length)) continue
    if (out.some((x) => x.label.toLowerCase() === label.toLowerCase())) continue
    out.push({ label, theories: entry.theories ?? [], scales: entry.scales ?? [], bookUrl })
  }
  return out
}

export function useXwalk(labels: string[]): XwMatch[] {
  const [, bump] = useState(0)
  const sig = labels.join('|')
  useEffect(() => {
    let on = true
    load().then(() => { if (on) bump((x) => x + 1) })
    return () => { on = false }
  }, [sig])
  return xwalkFor(labels)
}
