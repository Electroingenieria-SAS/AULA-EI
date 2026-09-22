import React, { useEffect, useMemo, useState } from 'react'
import {
  Award, BadgeCheck, BookOpen, CalendarDays, CheckCircle2, ChevronRight,
  ClipboardCopy, Download, ExternalLink, FileCheck2, GraduationCap, Loader2,
  RefreshCw, Search, Share2, Users, X,
} from 'lucide-react'
import { getError, supabase } from './shared.js'
import { appUrl } from '../../src/paths.js'

export default function CertificatesManager({ setMessage }) {
  const [ranking, setRanking] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(null)
  const [view, setView] = useState('issued')
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState('all')
  const [sort, setSort] = useState('rank')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(0)
  const [detailCode, setDetailCode] = useState(null)
  const [pendingSearch, setPendingSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [rankingResult, pendingResult] = await Promise.all([
        supabase.rpc('admin_certificate_ranking'),
        supabase.rpc('admin_completed_without_certificate'),
      ])
      if (rankingResult.error) throw rankingResult.error
      if (pendingResult.error) throw pendingResult.error
      setRanking(rankingResult.data || [])
      setPending(pendingResult.data || [])
    } catch (error) {
      setMessage(getError(error, 'No fue posible cargar los certificados.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => { setPage(0) }, [search, courseFilter, scoreFilter, sort, pageSize, view])

  const issuedRows = useMemo(() => ranking.map((item, index) => ({
    ...item,
    position: index + 1,
    person: item.user_full_name || item.user_email || 'Sin nombre',
    course: item.course_title || 'Capacitación',
    score_number: Number(item.score ?? 0),
    issued_time: item.issued_at ? new Date(item.issued_at).getTime() : 0,
  })), [ranking])

  const courses = useMemo(() => [...new Set(issuedRows.map((item) => item.course).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), [issuedRows])

  const filteredIssued = useMemo(() => {
    const query = search.trim().toLowerCase()
    const result = issuedRows.filter((item) => {
      const haystack = `${item.person} ${item.user_email || ''} ${item.course} ${item.certificate_code || ''}`.toLowerCase()
      if (query && !haystack.includes(query)) return false
      if (courseFilter !== 'all' && item.course !== courseFilter) return false
      if (scoreFilter === '100' && item.score_number !== 100) return false
      if (scoreFilter === '90plus' && item.score_number < 90) return false
      if (scoreFilter === 'below90' && item.score_number >= 90) return false
      return true
    })
    return [...result].sort((a, b) => {
      if (sort === 'rank') return a.position - b.position
      if (sort === 'oldest') return a.issued_time - b.issued_time
      if (sort === 'score_desc') return b.score_number - a.score_number || b.issued_time - a.issued_time
      if (sort === 'score_asc') return a.score_number - b.score_number || b.issued_time - a.issued_time
      if (sort === 'person') return a.person.localeCompare(b.person, 'es')
      if (sort === 'course') return a.course.localeCompare(b.course, 'es')
      return b.issued_time - a.issued_time
    })
  }, [issuedRows, search, courseFilter, scoreFilter, sort])

  const pagedIssued = useMemo(() => filteredIssued.slice(page * pageSize, page * pageSize + pageSize), [filteredIssued, page, pageSize])
  const pageCount = Math.max(1, Math.ceil(filteredIssued.length / pageSize))

  const filteredPending = useMemo(() => {
    const query = pendingSearch.trim().toLowerCase()
    return pending.filter((item) => {
      if (!query) return true
      return `${item.user_full_name || ''} ${item.user_email || ''} ${item.course_title || ''}`.toLowerCase().includes(query)
    })
  }, [pending, pendingSearch])

  const metrics = useMemo(() => {
    const people = new Set(issuedRows.map((item) => item.user_email || item.user_full_name).filter(Boolean)).size
    const courseCount = new Set(issuedRows.map((item) => item.course).filter(Boolean)).size
    const average = issuedRows.length ? Math.round(issuedRows.reduce((sum, item) => sum + item.score_number, 0) / issuedRows.length) : 0
    return { issued: issuedRows.length, people, courses: courseCount, average, pending: pending.length }
  }, [issuedRows, pending.length])

  const selectedCertificate = issuedRows.find((item) => item.certificate_code === detailCode) || null

  const certificateUrl = (code) => new URL(appUrl('/certificate/' + encodeURIComponent(code)), window.location.origin).href

  const openCertificate = (code) => {
    if (!code) return
    const anchor = document.createElement('a')
    anchor.href = certificateUrl(code)
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  const copyCertificateLink = async (code) => {
    const url = certificateUrl(code)
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Enlace del certificado copiado.')
    } catch {
      setMessage('No fue posible copiar el enlace automáticamente.')
    }
  }

  const shareCertificate = async (item) => {
    if (!item?.certificate_code) return
    const url = certificateUrl(item.certificate_code)
    if (typeof navigator.share !== 'function') {
      await copyCertificateLink(item.certificate_code)
      return
    }
    try {
      await navigator.share({
        title: 'Certificado Aula EI',
        text: item.person + ' · ' + item.course,
        url,
      })
    } catch (error) {
      if (error?.name !== 'AbortError') setMessage('No fue posible compartir el certificado.')
    }
  }

  const generate = async (item) => {
    const key = item.course_id + '-' + item.user_id
    const reservedTab = window.open('about:blank', '_blank')
    if (reservedTab) reservedTab.opener = null
    setWorking(key)
    try {
      const { data, error } = await supabase.rpc('admin_generate_certificate', { p_course_id: item.course_id, p_user_id: item.user_id })
      if (error) throw error
      const code = data?.certificate_code
      setMessage('Certificado generado oficialmente: ' + String(code || 'generado') + '.')
      await load()
      if (code && reservedTab && !reservedTab.closed) reservedTab.location.replace(certificateUrl(code))
      else if (code) openCertificate(code)
      else if (reservedTab && !reservedTab.closed) reservedTab.close()
    } catch (error) {
      if (reservedTab && !reservedTab.closed) reservedTab.close()
      setMessage(getError(error, 'No fue posible generar el certificado oficial.'))
    } finally {
      setWorking(null)
    }
  }

  const exportIssued = () => {
    const source = filteredIssued
    const csv = [
      ['Persona', 'Correo', 'Capacitación', 'Puntaje', 'Código', 'Fecha de emisión'],
      ...source.map((item) => [
        item.person,
        item.user_email || '',
        item.course,
        item.score_number,
        item.certificate_code || '',
        formatDate(item.issued_at),
      ]),
    ].map((row) => row.map(csvCell).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'certificados-aula-ei.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return <div className="certificates-center">
    <section className="panel-card certificates-overview">
      <div className="certificates-overview-head">
        <div>
          <span className="eyebrow">Ranking y certificados</span>
          <h2>Consulta y controla la certificación desde un solo lugar.</h2>
          <p>Busca certificados, revisa puntajes, abre documentos sin salir del módulo y corrige casos completados que aún no tengan certificado.</p>
        </div>
        <button className="secondary-button compact" onClick={load} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={16} /> Actualizar</button>
      </div>

      <div className="certificate-metrics-grid">
        <Metric label="Emitidos" value={metrics.issued} icon={Award} tone="blue" />
        <Metric label="Personas certificadas" value={metrics.people} icon={Users} tone="slate" />
        <Metric label="Capacitaciones" value={metrics.courses} icon={BookOpen} tone="violet" />
        <Metric label="Puntaje promedio" value={metrics.average + '%'} icon={GraduationCap} tone="yellow" />
        <Metric label="Pendientes" value={metrics.pending} icon={FileCheck2} tone={metrics.pending ? 'red' : 'green'} />
      </div>
    </section>

    <section className="panel-card certificates-workspace">
      <div className="certificate-view-switch">
        <button className={view === 'issued' ? 'active' : ''} onClick={() => setView('issued')}><BadgeCheck size={17} /> Emitidos <span>{metrics.issued}</span></button>
        <button className={view === 'pending' ? 'active' : ''} onClick={() => setView('pending')}><FileCheck2 size={17} /> Pendientes <span className={metrics.pending ? 'attention' : ''}>{metrics.pending}</span></button>
      </div>

      {view === 'issued' ? <>
        <div className="certificate-toolbar">
          <div className="search-field certificate-main-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por persona, correo, capacitación o código…" /></div>
          <label className="filter-select"><BookOpen size={15} /><select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}><option value="all">Todas las capacitaciones</option>{courses.map((course) => <option key={course} value={course}>{course}</option>)}</select></label>
          <label className="filter-select"><GraduationCap size={15} /><select value={scoreFilter} onChange={(event) => setScoreFilter(event.target.value)}><option value="all">Todos los puntajes</option><option value="100">100%</option><option value="90plus">90% o más</option><option value="below90">Menos de 90%</option></select></label>
          <label className="filter-select"><CalendarDays size={15} /><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="rank">Ranking original</option><option value="newest">Más recientes</option><option value="oldest">Más antiguos</option><option value="score_desc">Mayor puntaje</option><option value="score_asc">Menor puntaje</option><option value="person">Persona A-Z</option><option value="course">Capacitación A-Z</option></select></label>
        </div>

        <div className="certificate-results-meta">
          <div><strong>{filteredIssued.length}</strong> certificado(s) encontrado(s)</div>
          <button className="secondary-button compact" onClick={exportIssued} disabled={!filteredIssued.length}><Download size={15} /> Exportar CSV</button>
        </div>

        {loading ? <LoadingState text="Cargando certificados…" /> : !pagedIssued.length ? <EmptyState icon={Search} title="No hay coincidencias" text="Ajusta la búsqueda o los filtros para revisar otros certificados." /> : <>
          <div className="data-table-wrap certificates-data-wrap desktop-data-view">
            <table className="data-table certificates-data-table">
              <thead><tr><th>#</th><th>Persona</th><th>Capacitación</th><th>Puntaje</th><th>Emisión</th><th>Código</th><th></th></tr></thead>
              <tbody>{pagedIssued.map((item) => <tr key={item.certificate_code}>
                <td><span className="certificate-rank-pill">#{item.position}</span></td>
                <td><button className="certificate-person-button" onClick={() => setDetailCode(item.certificate_code)}><span className="certificate-avatar">{initials(item.person)}</span><span><strong>{item.person}</strong><small>{item.user_email || 'Sin correo registrado'}</small></span></button></td>
                <td><div className="certificate-course-cell"><strong>{item.course}</strong><small>Certificado oficial</small></div></td>
                <td><ScorePill score={item.score_number} /></td>
                <td><span className="certificate-date">{formatDate(item.issued_at)}</span></td>
                <td><button className="certificate-code-button" title="Copiar enlace" onClick={() => copyCertificateLink(item.certificate_code)}>{shortCode(item.certificate_code)} <ClipboardCopy size={13} /></button></td>
                <td><div className="certificate-row-actions"><button className="icon-button" title="Ver detalle" onClick={() => setDetailCode(item.certificate_code)}><ChevronRight size={17} /></button><button className="secondary-button compact" onClick={() => openCertificate(item.certificate_code)}><ExternalLink size={15} /> Abrir</button></div></td>
              </tr>)}</tbody>
            </table>
          </div>

          <div className="mobile-certificate-list mobile-data-view">
            {pagedIssued.map((item) => <article className="mobile-certificate-card" key={item.certificate_code}>
              <div className="mobile-certificate-card-head">
                <span className="certificate-rank-pill">#{item.position}</span>
                <ScorePill score={item.score_number} />
              </div>
              <button className="mobile-certificate-person" onClick={() => setDetailCode(item.certificate_code)}>
                <span className="certificate-avatar">{initials(item.person)}</span>
                <span><strong>{item.person}</strong><small>{item.user_email || 'Sin correo registrado'}</small></span>
              </button>
              <div className="mobile-certificate-course">
                <BookOpen size={17} />
                <div><strong>{item.course}</strong><small>Emitido {formatDate(item.issued_at)}</small></div>
              </div>
              <button className="mobile-certificate-code" onClick={() => copyCertificateLink(item.certificate_code)}>
                <ClipboardCopy size={14} /><span>{shortCode(item.certificate_code)}</span>
              </button>
              <div className="mobile-certificate-actions">
                <button className="secondary-button compact" onClick={() => shareCertificate(item)}><Share2 size={15} /> Compartir</button>
                <button className="secondary-button compact" onClick={() => setDetailCode(item.certificate_code)}><ChevronRight size={15} /> Detalle</button>
                <button className="primary-button compact" onClick={() => openCertificate(item.certificate_code)}><ExternalLink size={15} /> Abrir</button>
              </div>
            </article>)}
          </div>
        </>}

        <div className="pagination-bar certificate-pagination">
          <span>Página {page + 1} de {pageCount}</span>
          <label>Filas <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
          <div><button className="icon-button" disabled={page <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronRight size={17} style={{ transform: 'rotate(180deg)' }} /></button><button className="icon-button" disabled={page >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}><ChevronRight size={17} /></button></div>
        </div>
      </> : <>
        <div className="pending-toolbar">
          <div className="search-field certificate-main-search"><Search size={18} /><input value={pendingSearch} onChange={(event) => setPendingSearch(event.target.value)} placeholder="Buscar pendiente por persona, correo o capacitación…" /></div>
          <div className={'integrity-status ' + (pending.length ? 'attention' : 'ok')}>{pending.length ? <FileCheck2 size={17} /> : <CheckCircle2 size={17} />}<span>{pending.length ? pending.length + ' caso(s) requieren revisión' : 'Integridad al día'}</span></div>
        </div>

        {loading ? <LoadingState text="Revisando integridad…" /> : !filteredPending.length ? <div className="integrity-empty-compact"><span><CheckCircle2 size={24} /></span><div><strong>Todo al día</strong><p>No hay cursos completados pendientes de certificado.</p></div></div> :
          <div className="pending-certificate-grid">{filteredPending.map((item) => {
            const key = item.course_id + '-' + item.user_id
            return <article className="pending-certificate-card" key={key}>
              <div className="pending-certificate-icon"><FileCheck2 size={20} /></div>
              <div className="pending-certificate-main"><strong>{item.user_full_name || item.user_email || 'Usuario'}</strong><span>{item.course_title || 'Capacitación'}</span><small>Completado: {formatDate(item.completed_at)}</small></div>
              <button className="primary-button compact" disabled={working === key} onClick={() => generate(item)}>{working === key ? <Loader2 className="spin" size={15} /> : <Award size={15} />} Generar certificado</button>
            </article>
          })}</div>}
      </>}
    </section>

    {selectedCertificate && <CertificateDetail
      item={selectedCertificate}
      onClose={() => setDetailCode(null)}
      onOpen={() => openCertificate(selectedCertificate.certificate_code)}
      onCopy={() => copyCertificateLink(selectedCertificate.certificate_code)}
      onShare={() => shareCertificate(selectedCertificate)}
    />}
  </div>
}

function Metric({ label, value, icon: Icon, tone }) {
  return <article className={'certificate-metric ' + tone}><span><Icon size={18} /></span><div><strong>{value}</strong><small>{label}</small></div></article>
}

function ScorePill({ score }) {
  const tone = score >= 90 ? 'excellent' : score >= 80 ? 'good' : 'standard'
  return <span className={'score-pill ' + tone}><GraduationCap size={13} /> {score}%</span>
}

function LoadingState({ text }) {
  return <div className="certificate-loading" aria-busy="true">
    <div className="certificate-loading-head"><Loader2 className="spin" size={20} /><span>{text}</span></div>
    <div className="certificate-loading-skeleton" aria-hidden="true"><i /><i /><i /><i /></div>
  </div>
}

function EmptyState({ icon: Icon, title, text }) {
  return <div className="certificate-empty"><Icon size={28} /><strong>{title}</strong><span>{text}</span></div>
}

function CertificateDetail({ item, onClose, onOpen, onCopy, onShare }) {
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside className="certificate-detail-drawer">
      <header><div><span className="eyebrow">Detalle del certificado</span><h2>{item.person}</h2></div><button className="icon-button" onClick={onClose}><X size={18} /></button></header>

      <div className="certificate-detail-hero">
        <span><Award size={28} /></span>
        <div><small>Certificado oficial Aula EI</small><strong>{item.course}</strong><p>Emitido el {formatDate(item.issued_at)}</p></div>
      </div>

      <div className="certificate-score-card">
        <div><span>Puntaje final</span><strong>{item.score_number}%</strong></div>
        <div className="certificate-score-track"><span style={{ width: Math.max(0, Math.min(100, item.score_number)) + '%' }} /></div>
      </div>

      <section className="certificate-detail-section">
        <h3>Información</h3>
        <dl>
          <div><dt>Persona</dt><dd>{item.person}</dd></div>
          <div><dt>Correo</dt><dd>{item.user_email || 'Sin registro'}</dd></div>
          <div><dt>Capacitación</dt><dd>{item.course}</dd></div>
          <div><dt>Emisión</dt><dd>{formatDate(item.issued_at)}</dd></div>
        </dl>
      </section>

      <section className="certificate-detail-section">
        <h3>Código de verificación</h3>
        <button className="certificate-detail-code" onClick={onCopy}><span>{item.certificate_code}</span><ClipboardCopy size={16} /></button>
      </section>

      <div className="certificate-detail-actions">
        <button className="secondary-button mobile-native-share" onClick={onShare}><Share2 size={16} /> Compartir</button>
        <button className="secondary-button" onClick={onCopy}><ClipboardCopy size={16} /> Copiar enlace</button>
        <button className="primary-button" onClick={onOpen}><ExternalLink size={16} /> Abrir</button>
      </div>
    </aside>
  </div>
}

function initials(value) {
  const words = String(value || 'U').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'U'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

function shortCode(code) {
  const value = String(code || '')
  if (value.length <= 18) return value
  return value.slice(0, 9) + '…' + value.slice(-6)
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  try { return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) } catch { return String(value) }
}

function csvCell(value) {
  const text = String(value ?? '')
  return '"' + text.replace(/"/g, '""') + '"'
}
