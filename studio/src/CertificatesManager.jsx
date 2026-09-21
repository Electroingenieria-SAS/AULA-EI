import React, { useEffect, useState } from 'react'
import { Award, CheckCircle2, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { getError, supabase } from './shared.js'

export default function CertificatesManager({ setMessage }) {
  const [ranking, setRanking] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(null)

  const load = async () => {
    setLoading(true)
    const [rankingResult, pendingResult] = await Promise.all([
      supabase.rpc('admin_certificate_ranking'),
      supabase.rpc('admin_completed_without_certificate'),
    ])
    if (rankingResult.error) setMessage(rankingResult.error.message)
    if (pendingResult.error) setMessage(pendingResult.error.message)
    setRanking(rankingResult.data || [])
    setPending(pendingResult.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const generate = async (item) => {
    setWorking(item.course_id + '-' + item.user_id)
    try {
      const { data, error } = await supabase.rpc('admin_generate_certificate', { p_course_id: item.course_id, p_user_id: item.user_id })
      if (error) throw error
      const code = data?.certificate_code
      setMessage('Certificado generado oficialmente: ' + String(code || 'generado') + '.')
      await load()
      if (code) window.open('/#/certificate/' + encodeURIComponent(code), '_blank', 'noopener,noreferrer')
    } catch (error) {
      setMessage(getError(error, 'No fue posible generar el certificado oficial.'))
    } finally {
      setWorking(null)
    }
  }

  return <div className="two-column-layout certificates-layout">
    <section className="panel-card">
      <div className="section-title-row compact-row"><div><span className="eyebrow">Ranking y certificados</span><h2>Certificados emitidos</h2><p>Consulta quiénes aprobaron y abre su certificado oficial.</p></div><button className="icon-button" onClick={load} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={18} /></button></div>
      {loading ? <div className="empty-state"><Loader2 className="spin" size={22} /> Cargando certificados…</div> : ranking.length === 0 ? <div className="empty-state"><Award size={28} /><h3>Aún no hay certificados emitidos</h3><p>Cuando un colaborador apruebe el examen final aparecerá aquí.</p></div> :
        <div className="certificate-list">{ranking.map((item, index) => <article className="certificate-row-card" key={item.certificate_code}>
          <div className="certificate-rank">#{index + 1}</div>
          <div className="certificate-main"><strong>{item.user_full_name || item.user_email}</strong><span>{item.course_title}</span><small>Código: {item.certificate_code} · Puntaje: {item.score}% · Emisión: {new Date(item.issued_at).toLocaleDateString('es-CO')}</small></div>
          <a className="secondary-button compact" href={'/#/certificate/' + encodeURIComponent(item.certificate_code)} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Abrir</a>
        </article>)}</div>}
    </section>
    <section className="panel-card">
      <div className="section-title-row compact-row"><div><span className="eyebrow">Control de integridad</span><h2>Completados sin certificado</h2><p>Repara casos históricos sin alterar su resultado académico.</p></div><CheckCircle2 size={27} /></div>
      {loading ? <div className="empty-state">Cargando registros…</div> : pending.length === 0 ? <div className="empty-state"><CheckCircle2 size={28} /><h3>Todo al día</h3><p>No hay cursos completados pendientes de certificado.</p></div> :
        <div className="pending-list">{pending.map((item) => {
          const key = item.course_id + '-' + item.user_id
          return <article key={key} className="pending-card"><div><strong>{item.course_title}</strong><span>{item.user_full_name || item.user_email}</span><small>Completado: {new Date(item.completed_at).toLocaleDateString('es-CO')}</small></div><button className="primary-button compact" disabled={working === key} onClick={() => generate(item)}>{working === key ? <Loader2 className="spin" size={15} /> : <Award size={15} />} Generar certificado</button></article>
        })}</div>}
    </section>
  </div>
}
