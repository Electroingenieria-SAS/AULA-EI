import React, { useMemo, useState } from 'react'
import { CheckCircle2, Copy, Loader2, Search, ShieldCheck, UserPlus, UserRoundCog } from 'lucide-react'
import { ROLE_LABELS, ROLE_RANK, getError, supabase } from './shared.js'

export default function UsersManager({ profile, profiles, refresh, setMessage }) {
  const allowedRoles = profile.role === 'super_admin'
    ? ['colaborador','creador_contenido','revisor','admin','super_admin']
    : ['colaborador','creador_contenido','revisor']
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'colaborador' })
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [workingId, setWorkingId] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return profiles.filter((person) => !query || ((person.full_name || '') + ' ' + (person.email || '')).toLowerCase().includes(query))
  }, [profiles, search])

  const canManage = (person) => person.id !== profile.id && ['admin','super_admin'].includes(profile.role) && (ROLE_RANK[profile.role] || 0) > (ROLE_RANK[person.role] || 0)
  const canChangeRole = profile.role === 'super_admin'

  const createUser = async (event) => {
    event.preventDefault()
    setBusy(true)
    setPassword('')
    try {
      const { data, error } = await supabase.functions.invoke('create-managed-user', {
        body: {
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          password: form.password.trim() || undefined,
          role: form.role,
        },
      })
      if (error) throw new Error(String(data?.error || error.message || 'No fue posible crear el usuario.'))
      if (data?.ok === false) throw new Error(String(data.error || 'No fue posible crear el usuario.'))
      setPassword(String(data?.temporary_password || form.password.trim() || ''))
      setForm({ full_name: '', email: '', password: '', role: 'colaborador' })
      setMessage('Usuario creado: ' + String(data?.user?.email || ''))
      await refresh()
    } catch (error) {
      setMessage(getError(error, 'No fue posible crear el usuario.'))
    } finally {
      setBusy(false)
    }
  }

  const changeRole = async (person, role) => {
    if (!canChangeRole) return setMessage('Solo un Super Admin puede cambiar roles.')
    const { error } = await supabase.rpc('set_user_role', { p_user_id: person.id, p_role: role })
    if (error) setMessage(error.message)
    else { setMessage('Rol actualizado.'); await refresh() }
  }

  const toggleActive = async (person) => {
    if (!canManage(person)) return setMessage('Solo puedes administrar usuarios con un nivel inferior al tuyo.')
    const reactivate = person.is_active === false
    const action = reactivate ? 'reactivar' : 'desactivar'
    if (!window.confirm('¿' + action.charAt(0).toUpperCase() + action.slice(1) + ' a ' + (person.full_name || person.email || 'este usuario') + '? Se conservarán matrículas, progreso y certificados.')) return
    setWorkingId(person.id)
    try {
      const { data, error } = await supabase.functions.invoke('delete-managed-user', { body: { user_id: person.id, active: reactivate } })
      if (error) throw new Error(String(data?.error || error.message || 'No fue posible actualizar el usuario.'))
      if (data?.ok === false) throw new Error(String(data.error || 'No fue posible actualizar el usuario.'))
      setMessage(String(data?.message || (reactivate ? 'Usuario reactivado.' : 'Usuario desactivado.')))
      await refresh()
    } catch (error) {
      setMessage(getError(error, 'No fue posible actualizar el usuario.'))
    } finally {
      setWorkingId(null)
    }
  }

  return <div className="two-column-layout users-layout">
    <section className="panel-card">
      <div className="section-title-row"><div><span className="eyebrow">Crear usuario</span><h2>Alta administrada</h2><p>La cuenta queda obligada a cambiar la contraseña temporal en el primer ingreso.</p></div><UserPlus size={27} /></div>
      <form className="stack-form" onSubmit={createUser}>
        <label>Nombre completo<input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required /></label>
        <label>Correo electrónico<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
        <label>Contraseña temporal<input type="text" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Opcional: si la dejas vacía se genera automáticamente" /><small className="helper-text">Si la escribes manualmente debe cumplir la política de seguridad del servidor.</small></label>
        <label>Rol inicial<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{allowedRoles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label>
        <button className="primary-button" disabled={busy}>{busy ? <Loader2 className="spin" size={17} /> : <UserPlus size={17} />} {busy ? 'Creando usuario…' : 'Crear usuario'}</button>
      </form>
      {password && <div className="password-box"><span><CheckCircle2 size={17} /> Contraseña temporal generada</span><strong>{password}</strong><button className="secondary-button compact" onClick={() => navigator.clipboard?.writeText(password)}><Copy size={16} /> Copiar</button></div>}
    </section>

    <section className="panel-card">
      <div className="section-title-row compact-row"><div><span className="eyebrow">Usuarios y roles</span><h2>{profiles.length} cuentas</h2><p>Desactivar conserva el historial; no elimina registros académicos.</p></div><UserRoundCog size={27} /></div>
      <div className="search-field users-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o correo…" /></div>
      <div className="users-table">
        {filtered.map((person) => <div className={'user-row ' + (person.is_active === false ? 'inactive' : '')} key={person.id}>
          <div className="person-cell"><span className="avatar-mini">{(person.full_name || person.email || 'U').slice(0,2).toUpperCase()}</span><div><strong>{person.full_name || 'Sin nombre'}</strong><small>{person.email}</small><span className={'account-state ' + (person.is_active === false ? 'off' : 'on')}>{person.is_active === false ? 'Inactivo' : 'Activo'}</span></div></div>
          <div className="user-role-actions">
            <label className="role-select"><ShieldCheck size={15} /><select value={person.role} disabled={!canChangeRole || person.id === profile.id} onChange={(event) => changeRole(person, event.target.value)}>{Object.entries(ROLE_LABELS).map(([role,label]) => <option key={role} value={role}>{label}</option>)}</select></label>
            {canManage(person) && <button className={person.is_active === false ? 'secondary-button compact' : 'danger-button compact'} disabled={workingId === person.id} onClick={() => toggleActive(person)}>{workingId === person.id ? <Loader2 className="spin" size={15} /> : null}{person.is_active === false ? 'Reactivar' : 'Desactivar'}</button>}
          </div>
        </div>)}
        {!filtered.length && <div className="table-empty">No hay usuarios que coincidan con la búsqueda.</div>}
      </div>
    </section>
  </div>
}
