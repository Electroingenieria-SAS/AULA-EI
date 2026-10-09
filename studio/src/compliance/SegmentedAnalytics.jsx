import React, { useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, Clock3, Download, FileText, ShieldCheck } from 'lucide-react'
import { segmentedCompliance, segmentedComplianceCsv } from './segmented-analytics.js'
import '../styles/segmented-analytics.css'

const count=value=>Number(value||0).toLocaleString('es-CO')
const pct=value=>value==null?'Sin requisitos':Number(value).toFixed(1)+'%'
function getSafeFilename() {return 'aula-ei-cumplimiento-por-cargo-'+new Date().toISOString().slice(0,10)}

function saveCsv(content) {
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}))
  const anchor=document.createElement('a')
  anchor.href=url
  anchor.download=getSafeFilename()+'.csv'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function CohortRow({group}) {
  return <tr>
    <th scope="row">{group.label}{!group.enoughSample && <small className="a92-confidential">Muestra reducida</small>}</th>
    {group.enoughSample ? <>
      <td>{count(group.people)}</td>
      <td>{count(group.requirements)}</td>
      <td>{count(group.atRisk)}</td>
      <td>{count(group.withoutEnrollment)}</td>
      <td><div className="a92-progress"><strong>{pct(group.coverage)}</strong>
        <span className="a92-track" aria-hidden="true"><i style={{width:group.coverage+'%'}} /></span>
      </div></td>
    </> : <td colSpan={5}>No se presentan métricas desglosadas para menos de 3 personas.</td>}
  </tr>
}
export default function SegmentedAnalytics({complianceRows=[],positions=[],setMessage}) {
  const [department,setDepartment]=useState('all')
  const [position,setPosition]=useState('all')
  const [exporting,setExporting]=useState(false)
  const data=useMemo(()=>segmentedCompliance(complianceRows,positions,{department,position}),
    [complianceRows,positions,department,position])
  const onDepartment=value=>{setDepartment(value);setPosition('all')}
  const exportCsv=()=>{
    if(!data.hasData) return
    if(!window.confirm('Exportar únicamente indicadores agregados, sin datos personales, al dispositivo actual?'))return
    try {saveCsv(segmentedComplianceCsv(data))}
    catch {setMessage?.('No fue posible exportar el CSV agregado.')}
  }
  const exportPdf=async()=>{
    if(!data.hasData||exporting) return
    if(!window.confirm('Crear PDF ejecutivo con cifras agregadas, sin nombres ni identificadores personales?'))return
    setExporting(true)
    try {
      const { exportSegmentedPdf }=await import('./segmented-analytics-pdf.js')
      await exportSegmentedPdf(data,getSafeFilename()+'.pdf')
    } catch {setMessage?.('No fue posible generar el PDF. Revisa la descarga o usa CSV.') }
    finally {setExporting(false)}
  }
  return <section className="panel-card a92-panel" aria-labelledby="a92-title">
    <header className="a92-heading">
      <div>
        <span className="eyebrow">FASE 9.2 · ANALÍTICA OPERATIVA</span>
        <h3 id="a92-title"><BarChart3 size={21}/> Cumplimiento por área y cargo</h3>
        <p>Compara los requisitos formativos actuales por dependencia y cargo. Los datos provienen de la matriz administrativa ya consultada, sin llamadas adicionales.</p>
      </div>
      <span className="a92-cut"><Clock3 size={16}/> Corte actual, no tendencia histórica</span>
    </header>
    <div className="a92-filters">
      <label>Dependencia o área
        <select value={department} onChange={event=>onDepartment(event.target.value)}>
          <option value="all">Todas las áreas</option>
          {data.departments.map(area=><option key={area} value={area}>{area}</option>)}
        </select>
      </label>
      <label>Cargo
        <select value={position} onChange={event=>setPosition(event.target.value)}>
          <option value="all">Todos los cargos</option>
          {data.jobOptions.map(job=><option key={job.id} value={job.id}>{job.name}</option>)}
        </select>
      </label>
    </div>
    <div className="a92-cards" aria-label="Resumen de cumplimiento dentro del filtro">
      <article><small>Requisitos únicos</small><strong>{count(data.summary.requirements)}</strong><span>Persona y capacitación</span></article>
      <article><small>Al día</small><strong>{count(data.summary.compliant)}</strong><span>{pct(data.summary.coverage)} de cumplimiento</span></article>
      <article><small>En riesgo</small><strong>{count(data.summary.atRisk)}</strong><span>{count(data.summary.overdue)} vencidos o expirados</span></article>
      <article><small>Sin matrícula</small><strong>{count(data.summary.withoutEnrollment)}</strong><span>Requieren verificar asignación</span></article>
    </div>
    {data.hasData?<>
      <div className="a92-table-head"><div><h4>Comparación de grupos</h4><p>Ordenados por vencimientos y exposición al riesgo. Los porcentajes utilizan requisitos, no personas, como denominador.</p></div></div>
      <div className="a92-table-scroller" role="region" aria-label="Comparación por áreas y cargos, desplazable horizontalmente" tabIndex={0}>
        <table><thead><tr><th scope="col">{department==='all'?'Área':'Cargo o área'}</th><th scope="col">Personas</th><th scope="col">Requisitos</th><th scope="col">En riesgo</th><th scope="col">Sin matrícula</th><th scope="col">Al día</th></tr></thead>
          <tbody>{data.rankings.map(row=><CohortRow key={row.id} group={row}/>)}</tbody>
        </table>
      </div>
      <div className="a92-export">
        <div><ShieldCheck size={19}/><p>Los archivos son agregados. Para grupos con menos de tres personas se ocultan cifras detalladas, y nunca se incluyen nombres, correos ni respuestas del examen.</p></div>
        <div className="a92-export-actions">
          <button type="button" onClick={exportCsv}><Download size={16}/> CSV</button>
          <button type="button" onClick={exportPdf} disabled={exporting}><FileText size={16}/>{exporting?'Preparando PDF…':'PDF ejecutivo'}</button>
        </div>
      </div>
    </>:<div className="a92-empty" role="status"><AlertTriangle size={23}/><strong>Sin requisitos asignados para analizar</strong><p>Configura cargos y vincula capacitaciones a rutas obligatorias en Formación y cumplimiento. Ningún porcentaje se considerará 100 % por ausencia de datos.</p></div>}
    <p className="a92-method"><b>Metodología.</b> Una capacitación requerida por el mismo colaborador en dos rutas cuenta una sola vez. En riesgo incluye vencidas, expiradas y próximas a vencer. Los indicadores no certifican el cumplimiento institucional ni sustituyen la revisión individual. Para analizar meses anteriores deberán existir cortes históricos verificables.</p>
  </section>
}
