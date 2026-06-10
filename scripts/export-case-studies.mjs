// Export the worked examples to JSON for the case-video pipeline
// (E:\video\throughline-explainer). Node 24 strips TS types, so the
// .ts import works directly. Usage: node scripts/export-case-studies.mjs [out]
import { writeFileSync } from 'node:fs'
import { CASE_STUDIES } from '../src/lib/caseStudies.ts'

const out = process.argv[2] || 'E:/video/throughline-explainer/cases.json'
writeFileSync(out, JSON.stringify(CASE_STUDIES, null, 2))
console.log(`Wrote ${CASE_STUDIES.length} case studies → ${out}`)
