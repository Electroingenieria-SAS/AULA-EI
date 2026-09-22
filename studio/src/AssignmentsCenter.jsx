import React, { useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, CalendarClock, CheckCircle2,
  Download, Filter, Loader2, Search, Upload, UserCheck, UserMinus, Users, X,
} from 'lucide-react'
import { ASSIGNMENT_STATUS, ROLE_LABELS, chunks, dateLabel, getError, supabase } from './shared.js'

export default function AssignmentsCenter({ courses, profiles, enrollments, refresh, setMessage }) {
  const publishedCourses = useMemo(() => courses.filter((course) => course.status === 'published'), [courses])
  const [courseId, setCourseId] = useState(publishedCourses[0]?.id || '')
  const [courseQuery, setCourseQuery] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('active')
  const [statusFilter, setStatusFilter] = useState('all')
  const [rowSelection, setRowSelection] = useState({})
  const [sorting, setSorting] = useState([{ id: 'name', desc: false }])
  const [deadlinePolicy, setDeadlinePolicy] = useState('keep')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [bulkText, setBulkText] = useState('')

  useEffect(() => {
    if (!courseId && publishedCourses[0]?.id) setCourseId(publishedCourses[0].id)
  }, [courseId, publishedCourses])
  useEffect(() => setRowSelection({}), [courseId])

  const selectedCourse = courses.find((course) => course.id === courseId) || null
  const enrollmentMap = useMemo(() => {
    const map = new Map()
    enrollments.forEach((item) => {
      if (item.course_id === courseId) map.set(item.user_id, item)
    })
    return map
  }, [enrollments, courseId])

  const rows = useMemo(() => profiles.map((person) => {
    const enrollment = enrollmentMap.get(person.id) || null
    return {
      ...person,
      name: person.full_name || person.email || 'Sin nombre',
      enrollment,
      assignment_status: enrollment?.status || 'none',
    }
  }), [profiles, enrollmentMap])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (query && !((row.name + ' ' + (row.email || '')).toLowerCase().includes(query))) return false
      if (roleFilter !== 'all' && row.role !== roleFilter) return false
      if (activityFilter === 'active' && row.is_active === false) return false
      if (activityFilter === 'inactive' && row.is_active !== false) return false
      if (statusFilter !== 'all' && row.assignment_status !== statusFilter) return false
      return true
    })
  }, [rows, search, roleFilter, activityFilter, statusFilter])

  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => <input aria-label="Seleccionar página" type="checkbox" checked={table.getIsAllPageRowsSelected()} onChange={table.getToggleAllPageRowsSelectedHandler()} />,
      cell: ({ row }) => <input aria-label={'Seleccionar ' + row.original.name} type="checkbox" disabled={row.original.is_active === false} checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />,
      enableSorting: false,
    },
    {
      id: 'name',
      accessorFn: (row) => row.name,
      header: 'Persona',
      cell: ({ row }) => <div className="person-cell"><span className="avatar-mini">{row.original.name.slice(0, 2).toUpperCase()}</span><div><strong>{row.original.name}</strong><small>{row.original.email}</small></div></div>,
    },
    {
      id: 'role',
      accessorFn: (row) => ROLE_LABELS[row.role] || row.role,
      header: 'Rol',
      cell: ({ row }) => <span className="plain-chip">{ROLE_LABELS[row.original.role] || row.original.role}</span>,
    },
    {
      id: 'assignment_status',
      accessorFn: (row) => row.assignment_status,
      header: 'Estado',
      cell: ({ row }) => <StatusBadge status={row.original.assignment_status} />,
    },
    {
      id: 'due_at',
      accessorFn: (row) => row.enrollment?.due_at || '',
      header: 'Fecha límite',
      cell: ({ row }) => <span className="muted-cell">{dateLabel(row.original.enrollment?.due_at)}</span>,
    },
  ], [])

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { rowSelection, sorting },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getRowId: (row) => row.id,
    enableRowSelection: (row) => row.original.is_active !== false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  })

  const selectedRows = useMemo(() => rows.filter((row) => rowSelection[row.id]), [rows, rowSelection])
  const assignedCount = rows.filter((row) => !['none', 'cancelled', 'expired'].includes(row.assignment_status)).length
  const completedCount = rows.filter((row) => row.assignment_status === 'completed').length
  const unassignedCount = rows.filter((row) => ['none', 'cancelled', 'expired'].includes(row.assignment_status)).length

  const selectAllFiltered = () => {
    const next = {}
    filteredRows.forEach((row) => {
      if (row.is_active !== false) next[row.id] = true
    })
    setRowSelection(next)
  }

  const applyAssignments = async () => {
    if (!selectedCourse) return setMessage('Selecciona una capacitación publicada.')
    if (!selectedRows.length) return setMessage('Selecciona al menos una persona.')
    if (deadlinePolicy === 'set' && !dueDate) return setMessage('Selecciona la fecha límite que deseas aplicar.')
    setBusy(true)
    try {
      const payload = selectedRows.map((person) => {
        const current = enrollmentMap.get(person.id)
        let dueAt = current?.due_at || null
        if (deadlinePolicy === 'set') dueAt = dueDate
        if (deadlinePolicy === 'clear') dueAt = null
        return {
          course_id: selectedCourse.id,
          user_id: person.id,
          due_at: dueAt,
          status: current && !['cancelled', 'expired'].includes(current.status) ? current.status : 'assigned',
        }
      })
      for (const batch of chunks(payload, 250)) {
        const { error } = await supabase.from('enrollments').upsert(batch, { onConflict: 'course_id,user_id' })
        if (error) throw error
      }
      const created = selectedRows.filter((person) => {
        const current = enrollmentMap.get(person.id)
        return !current || ['cancelled', 'expired'].includes(current.status)
      }).length
      const preserved = selectedRows.length - created
      setMessage(String(selectedRows.length) + ' matrícula(s) procesadas: ' + String(created) + ' nueva(s) y ' + String(preserved) + ' existente(s) preservando su progreso.')
      setRowSelection({})
      await refresh()
    } catch (error) {
      setMessage(getError(error, 'No fue posible realizar la asignación masiva.'))
    } finally {
      setBusy(false)
    }
  }

  const cancelAssignments = async () => {
    const completedSkipped = selectedRows.filter((person) => enrollmentMap.get(person.id)?.status === 'completed').length
    const active = selectedRows.filter((person) => {
      const current = enrollmentMap.get(person.id)
      return current && !['cancelled', 'completed'].includes(current.status)
    })
    if (!active.length) {
      return setMessage(completedSkipped ? 'Las matrículas completadas no se cancelan desde este módulo para proteger su estado final.' : 'La selección no contiene matrículas activas para cancelar.')
    }
    if (!window.confirm('¿Cancelar ' + String(active.length) + ' matrícula(s)? Los avances existentes se conservarán.')) return
    setBusy(true)
    try {
      const ids = active.map((person) => enrollmentMap.get(person.id).id)
      for (const batch of chunks(ids, 200)) {
        const { error } = await supabase.from('enrollments').update({ status: 'cancelled' }).in('id', batch)
        if (error) throw error
      }
      setMessage(String(active.length) + ' matrícula(s) canceladas conservando sus avances.' + (completedSkipped ? ' ' + String(completedSkipped) + ' completada(s) quedaron intactas.' : ''))
      setRowSelection({})
      await refresh()
    } catch (error) {
      setMessage(getError(error, 'No fue posible cancelar las matrículas.'))
    } finally {
      setBusy(false)
    }
  }

  const selectFromEmails = () => {
    const emails = [...new Set((bulkText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((value) => value.toLowerCase()))]
    if (!emails.length) return setMessage('No encontré correos válidos en el texto importado.')
    const byEmail = new Map(profiles.map((person) => [String(person.email || '').toLowerCase(), person]))
    const next = { ...rowSelection }
    let matched = 0
    let inactive = 0
    let missing = 0
    emails.forEach((email) => {
      const person = byEmail.get(email)
      if (!person) {
        missing += 1
      } else if (person.is_active === false) {
        inactive += 1
      } else {
        next[person.id] = true
        matched += 1
      }
    })
    setRowSelection(next)
    setMessage(String(matched) + ' persona(s) seleccionada(s) desde la lista.' + (missing ? ' ' + String(missing) + ' correo(s) no encontrados.' : '') + (inactive ? ' ' + String(inactive) + ' cuenta(s) inactivas omitidas.' : ''))
  }

  const readFile = async (file) => {
    if (!file) return
    setBulkText(await file.text())
    setShowImport(true)
  }

  const downloadTemplate = () => {
    const blob = new Blob(['email\nusuario@ei.com.co\notro@ei.com.co\n'], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'plantilla-asignacion-aula-ei.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const matchingCourses = publishedCourses.filter((course) => course.title.toLowerCase().includes(courseQuery.toLowerCase()))

  return <div className="assignment-center">
    <section className="panel-card assignment-intro">
      <div className="section-title-row">
        <div><span className="eyebrow">Centro de asignaciones</span><h2>Asigna a muchas personas en pocos pasos.</h2><p>Busca, filtra, selecciona y matricula en lote sin reiniciar estados ni avances existentes.</p></div>
        <div className="assignment-summary-icon"><UserCheck size={30} /></div>
      </div>

      <div className="course-picker-grid">
        <div className="course-picker">
          <label>1. Capacitación publicada</label>
          <div className="search-field"><Search size={17} /><input value={courseQuery} onChange={(event) => setCourseQuery(event.target.value)} placeholder="Buscar capacitación…" /></div>
          <div className="course-option-list">
            {matchingCourses.slice(0, 10).map((course) => <button key={course.id} className={courseId === course.id ? 'selected' : ''} onClick={() => setCourseId(course.id)}>
              <span className="course-option-icon"><BookOpen size={17} /></span>
              <div><strong>{course.title}</strong><small>Aprobación {course.passing_score}%</small></div>
              {courseId === course.id && <CheckCircle2 size={18} />}
            </button>)}
            {!matchingCourses.length && <div className="empty-compact">No hay coincidencias.</div>}
          </div>
        </div>
        <div className="assignment-stats">
          <MiniMetric label="Usuarios" value={rows.length} icon={Users} />
          <MiniMetric label="Asignados" value={assignedCount} icon={UserCheck} />
          <MiniMetric label="Sin asignar" value={unassignedCount} icon={UserMinus} />
          <MiniMetric label="Completados" value={completedCount} icon={CheckCircle2} />
        </div>
      </div>
    </section>

    <section className="panel-card user-selector-panel">
      <div className="section-title-row compact-row">
        <div><span className="eyebrow">2. Personas</span><h3>{selectedCourse ? selectedCourse.title : 'Selecciona una capacitación'}</h3></div>
        <div className="toolbar-buttons">
          <button className="secondary-button compact" onClick={() => setShowImport((value) => !value)}><Upload size={16} /> Importar lista</button>
          <button className="secondary-button compact" onClick={downloadTemplate}><Download size={16} /> Plantilla</button>
        </div>
      </div>

      {showImport && <div className="import-box">
        <div><strong>Seleccionar por correos</strong><p>Pega correos, una lista de Excel/CSV o carga un archivo. Esto solo selecciona personas; la matrícula se confirma después.</p></div>
        <textarea value={bulkText} onChange={(event) => setBulkText(event.target.value)} placeholder={'correo1@ei.com.co\ncorreo2@ei.com.co'} />
        <div className="import-actions">
          <label className="file-button"><Upload size={16} /> Cargar CSV/TXT<input type="file" accept=".csv,.txt" onChange={(event) => readFile(event.target.files?.[0])} /></label>
          <button className="primary-button compact" onClick={selectFromEmails}>Seleccionar coincidencias</button>
        </div>
      </div>}

      <div className="filters-grid">
        <div className="search-field wide-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o correo…" /></div>
        <label className="filter-select"><Filter size={15} /><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">Todos los roles</option>{Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="filter-select"><Users size={15} /><select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}><option value="active">Solo activos</option><option value="all">Activos e inactivos</option><option value="inactive">Solo inactivos</option></select></label>
        <label className="filter-select"><UserCheck size={15} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Cualquier estado</option><option value="none">Sin asignar</option><option value="assigned">Asignada</option><option value="in_progress">En progreso</option><option value="completed">Completada</option><option value="expired">Vencida</option><option value="cancelled">Cancelada</option></select></label>
      </div>

      <div className="selection-toolbar">
        <div><strong>{selectedRows.length}</strong> seleccionada(s) · <span>{filteredRows.length} resultado(s)</span></div>
        <div><button className="text-action" onClick={selectAllFiltered}>Seleccionar todos los filtrados</button>{selectedRows.length > 0 && <button className="text-action danger" onClick={() => setRowSelection({})}>Limpiar selección</button>}</div>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id} onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined} className={header.column.getCanSort() ? 'sortable' : ''}>{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getIsSorted() === 'asc' ? <ArrowUp size={13} /> : header.column.getIsSorted() === 'desc' ? <ArrowDown size={13} /> : null}</th>)}</tr>)}</thead>
          <tbody>{table.getRowModel().rows.map((row) => <tr key={row.id} className={row.getIsSelected() ? 'selected-row' : row.original.is_active === false ? 'inactive-row' : ''}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody>
        </table>
        {!table.getRowModel().rows.length && <div className="table-empty">No hay usuarios que coincidan con los filtros.</div>}
      </div>

      <div className="pagination-bar">
        <span>Página {table.getState().pagination.pageIndex + 1} de {Math.max(1, table.getPageCount())}</span>
        <label>Filas <select value={table.getState().pagination.pageSize} onChange={(event) => table.setPageSize(Number(event.target.value))}>{[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
        <div><button className="icon-button" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><ArrowLeft size={17} /></button><button className="icon-button" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><ArrowRight size={17} /></button></div>
      </div>
    </section>

    {selectedRows.length > 0 && <section className="bulk-action-bar" aria-label="Acciones para personas seleccionadas">
      <div className="bulk-selection">
        <span>{selectedRows.length}</span>
        <div>
          <strong>{selectedRows.length === 1 ? 'Persona seleccionada' : 'Personas seleccionadas'}</strong>
          <small>{selectedCourse?.title || 'Sin capacitación seleccionada'}</small>
        </div>
        <button className="bulk-clear-selection" onClick={() => setRowSelection({})} disabled={busy} title="Limpiar selección"><X size={14} /> Limpiar</button>
      </div>

      <div className="deadline-controls">
        <div className="deadline-title"><CalendarClock size={16} /><span>Vencimiento</span></div>
        <label>
          <span>Política de fecha</span>
          <select value={deadlinePolicy} onChange={(event) => setDeadlinePolicy(event.target.value)}>
            <option value="keep">Conservar las existentes</option>
            <option value="set">Aplicar una fecha</option>
            <option value="clear">Dejar sin vencimiento</option>
          </select>
        </label>
        {deadlinePolicy === 'set' && <label>
          <span>Fecha</span>
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>}
      </div>

      <div className="bulk-buttons">
        <button className="secondary-button bulk-cancel-button" onClick={cancelAssignments} disabled={busy}><UserMinus size={17} /> Cancelar matrícula</button>
        <button className="primary-button bulk-apply-button" onClick={applyAssignments} disabled={busy}>{busy ? <Loader2 className="spin" size={17} /> : <UserCheck size={17} />} Asignar / actualizar</button>
      </div>
    </section>}
  </div>
}

function MiniMetric({ label, value, icon: Icon }) {
  return <article className="mini-metric"><span><Icon size={18} /></span><div><strong>{value}</strong><small>{label}</small></div></article>
}

function StatusBadge({ status }) {
  const [label, tone] = ASSIGNMENT_STATUS[status] || [status, 'neutral']
  return <span className={'status-badge ' + tone}>{label}</span>
}
