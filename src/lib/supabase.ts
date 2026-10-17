import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True only when both public env vars are present. */
export const isBackendConfigured = Boolean(url && anon)

// Only the public anon key is ever used in the browser. Access is enforced by RLS.
export const supabase = isBackendConfigured ? createClient(url!, anon!) : null

export function requireSupabase() {
  if (!supabase) throw new Error('Backend not configured. See the README setup steps.')
  return supabase
}
