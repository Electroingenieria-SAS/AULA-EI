import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://ipoidimevokogptydbvt.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_T2MmUM_SxiMAtGpp8mQ1NA_ZR6JWuwp'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
