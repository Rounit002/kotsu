import type { SupabaseClient } from '@supabase/supabase-js'

let client: Promise<SupabaseClient> | undefined

/**
 * The connection to the database. Its code is fetched only when first asked for, in the
 * background, so opening the app never waits on it.
 *
 * Both values are public by design — they ship to every browser — and are safe because the
 * database only ever hands a person their own rows (row-level security, see supabase/migrations).
 * The project's secret key has no place here.
 */
export const database = () =>
  (client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  ))
