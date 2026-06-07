import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type AppRole = 'visitor' | 'worker' | 'admin' | 'super_admin'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: 'Faltan variables de entorno de Supabase en la función.' }, 500)
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'Sesión requerida.' }, 401)

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: authData, error: authError } = await callerClient.auth.getUser()
    if (authError || !authData.user) return json({ error: 'Sesión inválida.' }, 401)

    const { data: callerProfile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !callerProfile) return json({ error: 'No se encontró el perfil del usuario autenticado.' }, 403)

    const callerRole = callerProfile.role as AppRole
    if (!['admin', 'super_admin'].includes(callerRole)) {
      return json({ error: 'No tienes permiso para crear usuarios.' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const fullName = String(body.full_name ?? '').trim()
    const role = String(body.role ?? 'visitor') as AppRole

    if (!email || !email.includes('@')) return json({ error: 'Correo inválido.' }, 400)
    if (!fullName) return json({ error: 'El nombre completo es obligatorio.' }, 400)
    if (password.length < 6) return json({ error: 'La contraseña temporal debe tener mínimo 6 caracteres.' }, 400)

    const allowedRoles: AppRole[] = callerRole === 'super_admin'
      ? ['visitor', 'worker', 'admin']
      : ['visitor', 'worker']

    if (!allowedRoles.includes(role)) {
      return json({ error: 'Tu rol no permite crear usuarios con ese perfil.' }, 403)
    }

    const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (createError || !created.user) {
      return json({ error: createError?.message ?? 'No fue posible crear el usuario.' }, 400)
    }

    const { error: profileUpsertError } = await serviceClient
      .from('profiles')
      .upsert({
        id: created.user.id,
        email,
        full_name: fullName,
        role,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (profileUpsertError) return json({ error: profileUpsertError.message }, 400)

    await serviceClient.rpc('write_audit_log', {
      p_action: 'create_user',
      p_entity_type: 'profile',
      p_entity_id: created.user.id,
      p_metadata: { email, role, created_by_role: callerRole },
    })

    return json({ ok: true, user_id: created.user.id })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Error inesperado creando usuario.' }, 500)
  }
})
