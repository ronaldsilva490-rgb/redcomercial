import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — exporting safe stub')
  const stub = {
    auth: {
      async signInWithPassword() {
        return { data: null, error: new Error('Supabase client not configured') }
      },
      async signOut() {
        return { error: new Error('Supabase client not configured') }
      },
      async refreshSession() {
        return { data: null, error: new Error('Supabase client not configured') }
      }
    }
  }
  export const supabase = stub
  export default supabase
} else {
  export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  export default supabase
}
