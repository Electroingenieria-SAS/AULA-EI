import { useCallback, useEffect, useState } from 'react'
import { ADMIN_ROLES, STAFF_ROLES, fetchAllPages, getError, supabase } from './shared.js'

export default function useStudioData(profile, tab) {
  const [message, setMessage] = useState('')
  const [courses, setCourses] = useState([])
  const [profiles, setProfiles] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loaded, setLoaded] = useState({ courses: false, profiles: false, enrollments: false })
  const [loading, setLoading] = useState({ courses: false, profiles: false, enrollments: false })
  const canAdmin = ADMIN_ROLES.has(profile?.role)

  const loadCourses = useCallback(async () => {
    if (!profile || !STAFF_ROLES.has(profile.role)) return
    setLoading((state) => ({ ...state, courses: true }))
    try {
      const result = await supabase
        .from('courses')
        .select('*')
        .order('updated_at', { ascending: false })
      if (result.error) throw result.error
      setCourses(result.data ?? [])
      setLoaded((state) => ({ ...state, courses: true }))
    } catch (error) {
      setMessage(getError(error, 'No fue posible cargar las capacitaciones.'))
    } finally {
      setLoading((state) => ({ ...state, courses: false }))
    }
  }, [profile?.id, profile?.role])

  const loadProfiles = useCallback(async () => {
    if (!profile || !ADMIN_ROLES.has(profile.role)) return
    setLoading((state) => ({ ...state, profiles: true }))
    try {
      const rows = await fetchAllPages((from, to) => supabase
        .from('profiles')
        .select('id,email,full_name,avatar_url,role,is_active,created_at,updated_at,job_position_id,supervisor_id')
        .order('full_name')
        .range(from, to))
      setProfiles(rows)
      setLoaded((state) => ({ ...state, profiles: true }))
    } catch (error) {
      setMessage(getError(error, 'No fue posible cargar los usuarios.'))
    } finally {
      setLoading((state) => ({ ...state, profiles: false }))
    }
  }, [profile?.id, profile?.role])

  const loadEnrollments = useCallback(async () => {
    if (!profile || !ADMIN_ROLES.has(profile.role)) return
    setLoading((state) => ({ ...state, enrollments: true }))
    try {
      const rows = await fetchAllPages((from, to) => supabase
        .from('enrollments')
        .select('id,course_id,user_id,due_at,status,created_at,updated_at,user:profiles!enrollments_user_id_fkey(id,full_name,email,role,is_active),course:courses(id,title,status)')
        .order('created_at', { ascending: false })
        .range(from, to))
      setEnrollments(rows)
      setLoaded((state) => ({ ...state, enrollments: true }))
    } catch (error) {
      setMessage(getError(error, 'No fue posible cargar las asignaciones.'))
    } finally {
      setLoading((state) => ({ ...state, enrollments: false }))
    }
  }, [profile?.id, profile?.role])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  useEffect(() => {
    if (!canAdmin) return
    if (['assignments', 'users', 'compliance'].includes(tab) && !loaded.profiles && !loading.profiles) {
      loadProfiles()
    }
    if (['assignments', 'users'].includes(tab) && !loaded.enrollments && !loading.enrollments) {
      loadEnrollments()
    }
  }, [
    tab,
    canAdmin,
    loaded.profiles,
    loaded.enrollments,
    loading.profiles,
    loading.enrollments,
    loadProfiles,
    loadEnrollments,
  ])

  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(() => setMessage(''), 7000)
    return () => window.clearTimeout(timeout)
  }, [message])

  const refreshCurrent = useCallback(async () => {
    const tasks = [loadCourses()]
    if (canAdmin && ['assignments', 'users', 'compliance'].includes(tab)) tasks.push(loadProfiles())
    if (canAdmin && ['assignments', 'users'].includes(tab)) tasks.push(loadEnrollments())
    await Promise.all(tasks)
  }, [tab, canAdmin, loadCourses, loadProfiles, loadEnrollments])

  const busy = loading.courses || loading.profiles || loading.enrollments

  return {
    canAdmin,
    message,
    setMessage,
    courses,
    profiles,
    enrollments,
    loaded,
    loading,
    busy,
    refreshCurrent,
  }
}
