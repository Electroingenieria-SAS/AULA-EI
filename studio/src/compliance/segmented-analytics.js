import { csvCell } from './analytics-model.js'

const array = value => Array.isArray(value) ? value : []
const text = value => String(value ?? '').trim()
const unique = values => new Set(values)
const riskStates = new Set(['overdue','expired','expiring'])
const priority = {expired:8,overdue:7,expiring:6,not_assigned:5,assigned:4,in_progress:3,compliant:1}

function groupStats(requirements, groupId, label, minimumPeople) {
  const people = unique(requirements.map(row=>row.user_id)).size
  const compliant = requirements.filter(row=>row.compliance_state === 'compliant').length
  const atRisk = requirements.filter(row=>riskStates.has(row.compliance_state)).length
  const overdue = requirements.filter(row=>['overdue','expired'].includes(row.compliance_state)).length
  const withoutEnrollment = requirements.filter(row=>row.compliance_state === 'not_assigned').length
  const pending = requirements.length - compliant - atRisk
  return {
    id:groupId,label,people,requirements:requirements.length,compliant,atRisk,overdue,
    withoutEnrollment,pending,coverage:requirements.length
      ? Math.round(compliant / requirements.length * 1000) / 10 : null,
    // Suppressing small cohorts avoids misleading small-group comparisons.
    enoughSample:people >= minimumPeople,
  }
}

/**
 * Derives snapshot aggregates from the already-authorized admin compliance matrix.
 * A requirement is a unique user-course pair; multiple paths must not double count.
 * NEVER use this for frontend authorization: all source data comes from a guarded RPC.
 */
export function segmentedCompliance(rows, positions, {
  department='all', position='all', minimumPeople=3,
}={}) {
  const min = Math.max(3,Math.floor(Number(minimumPeople)||3))
  const catalog = new Map(array(positions).map(item=>[text(item.id),item]))
  const requirements = new Map()
  for (const row of array(rows)) {
    if (!row?.user_id || !row?.course_id) continue
    const positionId=text(row.position_id)||'unassigned'
    const job=catalog.get(positionId)
    const area=text(job?.department)||'Sin área definida'
    const jobName=text(job?.name)||text(row.position_name)||'Cargo sin especificar'
    const state=text(row.compliance_state)||'not_assigned'
    const id=text(row.user_id)+'|'+text(row.course_id)
    const previous=requirements.get(id)
    const record={user_id:text(row.user_id),course_id:text(row.course_id),
      positionId,jobName,area,compliance_state:state}
    if(!previous || (priority[state]||0)>(priority[previous.compliance_state]||0))
      requirements.set(id,record)
  }
  const all=[...requirements.values()]
  const departments=[...unique(all.map(row=>row.area))].sort((a,b)=>a.localeCompare(b,'es'))
  const eligible=department==='all'?all:all.filter(row=>row.area===department)
  const jobs=new Map()
  for(const row of eligible){if(!jobs.has(row.positionId))jobs.set(row.positionId,row.jobName)}
  const jobOptions=[...jobs].map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name,'es'))
  const selected=position==='all'?eligible:eligible.filter(row=>row.positionId===position)
  const summary=groupStats(selected,'all','Total de requisitos',min)
  const areaGroups=departments
    .filter(area=>department==='all'||department===area)
    .map(area=>groupStats(selected.filter(row=>row.area===area),area,area,min))
    .filter(group=>group.requirements)
    .sort((a,b)=>b.overdue-a.overdue||b.atRisk-a.atRisk||a.label.localeCompare(b.label,'es'))
  const positionGroups=jobOptions.map(job=>groupStats(
    selected.filter(row=>row.positionId===job.id),job.id,job.name,min))
    .filter(group=>group.requirements)
    .sort((a,b)=>b.overdue-a.overdue||b.atRisk-a.atRisk||a.label.localeCompare(b.label,'es'))
  const rankings=position!=='all'?areaGroups:department!=='all'?positionGroups:areaGroups
  return {
    summary,areaGroups,positionGroups,rankings,
    departments,jobOptions,scope:{department,position},minimumPeople:min,
    hasData:Boolean(selected.length),
    explanations:{
      denominator:'Requisitos únicos colaborador-capacitación, sin duplicar rutas',
      coverage:'Porcentaje de requisitos en estado conforme, no porcentaje de colaboradores',
      due:'Vencidos incluye evidencias expiradas o fechas vencidas. Por vencer se cuenta en riesgo.',
    },
  }
}
export function segmentedComplianceCsv(report, timestamp=new Date()) {
  const rows=[
    ['Aula EI | Análisis de cumplimiento por área y cargo'],
    ['Generado', timestamp.toISOString()],
    ['Área filtrada',report.scope.department==='all'?'Todas':report.scope.department],
    ['Cargo filtrado',report.scope.position==='all'?'Todos':report.scope.position],
    ['Definición','Un requisito por usuario y curso; varias rutas no duplican conteos'],
    ['Privacidad','No se exportan nombres, correos, identificadores ni grupos de menos de 3 personas'],
    [],
    ['Ámbito','Grupo','Personas','Requisitos','Conformes','En riesgo','Vencidos','Sin matrícula','Pendientes','Cumplimiento (%)'],
  ]
  const toRow=(type,item)=>[type,item.label,item.people,item.requirements,item.compliant,
    item.atRisk,item.overdue,item.withoutEnrollment,item.pending,item.coverage??'']
  rows.push(toRow('Resumen',report.summary))
  for(const [type,list] of [['Área',report.areaGroups],['Cargo',report.positionGroups]]){
    for(const group of list){
      if(group.enoughSample) rows.push(toRow(type,group))
      else rows.push([type,group.label,'Muestra inferior al mínimo', '', '', '', '', '', '', ''])
    }
  }
  rows.push([],['Advertencia','Un corte actual no constituye tendencia histórica ni certificación de formación.'])
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n')
}
