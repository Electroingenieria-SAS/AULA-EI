import { useEffect, useState } from 'react'
import { getError, supabase } from '../shared.js'

/** Job catalog and history-aware position updates, isolated from the user directory. */
export function useUserPositions({ setMessage, refresh, setWorkingId, setForm, setBusy, canChangePosition = false }) {
  const [jobPositions, setJobPositions] = useState([])
  useEffect(() => {
    let active = true
    supabase.from('job_positions').select('id,name,code,is_active').eq('is_active', true).order('name')
      .then(({ data, error }) => {
        if (!active) return
        if (error) setMessage(getError(error, 'No se pudo cargar el catálogo de cargos.'))
        else setJobPositions(data || [])
      })
    return () => { active = false }
  }, [])

  async function createJobPosition(name) {
    const cleaned = String(name || '').trim().replace(/\s+/g, ' ')
    if (cleaned.length < 3 || cleaned.length > 120) return setMessage('El nombre del cargo debe tener entre 3 y 120 caracteres.')
    const exists = jobPositions.find((job) => job.name.toLocaleLowerCase('es') === cleaned.toLocaleLowerCase('es'))
    if (exists) {
      setForm((current) => ({ ...current, job_position_id: exists.id }))
      setMessage('Seleccionamos el cargo existente.')
      return true
    }
    setBusy(true)
    try {
      const code = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0,70)
        + '_' + crypto.randomUUID().slice(0, 6).toUpperCase()
      const { data, error } = await supabase.from('job_positions')
        .insert({ name: cleaned, code, is_active: true }).select('id,name,code,is_active').single()
      if (error) throw error
      setJobPositions((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name, 'es')))
      setForm((current) => ({ ...current, job_position_id: data.id }))
      setMessage('Cargo registrado. Ya puedes crear el usuario.')
      return true
    } catch (error) {
      setMessage(getError(error, 'No se pudo registrar el cargo.'))
      return false
    } finally { setBusy(false) }
  }

  async function changePosition(person, positionId) {
    if (!canChangePosition || person.is_active === false) return
    const legacy = !person.onboarding_methodology_started_at
    if (legacy && !window.confirm('¿Registrar o corregir el cargo histórico de ' + person.name + '? Se conservarán sus cursos, matrículas, certificados y calificaciones sin asignación automática.')) return
    setWorkingId(person.id)
    try {
      const { error } = await supabase.rpc('admin_set_user_job_position', {
        p_user_id: person.id,
        p_position_id: positionId || null,
        p_notes: 'Actualización de cargo desde Usuarios y roles.',
      })
      if (error) throw error
      setMessage(legacy ? 'Cargo histórico actualizado sin cambiar capacitaciones ni certificados para ' + person.name + '.' : 'Cargo y formación actualizados para ' + person.name + '.')
      await refresh()
    } catch (error) {
      setMessage(getError(error, 'No se pudo modificar el cargo.'))
    } finally { setWorkingId(null) }
  }


  return { jobPositions, createJobPosition, changePosition }
}
