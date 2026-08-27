import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { getErrorMessage, withTimeout } from '../lib/timeout'

type AuthValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  authError: string | null
  isAdmin: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)
const PROFILE_TIMEOUT_MS = 120000
const SIGN_OUT_TIMEOUT_MS = 30000

type AnyProfile = Profile & {
  created_at?: string
  updated_at?: string
}

function normalizeRole(role: unknown): Profile['role'] {
  const value = String(role || 'colaborador').trim().toLowerCase()
  const mapped = ({
    visitor: 'colaborador',
    visitante: 'colaborador',
    worker: 'colaborador',
    trabajador: 'colaborador',
    colaborador: 'colaborador',
    learner: 'colaborador',
    student: 'colaborador',
    estudiante: 'colaborador',
    usuario: 'colaborador',
    content_creator: 'creador_contenido',
    creator: 'creador_contenido',
    creador: 'creador_contenido',
    creador_contenido: 'creador_contenido',
    'creador de contenido': 'creador_contenido',
    reviewer: 'revisor',
    revisor: 'revisor',
    admin: 'admin',
    administrador: 'admin',
    super_admin: 'super_admin',
    superadmin: 'super_admin',
    'super admin': 'super_admin',
  } as Record<string, string>)[value] || 'colaborador'

  return mapped as Profile['role']
}

function fallbackProfileFromUser(user: User): Profile {
  const fullName = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name
    : user.email?.split('@')[0] || 'Colaborador EI'

  return {
    id: user.id,
    email: user.email ?? null,
    full_name: fullName,
    avatar_url: null,
    // Los roles de autorización nunca deben depender de user_metadata porque el usuario
    // puede modificarlo. app_metadata es administrado por el backend de Supabase.
    role: normalizeRole(user.app_metadata?.aula_ei_role),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const loadProfile = async (authUser?: User | null) => {
    const user = authUser ?? session?.user ?? null
    if (!user) {
      setProfile(null)
      return
    }

    const { data, error } = await withTimeout(
      supabase.rpc('get_my_profile').maybeSingle(),
      PROFILE_TIMEOUT_MS,
      'Supabase tardó demasiado cargando el perfil. Se usará perfil temporal mientras responde.'
    )

    if (error) throw error

    if (data) {
      const nextProfile = data as AnyProfile
      setProfile({
        id: nextProfile.id,
        email: nextProfile.email,
        full_name: nextProfile.full_name,
        avatar_url: nextProfile.avatar_url,
        role: normalizeRole(nextProfile.role),
      })
      return
    }

    setProfile(fallbackProfileFromUser(user))
    setAuthError('Tu sesión inició, pero el perfil no estaba sincronizado. Se cargó un perfil temporal.')
  }

  useEffect(() => {
    let active = true

    setLoading(true)
    setAuthError(null)

    supabase.auth.getSession()
      .then(async ({ data, error }) => {
        if (!active) return
        if (error) throw error
        setSession(data.session)
        if (data.session?.user) {
          await loadProfile(data.session.user).catch((profileError) => {
            console.warn('Aula EI: no fue posible cargar el perfil.', profileError)
            setProfile(fallbackProfileFromUser(data.session!.user))
            setAuthError(getErrorMessage(profileError, 'No fue posible cargar el perfil. Se usó perfil temporal.'))
          })
        } else {
          setProfile(null)
        }
      })
      .catch((error) => {
        if (!active) return
        console.warn('Aula EI: validación de sesión inicial falló.', error)
        setSession(null)
        setProfile(null)
        setAuthError(getErrorMessage(error, 'No fue posible validar la sesión.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    // Supabase procesa onAuthStateChange de forma síncrona. No se debe esperar aquí otra
    // operación de Supabase porque puede competir con el lock interno de Auth y bloquearse.
    // Diferimos la carga del perfil al siguiente turno del event loop.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return

      setSession(nextSession)
      setAuthError(null)

      if (nextSession?.user) {
        const nextUser = nextSession.user
        setTimeout(() => {
          if (!active) return
          void loadProfile(nextUser).catch((error) => {
            if (!active) return
            console.warn('Aula EI: error al actualizar perfil.', error)
            setProfile(fallbackProfileFromUser(nextUser))
            setAuthError(getErrorMessage(error, 'No fue posible actualizar el perfil. Se usó perfil temporal.'))
          })
        }, 0)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    authError,
    isAdmin: ['creador_contenido', 'revisor', 'admin', 'super_admin', 'content_creator', 'reviewer'].includes(profile?.role ?? ''),
    refreshProfile: () => loadProfile(session?.user ?? null),
    signOut: async () => {
      await withTimeout(
        supabase.auth.signOut(),
        SIGN_OUT_TIMEOUT_MS,
        'No fue posible cerrar sesión porque Supabase no respondió a tiempo.'
      )
    },
  }), [session, profile, loading, authError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return value
}
