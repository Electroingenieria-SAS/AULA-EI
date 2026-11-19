import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CheckCircle2, ChevronRight,
  Copy, Download, Filter, KeyRound, Loader2, MoreHorizontal, Search, ShieldCheck,
  SlidersHorizontal, Trash2, UserCheck, UserMinus, UserPlus, Users, X,
} from 'lucide-react'
import { ROLE_LABELS, ROLE_RANK, getError, supabase } from './shared.js'
import {
  CreateUserModal,
  DeleteUserModal,
  MetricButton,
  ResetPasswordModal,
  RoleBadge,
  UserDetailDrawer,
} from './users/UserPanels.jsx'
import { ROLE_OPTIONS, csvCell, formatDate, initials, getManagedFunctionError } from './users/user-utils.js'
import { useManagedPasswordReset } from './users/useManagedPasswordReset.js'

const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'colaborador', job_position_id: '' }
export default function UsersManager({ profile, profiles, enrollments = [], refresh, setMessage }) {
  const allowedRoles = profile.role === 'super_admin'
    ? ROLE_OPTIONS
    : ['colaborador', 'creador_contenido', 'revisor']

  const [createOpen, setCreateOpen] = useState(false)
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
  const [detailId, setDetailId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [resetResult, setResetResult] = useState(null)
  const deleteRequestRef = useRef(0)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletePreview, setDeletePreview] = useState(null)
  const [deleteChecking, setDeleteChecking] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [busy, setBusy] = useState(false)
  const [workingId, setWorkingId] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [manageFilter, setManageFilter] = useState('all')
  const [rowSelection, setRowSelection] = useState({})
  const [sorting, setSorting] = useState([{ id: 'name', desc: false }])
  const [bulkRole, setBulkRole] = useState('colaborador')

  const canChangeRole = ['admin', 'super_admin'].includes(profile.role)
  const canChangeRoleFor = (person) => canChangeRole && person.id !== profile.id &&
    (profile.role === 'super_admin' || !['admin','super_admin'].includes(person.role))
  const permittedRoleOptions = profile.role === 'super_admin' ? ROLE_OPTIONS : allowedRoles
  const canChangePosition = ['admin','super_admin'].includes(profile.role)
  const canManage = (person) =>
    person.id !== profile.id &&
    ['admin', 'super_admin'].includes(profile.role) &&
    (ROLE_RANK[profile.role] || 0) > (ROLE_RANK[person.role] || 0)
  const canDelete = (person) => canManage(person) && !['admin', 'super_admin'].includes(person.role)

  const { resetManagedPassword, resetBlocked, resetLabel, isResetBlocked, resetLabelFor } = useManagedPasswordReset({
    profile, canManage, workingId, setWorkingId, setResetResult, setMessage,
  })

  const enrollmentStats = useMemo(() => {
    const map = new Map()
    for (const item of enrollments) {
      const current = map.get(item.user_id) || { total: 0, active: 0, completed: 0, recent: [] }
      current.total += 1
      if (item.status === 'completed') current.completed += 1
      if (!['completed', 'cancelled'].includes(item.status)) current.active += 1
      current.recent.push(item)
      map.set(item.user_id, current)
    }
    for (const current of map.values()) {
      current.recent.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    }
    return map
  }, [enrollments])

  const rows = useMemo(() => profiles.map((person) => {
    const stats = enrollmentStats.get(person.id) || { total: 0, active: 0, completed: 0, recent: [] }
    return {
      ...person,
      name: person.full_name || person.email || 'Sin nombre',
      role_label: ROLE_LABELS[person.role] || person.role,
      position_label: jobPositions.find((job) => job.id === person.job_position_id)?.name || 'Sin cargo asignado',
      active_label: person.is_active === false ? 'Inactivo' : 'Activo',
      stats,
    }
  }), [profiles, enrollmentStats, jobPositions])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((person) => {
      const haystack = `${person.name} ${person.email || ''} ${person.role_label} ${person.position_label}`.toLowerCase()
      if (query && !haystack.includes(query)) return false
      if (roleFilter === 'admin_group' && !['admin', 'super_admin'].includes(person.role)) return false
      if (roleFilter !== 'all' && roleFilter !== 'admin_group' && person.role !== roleFilter) return false
      if (statusFilter === 'active' && person.is_active === false) return false
      if (statusFilter === 'inactive' && person.is_active !== false) return false
      if (manageFilter === 'manageable' && !canManage(person)) return false
      return true
    })
  }, [rows, search, roleFilter, statusFilter, manageFilter])

  const metrics = useMemo(() => ({
    total: profiles.length,
    active: profiles.filter((person) => person.is_active !== false).length,
    inactive: profiles.filter((person) => person.is_active === false).length,
    admins: profiles.filter((person) => ['admin', 'super_admin'].includes(person.role)).length,
    collaborators: profiles.filter((person) => person.role === 'colaborador').length,
  }), [profiles])

  const detailPerson = rows.find((person) => person.id === detailId) || null

  useEffect(() => {
    if (detailId && !detailPerson) setDetailId(null)
  }, [detailId, detailPerson])

  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => <input aria-label="Seleccionar página" type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />,
      cell: ({ row }) => <input aria-label={'Seleccionar ' + row.original.name} type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />,
      enableSorting: false,
    },
    {
      id: 'name',
      accessorFn: (row) => row.name,
      header: 'Usuario',
      cell: ({ row }) => <button className="user-identity-button" onClick={() => setDetailId(row.original.id)}>
        <span className="avatar-mini">{initials(row.original.name)}</span>
        <span><strong>{row.original.name}</strong><small>{row.original.email}</small></span>
      </button>,
    },
    {
      id: 'role',
      accessorFn: (row) => row.role_label,
      header: 'Rol',
      cell: ({ row }) => {
        const person = row.original
        if (canChangeRoleFor(person)) {
          return <select className={'inline-role-select role-' + person.role} value={person.role} onChange={(event) => changeRole(person, event.target.value)}>
            {permittedRoleOptions.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
          </select>
        }
        return <RoleBadge role={person.role} />
      },
    },
    {
      id: 'position',
      accessorFn: (row) => row.position_label,
      header: 'Cargo',
      cell: ({ row }) => <span className="muted-cell">{row.original.position_label}</span>,
    },
    {
      id: 'status',
      accessorFn: (row) => row.active_label,
      header: 'Estado',
      cell: ({ row }) => <span className={'user-status-pill ' + (row.original.is_active === false ? 'inactive' : 'active')}>{row.original.is_active === false ? 'Inactivo' : 'Activo'}</span>,
    },
    {
      id: 'training',
      accessorFn: (row) => row.stats.total,
      header: 'Formación',
      cell: ({ row }) => <div className="training-summary"><strong>{row.original.stats.active}</strong><span>activas</span><small>{row.original.stats.completed} completadas</small></div>,
    },
    {
      id: 'created_at',
      accessorFn: (row) => row.created_at || '',
      header: 'Creado',
      cell: ({ row }) => <span className="muted-cell">{formatDate(row.original.created_at)}</span>,
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const person = row.original
        return <div className="user-row-actions">
          <button className="icon-button" title="Ver detalle" onClick={() => setDetailId(person.id)}><ChevronRight size={17} /></button>
          {canManage(person) && person.is_active !== false && <button
            className="icon-button"
            title={resetLabelFor(person)}
             disabled={Boolean(workingId) || isResetBlocked(person)}
            onClick={() => resetManagedPassword(person)}
          ><KeyRound size={16} /></button>}
          {canManage(person) && <button
            className={person.is_active === false ? 'secondary-button compact' : 'danger-button compact'}
            disabled={workingId === person.id}
            onClick={() => toggleActive(person)}
          >
            {workingId === person.id && <Loader2 className="spin" size={14} />}
            {person.is_active === false ? 'Reactivar' : 'Desactivar'}
          </button>}
          {canDelete(person) && <button type="button" className="icon-button user-delete-icon" title="Eliminar usuario" aria-label={'Eliminar usuario ' + person.name} disabled={workingId === person.id} onClick={() => openDelete(person)}><Trash2 size={16} /></button>}
        </div>
      },
    },
  ], [profile.id, profile.role, canChangeRole, workingId, jobPositions])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { rowSelection, sorting },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  })

  useEffect(() => {
    table.setPageIndex(0)
  }, [search, roleFilter, statusFilter, manageFilter])

  const selectedRows = useMemo(() => rows.filter((row) => rowSelection[row.id]), [rows, rowSelection])
  const manageableSelected = selectedRows.filter((person) => canManage(person))

  const createUser = async (event) => {
    event.preventDefault()
    setBusy(true)
    setGeneratedPassword('')
    try {
      const { data, error } = await supabase.functions.invoke('create-managed-user', {
        body: {
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          password: form.password.trim() || undefined,
          role: form.role,
          job_position_id: form.job_position_id,
        },
      })
      if (error) throw new Error(await getManagedFunctionError(error, data, 'No fue posible crear el usuario.'))
      if (data?.ok === false) throw new Error(String(data.error || 'No fue posible crear el usuario.'))
      const password = String(data?.temporary_password || form.password.trim() || '')
      setGeneratedPassword(password)
      setForm(EMPTY_FORM)
      setMessage('Usuario creado: ' + String(data?.user?.email || ''))
      await refresh()
    } catch (error) {
      setMessage(getError(error, 'No fue posible crear el usuario.'))
    } finally {
      setBusy(false)
    }
  }

  async function changeRole(person, role) {
    if (!canChangeRoleFor(person)) return setMessage('No tienes permiso para cambiar este rol.')
    if (person.id === profile.id) return setMessage('No puedes modificar tu propio rol desde este módulo.')
    setWorkingId(person.id)
    try {
      const { error } = await supabase.rpc('set_user_role', { p_user_id: person.id, p_role: role })
      if (error) throw error
      setMessage('Rol actualizado para ' + person.name + '.')
      await refresh()
    } catch (error) {
      setMessage(getError(error, 'No fue posible actualizar el rol.'))
    } finally {
      setWorkingId(null)
    }
  }

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
    setWorkingId(person.id)
    try {
      const { error } = await supabase.rpc('admin_set_user_job_position', {
        p_user_id: person.id,
        p_position_id: positionId || null,
        p_notes: 'Actualización de cargo desde Usuarios y roles.',
      })
      if (error) throw error
      setMessage('Cargo actualizado y formación vinculada para ' + person.name + '.')
      await refresh()
    } catch (error) {
      setMessage(getError(error, 'No se pudo modificar el cargo.'))
    } finally { setWorkingId(null) }
  }

  async function setActiveState(person, active) {
    const { data, error } = await supabase.functions.invoke('delete-managed-user', { body: { user_id: person.id, active } })
    if (error) throw new Error(String(data?.error || error.message || 'No fue posible actualizar el usuario.'))
    if (data?.ok === false) throw new Error(String(data.error || 'No fue posible actualizar el usuario.'))
    return data
  }

  const toggleActive = async (person) => {
    if (!canManage(person)) return setMessage('Solo puedes administrar usuarios con un nivel inferior al tuyo.')
    const reactivate = person.is_active === false
    const action = reactivate ? 'reactivar' : 'desactivar'
    if (!window.confirm('¿' + action.charAt(0).toUpperCase() + action.slice(1) + ' a ' + person.name + '? Se conservarán matrículas, progreso y certificados.')) return
    setWorkingId(person.id)
    try {
      const data = await setActiveState(person, reactivate)
      setMessage(String(data?.message || (reactivate ? 'Usuario reactivado.' : 'Usuario desactivado.')))
      await refresh()
    } catch (error) {
      setMessage(getError(error, 'No fue posible actualizar el usuario.'))
    } finally {
      setWorkingId(null)
    }
  }


  async function openDelete(person) {
    if (!canDelete(person)) return setMessage('Cuenta protegida.')
    if (workingId || deleteBusy) return
    const requestId = ++deleteRequestRef.current
    setDeleteTarget(person)
    setDeletePreview(null)
    setDeleteError('')
    setDeleteChecking(true)
    try {
      const { data, error } = await supabase.functions.invoke('delete-managed-user', {
        body: { action: 'preview_delete', user_id: person.id },
      })
      if (error) throw new Error(await getManagedFunctionError(error, data, 'No se pudo validar la eliminación.'))
      if (data?.ok !== true) throw new Error(String(data?.error || 'No se pudo validar la eliminación.'))
      if (requestId === deleteRequestRef.current) setDeletePreview(data)
    } catch (error) {
      if (requestId === deleteRequestRef.current) setDeleteError(getError(error, 'No se pudo comprobar el historial del usuario.'))
    } finally {
      if (requestId === deleteRequestRef.current) setDeleteChecking(false)
    }
  }

  async function confirmDelete(justification) {
    const person = deleteTarget
    if (!person || !canDelete(person) || !deletePreview?.can_delete || deleteBusy || workingId) return
    setDeleteBusy(true)
    setWorkingId(person.id)
    setDeleteError('')
    try {
      const { data, error } = await supabase.functions.invoke('delete-managed-user', {
        body: { action: 'delete', user_id: person.id,
          confirmation_email: person.email, confirmation_text: 'ELIMINAR', justification },
      })
      if (error) throw new Error(await getManagedFunctionError(error, data, 'No se pudo eliminar el usuario.'))
      if (data?.ok !== true || data.deleted !== true) throw new Error(String(data?.error || 'No se confirmó la eliminación.'))
      setDeleteTarget(null)
      setDetailId(null)
      setRowSelection((selected) => { const next = { ...selected }; delete next[person.id]; return next })
      setMessage(String(data.message || 'Cuenta eliminada definitivamente.'))
      await refresh()
    } catch (error) {
      setDeleteError(getError(error, 'No se pudo eliminar el usuario.'))
    } finally {
      setDeleteBusy(false)
      setWorkingId(null)
    }
  }

  const bulkActiveState = async (active) => {
    const targets = manageableSelected.filter((person) => (person.is_active !== false) !== active)
    if (!targets.length) return setMessage('No hay usuarios gestionables en la selección que requieran ese cambio.')
    const action = active ? 'reactivar' : 'desactivar'
    if (!window.confirm('¿' + action.charAt(0).toUpperCase() + action.slice(1) + ' ' + targets.length + ' usuario(s)? El historial académico se conservará.')) return
    setBusy(true)
    let success = 0
    const failed = []
    for (const person of targets) {
      try {
        await setActiveState(person, active)
        success += 1
      } catch {
        failed.push(person.name)
      }
    }
    setBusy(false)
    setRowSelection({})
    await refresh()
    setMessage(success + ' usuario(s) actualizados.' + (failed.length ? ' ' + failed.length + ' no pudieron modificarse.' : ''))
  }

  const bulkChangeRole = async () => {
    if (!canChangeRole) return setMessage('Solo los administradores pueden cambiar roles.')
    const targets = selectedRows.filter((person) => canChangeRoleFor(person) && person.role !== bulkRole)
    if (!targets.length) return setMessage('La selección no contiene usuarios que requieran ese cambio de rol.')
    if (!window.confirm('¿Cambiar el rol de ' + targets.length + ' usuario(s) a ' + ROLE_LABELS[bulkRole] + '?')) return
    setBusy(true)
    let success = 0
    let failed = 0
    for (const person of targets) {
      const { error } = await supabase.rpc('set_user_role', { p_user_id: person.id, p_role: bulkRole })
      if (error) failed += 1
      else success += 1
    }
    setBusy(false)
    setRowSelection({})
    await refresh()
    setMessage(success + ' rol(es) actualizados.' + (failed ? ' ' + failed + ' cambio(s) fueron rechazados por las reglas de seguridad.' : ''))
  }

  const selectAllFiltered = () => {
    const next = {}
    filtered.forEach((person) => { next[person.id] = true })
    setRowSelection(next)
  }

  const exportUsers = () => {
    const source = selectedRows.length ? selectedRows : filtered
    const csv = [
      ['Nombre', 'Correo', 'Rol', 'Cargo', 'Estado', 'Capacitaciones activas', 'Completadas', 'Fecha creación'],
      ...source.map((person) => [
        person.name,
        person.email || '',
        ROLE_LABELS[person.role] || person.role,
        person.position_label,
        person.is_active === false ? 'Inactivo' : 'Activo',
        person.stats.active,
        person.stats.completed,
        formatDate(person.created_at),
      ]),
    ].map((row) => row.map(csvCell).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'usuarios-aula-ei.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setSearch('')
    setRoleFilter('all')
    setStatusFilter('all')
    setManageFilter('all')
  }

  return <div className="users-center">
    <section className="panel-card users-overview">
      {resetBlocked && <p className="helper-text" role="status" aria-live="polite">
        Por seguridad, los restablecimientos están temporalmente limitados. {resetLabel}
      </p>}
      <div className="users-overview-head">
        <div>
          <span className="eyebrow">Usuarios y roles</span>
          <h2>Administra cuentas sin perder el contexto.</h2>
          <p>Gestiona accesos. Eliminar exige motivo y no permite borrar administradores.</p>
        </div>
        <button className="primary-button create-user-button" onClick={() => { setGeneratedPassword(''); setCreateOpen(true) }}><UserPlus size={18} /> Crear usuario</button>
      </div>

      <div className="user-metrics-grid">
        <MetricButton label="Total" value={metrics.total} icon={Users} active={statusFilter === 'all' && roleFilter === 'all'} onClick={() => { setStatusFilter('all'); setRoleFilter('all') }} />
        <MetricButton label="Activos" value={metrics.active} icon={UserCheck} active={statusFilter === 'active'} onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')} />
        <MetricButton label="Inactivos" value={metrics.inactive} icon={UserMinus} active={statusFilter === 'inactive'} onClick={() => setStatusFilter(statusFilter === 'inactive' ? 'all' : 'inactive')} />
        <MetricButton label="Administradores" value={metrics.admins} icon={ShieldCheck} active={roleFilter === 'admin_group'} onClick={() => setRoleFilter(roleFilter === 'admin_group' ? 'all' : 'admin_group')} />
        <MetricButton label="Colaboradores" value={metrics.collaborators} icon={CheckCircle2} active={roleFilter === 'colaborador'} onClick={() => setRoleFilter(roleFilter === 'colaborador' ? 'all' : 'colaborador')} />
      </div>
    </section>

    <section className="panel-card users-directory">
      <div className="users-toolbar">
        <div className="search-field users-main-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo, rol o cargo…" /></div>
        <label className="filter-select"><ShieldCheck size={15} /><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="all">Todos los roles</option>
          <option value="admin_group">Administradores</option>
          {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
        </select></label>
        <label className="filter-select"><UserCheck size={15} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option>
        </select></label>
        <label className="filter-select"><SlidersHorizontal size={15} /><select value={manageFilter} onChange={(event) => setManageFilter(event.target.value)}>
          <option value="all">Todos los permisos</option><option value="manageable">Gestionables por mí</option>
        </select></label>
        <button className="secondary-button compact users-clear-button" onClick={clearFilters}>Limpiar</button>
      </div>

      <div className="users-directory-meta">
        <div><strong>{filtered.length}</strong> resultado(s){selectedRows.length ? <span> · {selectedRows.length} seleccionado(s)</span> : null}</div>
        <div className="toolbar-buttons">
          <button className="text-action" onClick={selectAllFiltered}>Seleccionar todos los filtrados</button>
          {selectedRows.length > 0 && <button className="text-action danger" onClick={() => setRowSelection({})}>Limpiar selección</button>}
          <button className="secondary-button compact" onClick={exportUsers}><Download size={15} /> Exportar</button>
        </div>
      </div>

      {selectedRows.length > 0 && <div className="user-bulk-bar">
        <div className="bulk-selection"><span>{selectedRows.length}</span><div><strong>usuarios seleccionados</strong><small>{manageableSelected.length} gestionables por tu rol</small></div></div>
        {canChangeRole && <div className="user-bulk-role"><select value={bulkRole} onChange={(event) => setBulkRole(event.target.value)}>{permittedRoleOptions.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select><button className="secondary-button compact" onClick={bulkChangeRole} disabled={busy}>Cambiar rol</button></div>}
        <div className="bulk-buttons"><button className="secondary-button compact" onClick={() => bulkActiveState(true)} disabled={busy}><UserCheck size={15} /> Reactivar</button><button className="danger-button compact" onClick={() => bulkActiveState(false)} disabled={busy}><UserMinus size={15} /> Desactivar</button></div>
      </div>}

      <div className="data-table-wrap users-data-wrap desktop-data-view">
        <table className="data-table users-data-table">
          <thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id} onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined} className={header.column.getCanSort() ? 'sortable' : ''}>
            {flexRender(header.column.columnDef.header, header.getContext())}
            {header.column.getIsSorted() === 'asc' ? <ArrowUp size={13} /> : header.column.getIsSorted() === 'desc' ? <ArrowDown size={13} /> : null}
          </th>)}</tr>)}</thead>
          <tbody>{table.getRowModel().rows.map((row) => <tr key={row.id} className={(row.getIsSelected() ? 'selected-row ' : '') + (row.original.is_active === false ? 'inactive-row' : '')}>
            {row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
          </tr>)}</tbody>
        </table>
      </div>

      <div className="mobile-user-list mobile-data-view">
        {table.getRowModel().rows.map((row) => {
          const person = row.original
          return <article key={person.id} className={'mobile-user-card ' + (person.is_active === false ? 'is-inactive' : '')}>
            <div className="mobile-user-card-head">
              <button className="mobile-user-identity" onClick={() => setDetailId(person.id)}>
                <span className="avatar-mini">{initials(person.name)}</span>
                <span><strong>{person.name}</strong><small>{person.email || 'Sin correo'}</small></span>
              </button>
              <input aria-label={'Seleccionar ' + person.name} type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
            </div>

            <div className="mobile-user-card-meta">
              <span className={'user-status-pill ' + (person.is_active === false ? 'inactive' : 'active')}>{person.is_active === false ? 'Inactivo' : 'Activo'}</span>
              <RoleBadge role={person.role} />
              <span className="muted-cell">{person.position_label}</span>
            </div>

            <div className="mobile-user-training">
              <span><strong>{person.stats.active}</strong><small>activas</small></span>
              <span><strong>{person.stats.completed}</strong><small>completadas</small></span>
              <span><strong>{person.stats.total}</strong><small>matrículas</small></span>
            </div>

            {canChangeRoleFor(person) && <label className="mobile-user-role">Rol
              <select value={person.role} onChange={(event) => changeRole(person, event.target.value)}>
                {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
              </select>
            </label>}

            <div className="mobile-user-actions">
              <button className="secondary-button compact" onClick={() => setDetailId(person.id)}><ChevronRight size={16} /> Ver detalle</button>
              {canManage(person) && person.is_active !== false && <button className="secondary-button compact" disabled={Boolean(workingId) || isResetBlocked(person)} title={resetLabelFor(person)} onClick={() => resetManagedPassword(person)}><KeyRound size={15} /> Contraseña</button>}
              {canManage(person) && <button
                className={person.is_active === false ? 'primary-button compact' : 'danger-button compact'}
                disabled={workingId === person.id}
                onClick={() => toggleActive(person)}
              >
                {workingId === person.id && <Loader2 className="spin" size={14} />}
                {person.is_active === false ? 'Reactivar' : 'Desactivar'}
              </button>}
              {canDelete(person) && <button className="danger-button compact user-delete-action" type="button" disabled={workingId === person.id} onClick={() => openDelete(person)}><Trash2 size={15} /> Eliminar</button>}
            </div>
          </article>
        })}
      </div>

      {!table.getRowModel().rows.length && <div className="users-empty-state"><Search size={28} /><strong>No encontramos usuarios</strong><span>Prueba cambiando la búsqueda o limpiando los filtros.</span><button className="secondary-button compact" onClick={clearFilters}>Limpiar filtros</button></div>}

      <div className="pagination-bar users-pagination">
        <span>Página {table.getState().pagination.pageIndex + 1} de {Math.max(1, table.getPageCount())}</span>
        <label>Filas <select value={table.getState().pagination.pageSize} onChange={(event) => table.setPageSize(Number(event.target.value))}>{[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
        <div><button className="icon-button" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><ArrowLeft size={17} /></button><button className="icon-button" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><ArrowRight size={17} /></button></div>
      </div>
    </section>

    {createOpen && <CreateUserModal
      form={form}
      setForm={setForm}
      allowedRoles={allowedRoles}
      jobPositions={jobPositions}
      onCreatePosition={createJobPosition}
      busy={busy}
      generatedPassword={generatedPassword}
      onSubmit={createUser}
      onClose={() => { if (!busy) { setCreateOpen(false); setGeneratedPassword(''); setForm(EMPTY_FORM) } }}
    />}

    {detailPerson && <UserDetailDrawer
      person={detailPerson}
      profile={profile}
      canManage={canManage(detailPerson)}
      canChangeRole={canChangeRoleFor(detailPerson)}
      allowedRoles={permittedRoleOptions}
      positions={jobPositions}
      canChangePosition={canChangePosition}
      onPosition={(positionId) => changePosition(detailPerson, positionId)}
      working={workingId === detailPerson.id}
       resetDisabled={Boolean(workingId) || isResetBlocked(detailPerson)}
       resetTitle={resetLabelFor(detailPerson)}
      onClose={() => setDetailId(null)}
      onToggle={() => toggleActive(detailPerson)}
      onReset={() => resetManagedPassword(detailPerson)}
      onDelete={() => openDelete(detailPerson)}
      canDelete={canDelete(detailPerson)}
      onRole={(role) => changeRole(detailPerson, role)}
    />}

    {deleteTarget && <DeleteUserModal
      key={deleteTarget.id}
      person={deleteTarget}
      preview={deletePreview}
      checking={deleteChecking}
      busy={deleteBusy}
      error={deleteError}
      onClose={() => { if (!deleteBusy) { deleteRequestRef.current++; setDeleteTarget(null); setDeletePreview(null); setDeleteError('') } }}
      onRetry={() => openDelete(deleteTarget)}
      onConfirm={confirmDelete}
    />}

    {resetResult && <ResetPasswordModal
      person={resetResult.person}
      password={resetResult.password}
      onClose={() => setResetResult(null)}
    />}
  </div>
}

