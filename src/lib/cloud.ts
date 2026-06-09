// ============================================================================
// Throughline Studio — cloud data layer for the suite `projects` table.
// One suite project row backs one Throughline project: row.name = the study
// title, row.data.throughline = the full Project blob. Row-level security
// scopes every row to the signed-in user (see research-suite/suite-auth.js +
// SETUP.md), so the public anon key is safe and we never filter by user_id on
// read. Reuses the shared Supabase client from auth.ts. Callers treat every
// failure as "stay local" — nothing here is load-bearing for the app to run.
// ============================================================================

import { client } from './auth'
import type { Project } from './types'

/** The key our slice lives under inside a shared row's `data` jsonb. */
const TOOL_KEY = 'throughline'

export interface CloudRow {
  /** the suite `projects` row uuid (storage address) */
  id: string
  /** the embedded Throughline project (row.data.throughline) */
  project: Project
}

function isProject(v: unknown): v is Project {
  return Boolean(
    v &&
      typeof v === 'object' &&
      typeof (v as Project).id === 'string' &&
      typeof (v as Project).updatedAt === 'number' &&
      (v as Project).stages &&
      typeof (v as Project).stages === 'object',
  )
}

/** Pull every Throughline project row for the signed-in user (newest first). */
export async function fetchRows(): Promise<CloudRow[]> {
  const c = client()
  if (!c) return []
  const { data, error } = await c
    .from('projects')
    .select('id,data')
    .order('updated_at', { ascending: false })
  if (error) throw error
  const rows: CloudRow[] = []
  for (const r of (data ?? []) as Array<{ id: string; data: Record<string, unknown> | null }>) {
    const slice = r.data?.[TOOL_KEY]
    if (isProject(slice)) rows.push({ id: r.id, project: slice })
  }
  return rows
}

/**
 * Create or update the suite row backing a Throughline project. Pass the known
 * row uuid to update, or null to insert a fresh row. On update we read-merge-
 * write the `data` jsonb so a co-resident tool's slice in the same row is never
 * clobbered. Returns the row uuid (new or existing).
 */
export async function upsertRow(
  rowId: string | null,
  p: Project,
  userId: string,
): Promise<string> {
  const c = client()
  if (!c) throw new Error('cloud not configured')
  const stamp = new Date().toISOString()
  const name = p.title || 'Untitled study'

  if (rowId) {
    const { data: existing } = await c.from('projects').select('data').eq('id', rowId).single()
    const merged = { ...((existing?.data as Record<string, unknown>) || {}), [TOOL_KEY]: p }
    const { error } = await c
      .from('projects')
      .update({ name, data: merged, updated_at: stamp })
      .eq('id', rowId)
    if (error) throw error
    return rowId
  }

  const { data, error } = await c
    .from('projects')
    .insert({ name, user_id: userId, data: { [TOOL_KEY]: p }, updated_at: stamp })
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string }).id
}

/**
 * Remove a Throughline project from the cloud. If its row also holds another
 * tool's slice we only strip the `throughline` key; otherwise we delete the row.
 * Either way the user's other tools keep their data.
 */
export async function deleteRow(rowId: string): Promise<void> {
  const c = client()
  if (!c) return
  const { data: existing } = await c.from('projects').select('data').eq('id', rowId).single()
  const d = (existing?.data as Record<string, unknown>) || {}
  const others = Object.keys(d).filter((k) => k !== TOOL_KEY)
  if (others.length > 0) {
    const next = { ...d }
    delete next[TOOL_KEY]
    const { error } = await c
      .from('projects')
      .update({ data: next, updated_at: new Date().toISOString() })
      .eq('id', rowId)
    if (error) throw error
  } else {
    const { error } = await c.from('projects').delete().eq('id', rowId)
    if (error) throw error
  }
}
