const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
const norm = (value) => String(value || '').trim().toLocaleLowerCase('es')
const percent = (value) => Math.max(0, Math.min(100, number(value)))

export function courseRows(analytics, courseId = 'all', search = '') {
  const q = norm(search)
  return (Array.isArray(analytics?.courses) ? analytics.courses : [])
    .filter((row) => (courseId === 'all' || String(row.course_id) === String(courseId)) &&
      (!q || norm(row.course_title).includes(q)))
    .map((row) => ({
      ...row,
      assigned: number(row.assigned),
      completed: number(row.completed),
      exam_attempts: number(row.exam_attempts),
      completion_percent: percent(row.completion_percent),
      pass_percent: percent(row.pass_percent),
      average_score: percent(row.average_score),
    }))
}

export function prioritizedFindings(courses, questions, blocks, minimumSample = 5) {
  const minimum = Math.max(1, Math.floor(number(minimumSample)))
  const findings = []
  for (const row of courses) {
    if (row.assigned >= minimum && row.completion_percent < 60) findings.push({
      key: 'completion:' + row.course_id, course_id: row.course_id, course_title: row.course_title,
      type: 'completion', priority: row.completion_percent < 30 ? 'high' : 'medium',
      title: 'Baja finalización de la capacitación',
      detail: row.completed + ' de ' + row.assigned + ' asignaciones completadas (' + row.completion_percent.toFixed(1) + '%)',
      action: 'Revisar fechas, accesibilidad del material y barreras para continuar.',
      sample: row.assigned,
    })
    if (row.exam_attempts >= minimum && row.pass_percent < 60) findings.push({
      key: 'approval:' + row.course_id, course_id: row.course_id, course_title: row.course_title,
      type: 'approval', priority: row.pass_percent < 30 ? 'high' : 'medium',
      title: 'Baja aprobación en los intentos',
      detail: row.pass_percent.toFixed(1) + '% de aprobación en ' + row.exam_attempts + ' intentos',
      action: 'Revisar claridad del contenido, preguntas y criterios de evaluación.',
      sample: row.exam_attempts,
    })
  }
  for (const row of questions) {
    const sample = number(row.answers_count)
    if (sample < minimum || percent(row.error_percent) < 60) continue
    findings.push({
      key: 'question:' + row.question_id, course_id: row.course_id, course_title: row.course_title,
      type: 'question', priority: percent(row.error_percent) >= 80 ? 'high' : 'medium',
      title: 'Pregunta que requiere revisión pedagógica',
      detail: number(row.error_percent).toFixed(1) + '% de respuestas incorrectas entre ' + sample + ' respuestas',
      action: 'Comprobar claridad, distractores y correspondencia con lo enseñado.',
      sample,
    })
  }
  for (const row of blocks) {
    const sample = number(row.started_count)
    if (sample < minimum || percent(row.completion_percent) >= 50) continue
    findings.push({
      key: 'block:' + row.block_id, course_id: row.course_id, course_title: row.course_title,
      type: 'block', priority: percent(row.completion_percent) < 25 ? 'high' : 'medium',
      title: 'Bloque con dificultad de finalización',
      detail: number(row.completed_count) + ' de ' + sample + ' avances iniciados llegaron al cierre',
      action: 'Verificar navegación, carga multimedia y preguntas de transición.',
      sample,
    })
  }
  return findings.sort((a,b) =>
    (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1) ||
    b.sample - a.sample || norm(a.course_title).localeCompare(norm(b.course_title),'es'))
}

export function analyticsView(analytics, questions, blocks, { courseId='all', search='', minimumSample=5 } = {}) {
  const courses = courseRows(analytics, courseId, search)
  const ids = new Set(courses.map((row) => String(row.course_id)))
  const qRows = (Array.isArray(questions) ? questions : [])
    .filter((row) => ids.has(String(row.course_id)) && number(row.answers_count) >= minimumSample)
    .sort((a,b) => number(b.error_percent) - number(a.error_percent) || number(b.answers_count) - number(a.answers_count))
  const bRows = (Array.isArray(blocks) ? blocks : [])
    .filter((row) => ids.has(String(row.course_id)) && number(row.started_count) >= minimumSample)
    .sort((a,b) => number(a.completion_percent) - number(b.completion_percent) || number(b.started_count) - number(a.started_count))
  return {
    courses, questions: qRows, blocks: bRows,
    findings: prioritizedFindings(courses, qRows, bRows, minimumSample),
  }
}

// Formula-injection protection for data exported to Excel and other spreadsheets.
// CSV keeps an explicit semicolon delimiter expected by common es-CO installations.
export function csvCell(value) {
  const raw = String(value == null ? '' : value)
  const guarded = /^[\s]*[=+\-@\t\r]/.test(raw) ? "'" + raw : raw
  return '"' + guarded.replace(/"/g, '""').replace(/[\r\n]+/g,' ') + '"'
}

export function analyticsCsv(view, generatedAt = new Date()) {
  const rows = [
    ['Informe de analítica de formación Aula EI'],
    ['Fecha de generación', generatedAt.toISOString()],
    ['Ámbito', 'Cursos filtrados, sin datos personales ni respuestas individuales'],
    [],
    ['Capacitación','Asignaciones','Finalizadas','Finalización (%)','Intentos de examen','Aprobación de intentos (%)','Nota promedio (%)'],
    ...view.courses.map((row) => [row.course_title,row.assigned,row.completed,row.completion_percent,row.exam_attempts,row.pass_percent,row.average_score]),
    [],
    ['Hallazgos orientativos','Capacitación','Prioridad','Muestra','Descripción','Recomendación'],
    ...view.findings.map((f) => [f.title,f.course_title,f.priority,f.sample,f.detail,f.action]),
  ]
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n')
}

export function complianceCsv(rows, generatedAt = new Date()) {
  const data = [
    ['Matriz de seguimiento de formación Aula EI'],
    ['Fecha de generación', generatedAt.toISOString()],
    ['Confidencial: datos personales de colaboradores. Uso administrativo autorizado.'],
    [],
    ['Colaborador','Correo','Cargo','Ruta','Capacitación','Fecha de vencimiento','Estado'],
    ...rows.map((row) => [
      row.full_name,row.email,row.position_name,row.path_name,row.course_title,
      row.evidence_expires_at || row.due_at || '',row.compliance_state,
    ]),
  ]
  return '\uFEFF' + data.map((row) => row.map(csvCell).join(';')).join('\r\n')
}
