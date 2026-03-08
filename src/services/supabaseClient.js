import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
} else {
  console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — using safe stub')
  supabase = {
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
}

export { supabase }
export default supabase
