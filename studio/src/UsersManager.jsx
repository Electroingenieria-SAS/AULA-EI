import React, { useEffect, useMemo, useState } from 'react'
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
  SlidersHorizontal, UserCheck, UserMinus, UserPlus, Users, X,
} from 'lucide-react'
import { ROLE_LABELS, ROLE_RANK, getError, supabase } from './shared.js'

const ROLE_OPTIONS = ['colaborador', 'creador_contenido', 'revisor', 'admin', 'super_admin']
const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'colaborador' }
export default function UsersManager({ profile, profiles, enrollments = [], refresh, setMessage }) {
  const allowedRoles = profile.role === 'super_admin'
    ? ROLE_OPTIONS
    : ['colaborador', 'creador_contenido', 'revisor']

  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [workingId, setWorkingId] = useState(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [manageFilter, setManageFilter] = useState('all')
  const [rowSelection, setRowSelection] = useState({})
  const [sorting, setSorting] = useState([{ id: 'name', desc: false }])
  const [bulkRole, setBulkRole] = useState('colaborador')

  const canChangeRole = profile.role === 'super_admin'
  const canManage = (person) =>
    person.id !== profile.id &&
    ['admin', 'super_admin'].includes(profile.role) &&
    (ROLE_RANK[profile.role] || 0) > (ROLE_RANK[person.role] || 0)

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
      active_label: person.is_active === false ? 'Inactivo' : 'Activo',
      stats,
    }
  }), [profiles, enrollmentStats])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((person) => {
      const haystack = `${person.name} ${person.email || ''} ${person.role_label}`.toLowerCase()
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
        if (canChangeRole && person.id !== profile.id) {
          return <select className={'inline-role-select role-' + person.role} value={person.role} onChange={(event) => changeRole(person, event.target.value)}>
            {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
          </select>
        }
        return <RoleBadge role={person.role} />
      },
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
          {canManage(person) && <button
            className={person.is_active === false ? 'secondary-button compact' : 'danger-button compact'}
            disabled={workingId === person.id}
            onClick={() => toggleActive(person)}
          >
            {workingId === person.id && <Loader2 className="spin" size={14} />}
            {person.is_active === false ? 'Reactivar' : 'Desactivar'}
          </button>}
        </div>
      },
    },
  ], [profile.id, canChangeRole, workingId])

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
        },
      })
      if (error) throw new Error(String(data?.error || error.message || 'No fue posible crear el usuario.'))
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
    if (!canChangeRole) return setMessage('Solo un Super Admin puede cambiar roles.')
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
    if (!canChangeRole) return setMessage('Solo un Super Admin puede cambiar roles de forma masiva.')
    const targets = selectedRows.filter((person) => person.id !== profile.id && person.role !== bulkRole)
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
      ['Nombre', 'Correo', 'Rol', 'Estado', 'Capacitaciones activas', 'Completadas', 'Fecha creación'],
      ...source.map((person) => [
        person.name,
        person.email || '',
        ROLE_LABELS[person.role] || person.role,
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
      <div className="users-overview-head">
        <div>
          <span className="eyebrow">Usuarios y roles</span>
          <h2>Administra cuentas sin perder el contexto.</h2>
          <p>Busca, filtra, cambia permisos y gestiona accesos. Desactivar nunca elimina matrículas, progreso ni certificados.</p>
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
        <div className="search-field users-main-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, correo o rol…" /></div>
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
        {canChangeRole && <div className="user-bulk-role"><select value={bulkRole} onChange={(event) => setBulkRole(event.target.value)}>{ROLE_OPTIONS.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select><button className="secondary-button compact" onClick={bulkChangeRole} disabled={busy}>Cambiar rol</button></div>}
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
            </div>

            <div className="mobile-user-training">
              <span><strong>{person.stats.active}</strong><small>activas</small></span>
              <span><strong>{person.stats.completed}</strong><small>completadas</small></span>
              <span><strong>{person.stats.total}</strong><small>matrículas</small></span>
            </div>

            {canChangeRole && person.id !== profile.id && <label className="mobile-user-role">Rol
              <select value={person.role} onChange={(event) => changeRole(person, event.target.value)}>
                {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
              </select>
            </label>}

            <div className="mobile-user-actions">
              <button className="secondary-button compact" onClick={() => setDetailId(person.id)}><ChevronRight size={16} /> Ver detalle</button>
              {canManage(person) && <button
                className={person.is_active === false ? 'primary-button compact' : 'danger-button compact'}
                disabled={workingId === person.id}
                onClick={() => toggleActive(person)}
              >
                {workingId === person.id && <Loader2 className="spin" size={14} />}
                {person.is_active === false ? 'Reactivar' : 'Desactivar'}
              </button>}
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
      busy={busy}
      generatedPassword={generatedPassword}
      onSubmit={createUser}
      onClose={() => { if (!busy) { setCreateOpen(false); setGeneratedPassword(''); setForm(EMPTY_FORM) } }}
    />}

    {detailPerson && <UserDetailDrawer
      person={detailPerson}
      profile={profile}
      canManage={canManage(detailPerson)}
      canChangeRole={canChangeRole}
      working={workingId === detailPerson.id}
      onClose={() => setDetailId(null)}
      onToggle={() => toggleActive(detailPerson)}
      onRole={(role) => changeRole(detailPerson, role)}
    />}
  </div>
}

function MetricButton({ label, value, icon: Icon, active, onClick }) {
  return <button className={'user-metric-card ' + (active ? 'active' : '')} onClick={onClick}>
    <span><Icon size={18} /></span><div><strong>{value}</strong><small>{label}</small></div>
  </button>
}

function RoleBadge({ role }) {
  return <span className={'user-role-badge role-' + role}><ShieldCheck size={13} />{ROLE_LABELS[role] || role}</span>
}

function CreateUserModal({ form, setForm, allowedRoles, busy, generatedPassword, onSubmit, onClose }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="user-create-modal">
      <header><div><span className="eyebrow">Nuevo usuario</span><h2>Crear acceso a Aula EI</h2><p>La cuenta quedará obligada a cambiar la contraseña temporal en su primer ingreso.</p></div><button className="icon-button" onClick={onClose} disabled={busy}><X size={18} /></button></header>
      {!generatedPassword ? <form className="user-create-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label className="wide">Nombre completo<input autoFocus value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required /></label>
          <label className="wide">Correo electrónico<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label className="wide">Contraseña temporal<input type="text" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Déjala vacía para generarla automáticamente" /><small className="helper-text"><KeyRound size={12} /> Debe cumplir la política de seguridad del servidor si la escribes manualmente.</small></label>
          <label className="wide">Rol inicial<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{allowedRoles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label>
        </div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Cancelar</button><button className="primary-button" disabled={busy}>{busy ? <Loader2 className="spin" size={17} /> : <UserPlus size={17} />} {busy ? 'Creando…' : 'Crear usuario'}</button></div>
      </form> : <div className="created-user-success">
        <span className="success-icon"><Check size={24} /></span>
        <h3>Usuario creado correctamente</h3>
        <p>Comparte esta contraseña temporal por un canal seguro. El sistema solicitará cambiarla en el primer ingreso.</p>
        <div className="temporary-password-card"><strong>{generatedPassword}</strong><button className="secondary-button compact" onClick={() => navigator.clipboard?.writeText(generatedPassword)}><Copy size={15} /> Copiar</button></div>
        <button className="primary-button" onClick={onClose}>Cerrar</button>
      </div>}
    </section>
  </div>
}

function UserDetailDrawer({ person, profile, canManage, canChangeRole, working, onClose, onToggle, onRole }) {
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside className="user-detail-drawer">
      <header><div><span className="eyebrow">Detalle del usuario</span><h2>{person.name}</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></header>

      <div className="detail-profile-card">
        <span className="detail-avatar">{initials(person.name)}</span>
        <div><strong>{person.name}</strong><span>{person.email}</span><div><RoleBadge role={person.role} /><span className={'user-status-pill ' + (person.is_active === false ? 'inactive' : 'active')}>{person.is_active === false ? 'Inactivo' : 'Activo'}</span></div></div>
      </div>

      <div className="detail-stats-grid">
        <article><strong>{person.stats.total}</strong><span>Matrículas</span></article>
        <article><strong>{person.stats.active}</strong><span>Activas</span></article>
        <article><strong>{person.stats.completed}</strong><span>Completadas</span></article>
      </div>

      <section className="detail-section">
        <h3>Cuenta</h3>
        <dl><div><dt>Creada</dt><dd>{formatDate(person.created_at)}</dd></div><div><dt>Estado</dt><dd>{person.is_active === false ? 'Inactivo' : 'Activo'}</dd></div><div><dt>Rol</dt><dd>{ROLE_LABELS[person.role] || person.role}</dd></div></dl>
      </section>

      {person.stats.recent.length > 0 && <section className="detail-section">
        <h3>Formación reciente</h3>
        <div className="detail-training-list">{person.stats.recent.slice(0, 6).map((item) => <article key={item.id}><div><strong>{item.course?.title || 'Capacitación'}</strong><small>{item.status === 'completed' ? 'Completada' : item.status === 'in_progress' ? 'En progreso' : item.status === 'expired' ? 'Vencida' : item.status === 'cancelled' ? 'Cancelada' : 'Asignada'}</small></div><ChevronRight size={15} /></article>)}</div>
      </section>}

      {(canChangeRole || canManage) && <section className="detail-section detail-actions-section">
        <h3>Administración</h3>
        {canChangeRole && person.id !== profile.id && <label>Rol<select value={person.role} onChange={(event) => onRole(event.target.value)}>{ROLE_OPTIONS.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label>}
        {canManage && <button className={person.is_active === false ? 'primary-button' : 'danger-button'} disabled={working} onClick={onToggle}>{working && <Loader2 className="spin" size={16} />}{person.is_active === false ? 'Reactivar usuario' : 'Desactivar usuario'}</button>}
      </section>}
    </aside>
  </div>
}

function initials(value) {
  const words = String(value || 'U').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'U'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

function formatDate(value) {
  if (!value) return 'Sin registro'
  try { return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) } catch { return String(value) }
}

function csvCell(value) {
  const text = String(value ?? '')
  return '"' + text.replace(/"/g, '""') + '"'
}
