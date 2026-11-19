import React, { useEffect, useMemo, useState } from 'react'
import { BarChart3, BrainCircuit, RefreshCw, ShieldCheck } from 'lucide-react'
import { supabase } from '../shared.js'

const numeric = (value) => Number(value || 0).toLocaleString('es-CO')
const score = (value) => value === null || value === undefined ? 'Sin muestra válida' : Number(value).toFixed(1) + '%'

export default function PositionAssessmentAnalytics({ setMessage }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const reload = async () => {
    setLoading(true)
    setFailed(false)
    try {
      const { data, error } = await supabase.rpc('admin_position_assessment_metrics')
      if (error) throw error
      setRows(Array.isArray(data) ? data : [])
    } catch {
      setFailed(true)
      setMessage?.('No fue posible cargar los indicadores de evaluación por cargo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])
  const valid = useMemo(() => rows.filter((row) => row.mean_score !== null), [rows])
  const technical = useMemo(() => rows.filter((row) => row.technical_mean_score !== null)
    .sort((a, b) => Number(b.technical_mean_score) - Number(a.technical_mean_score)), [rows])

  return <section className="panel-card position-assessment-panel" aria-labelledby="position-assessments-title">
    <header className="section-title-row">
      <div>
        <span className="eyebrow">EVALUACIONES POR CARGO</span>
        <h3 id="position-assessments-title"><BarChart3 size={20}/> Resultados de aprobación y conocimiento</h3>
        <p>Se contabiliza el intento más reciente por persona y curso. Los resultados se agrupan por el cargo actual, sin identificar a colaboradores.</p>
      </div>
      <button className="secondary-button compact" type="button" onClick={reload} disabled={loading}>
        <RefreshCw size={16} className={loading ? 'spin' : ''}/> Actualizar
      </button>
    </header>
    {loading ? <p role="status">Calculando indicadores por cargo…</p>
      : failed ? <p role="alert">No se pudo cargar la información. Revisa los permisos de administración y vuelve a intentarlo.</p>
      : !valid.length ? <p role="status">Todavía no hay grupos de tres o más personas evaluadas con cargo asignado. Los datos aparecerán a medida que se parametrice la planta de personal.</p>
      : <div className="data-table-wrap" style={{overflowX:'auto'}}>
        <table className="data-table" aria-label="Desempeño de evaluaciones por cargo">
          <thead><tr>
            <th>Cargo</th><th>Personas con cargo</th><th>Evaluadas</th><th>Aprobaciones</th><th>Reprobaciones</th><th>Nota promedio</th><th>Promedio técnico</th>
          </tr></thead>
          <tbody>{rows.map((row) => <tr key={row.position_id}>
            <td><strong>{row.position_name}</strong></td>
            <td>{numeric(row.people_count)}</td>
            <td>{row.mean_score === null ? 'Muestra reducida' : numeric(row.evaluated_people)}</td>
            <td>{row.approved_count === null ? '—' : numeric(row.approved_count)}</td>
            <td>{row.failed_count === null ? '—' : numeric(row.failed_count)}</td>
            <td>{score(row.mean_score)}</td>
            <td>{score(row.technical_mean_score)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    {technical.length ? <p className="a92-method"><BrainCircuit size={16} /> Mayor promedio en evaluaciones etiquetadas como técnicas: <strong>{technical[0].position_name}</strong> ({score(technical[0].technical_mean_score)}), entre los cargos con tres o más personas evaluadas en contenidos técnicos. Esta medida no determina por sí sola el conocimiento real del área.</p>
      : <p className="a92-method"><BrainCircuit size={16} /> Ranking técnico pendiente: vincula cursos con competencias clasificadas como «técnica» y alcanza al menos tres personas evaluadas por cargo antes de comparar resultados.</p>}
    <p className="a92-method"><ShieldCheck size={16} /> Privacidad: se ocultan resultados detallados de grupos con menos de tres personas evaluadas. El histórico no se reinterpreta como evidencia de competencias aún no parametrizadas.</p>
  </section>
}
