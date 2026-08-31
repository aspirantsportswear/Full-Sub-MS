import { createClient } from '@supabase/supabase-js'

// We use the VARIABLE NAMES here, not the actual links
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// If you still see red on "env", add "as string" like this:
export const supabase = createClient(
  supabaseUrl as string, 
  supabaseAnonKey as string
)