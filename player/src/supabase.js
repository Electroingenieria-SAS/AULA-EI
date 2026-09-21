import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ipoidimevokogptydbvt.supabase.co',
  'sb_publishable_T2MmUM_SxiMAtGpp8mQ1NA_ZR6JWuwp',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
)

export async function signedAsset(path, ttl = 3600) {
  if (!path) return null
  const { data, error } = await supabase.storage.from('course-assets').createSignedUrl(path, ttl)
  if (error) throw error
  return data.signedUrl
}
