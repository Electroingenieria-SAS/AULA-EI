export const PREVIEW_POSITIONS = [
  {
    id: 'preview-conductor',
    code: 'CONDUCTOR',
    name: 'Conductor',
    department: 'Operaciones / Transporte',
    status: 'provisional',
    source_note: 'Levantado desde el Manual del Conductor y flujos operativos actuales.',
  },
  {
    id: 'preview-analista-calidad',
    code: 'ANALISTA_CALIDAD_MC',
    name: 'Analista de Calidad y Mejora Continua',
    department: 'Calidad y Mejora Continua',
    status: 'provisional',
    source_note: 'Cargo identificado en el contexto actual; validar denominación oficial.',
  },
  {
    id: 'preview-supervisor',
    code: 'SUPERVISOR',
    name: 'Supervisor',
    department: 'Operaciones',
    status: 'provisional',
    source_note: 'Nombre provisional inferido de los flujos operativos; validar alcance exacto.',
  },
]

export const PREVIEW_COMPETENCIES = [
  ['INDUCCION_CORPORATIVA', 'Inducción corporativa', 'Corporativa'],
  ['SEGURIDAD_VIAL', 'Seguridad vial', 'SST'],
  ['TRABAJO_SEGURO', 'Trabajo seguro', 'SST'],
  ['CALIDAD_MEJORA', 'Calidad y mejora continua', 'Calidad'],
  ['CUMPLIMIENTO_OPERATIVO', 'Cumplimiento operativo y documental', 'Cumplimiento'],
  ['COMPETENCIA_DIGITAL', 'Competencia digital', 'Digital'],
  ['SUPERVISION_OPERATIVA', 'Supervisión operativa', 'Liderazgo'],
].map(([code, name, category], index) => ({
  id: 'preview-competency-' + index,
  code,
  name,
  category,
  max_level: 5,
}))

const competenceByPosition = {
  CONDUCTOR: [
    ['INDUCCION_CORPORATIVA', 1],
    ['SEGURIDAD_VIAL', 3],
    ['TRABAJO_SEGURO', 2],
    ['CUMPLIMIENTO_OPERATIVO', 2],
  ],
  ANALISTA_CALIDAD_MC: [
    ['INDUCCION_CORPORATIVA', 1],
    ['CALIDAD_MEJORA', 3],
    ['CUMPLIMIENTO_OPERATIVO', 3],
    ['COMPETENCIA_DIGITAL', 2],
  ],
  SUPERVISOR: [
    ['INDUCCION_CORPORATIVA', 1],
    ['TRABAJO_SEGURO', 3],
    ['SUPERVISION_OPERATIVA', 3],
    ['CUMPLIMIENTO_OPERATIVO', 3],
  ],
}

export const PREVIEW_POSITION_COMPETENCIES = Object.entries(competenceByPosition).flatMap(([positionCode, items]) =>
  items.map(([competencyCode, requiredLevel], index) => ({
    id: 'preview-map-' + positionCode + '-' + index,
    job_position_id: PREVIEW_POSITIONS.find((item) => item.code === positionCode)?.id,
    competency_id: PREVIEW_COMPETENCIES.find((item) => item.code === competencyCode)?.id,
    required_level: requiredLevel,
    mandatory: true,
  }))
)

function path(code, name, description, positionCode, steps, due = 30) {
  const id = 'preview-path-' + code.toLowerCase()
  return {
    id,
    code,
    name,
    description,
    job_position_id: PREVIEW_POSITIONS.find((item) => item.code === positionCode)?.id || null,
    default_due_days: due,
    recertification_days: 365,
    status: 'published',
    active: true,
    steps: steps.map((item, index) => ({
      id: id + '-step-' + (index + 1),
      path_id: id,
      sort_order: index + 1,
      step_type: item.type || 'course',
      title: item.title,
      description: item.description || '',
      course_id: null,
      required: true,
      due_offset_days: item.due ?? Math.round((index / Math.max(steps.length - 1, 1)) * due),
    })),
  }
}

export const PREVIEW_PATHS = [
  path(
    'RUTA_BASE_CORPORATIVA',
    'Ruta base corporativa',
    'Ingreso, fundamentos organizacionales y cumplimiento transversal.',
    null,
    [
      { title: 'Inducción corporativa', due: 0 },
      { title: 'Políticas y cumplimiento base', due: 10 },
      { title: 'Evaluación base', type: 'assessment', due: 25 },
      { title: 'Certificación base', type: 'certification', due: 30 },
    ],
    30,
  ),
  path(
    'RUTA_CONDUCTOR',
    'Ruta de formación · Conductor',
    'Inducción → Seguridad vial → Trabajo seguro → Evaluación → Certificación.',
    'CONDUCTOR',
    [
      { title: 'Inducción corporativa', due: 0 },
      { title: 'Seguridad vial', due: 7 },
      { title: 'Trabajo seguro', due: 15 },
      { title: 'Evaluación final', type: 'assessment', due: 25 },
      { title: 'Certificación', type: 'certification', due: 30 },
    ],
    30,
  ),
  path(
    'RUTA_CALIDAD',
    'Ruta de formación · Calidad y mejora continua',
    'Inducción → Calidad y mejora → Cumplimiento documental → Evaluación → Certificación.',
    'ANALISTA_CALIDAD_MC',
    [
      { title: 'Inducción corporativa', due: 0 },
      { title: 'Calidad y mejora continua', due: 10 },
      { title: 'Cumplimiento documental', due: 20 },
      { title: 'Evaluación final', type: 'assessment', due: 35 },
      { title: 'Certificación', type: 'certification', due: 45 },
    ],
    45,
  ),
  path(
    'RUTA_SUPERVISION',
    'Ruta de formación · Supervisión',
    'Inducción → Trabajo seguro → Supervisión operativa → Evaluación → Certificación.',
    'SUPERVISOR',
    [
      { title: 'Inducción corporativa', due: 0 },
      { title: 'Trabajo seguro', due: 10 },
      { title: 'Supervisión operativa', due: 20 },
      { title: 'Evaluación final', type: 'assessment', due: 35 },
      { title: 'Certificación', type: 'certification', due: 45 },
    ],
    45,
  ),
]

export const PREVIEW_AUTOMATIONS = [
  {
    id: 'preview-auto-position',
    code: 'AUTO_PATH_BY_POSITION',
    name: 'Asignar ruta por cargo',
    description: 'Cuando un colaborador recibe un cargo, asigna su ruta y los cursos ya vinculados.',
    trigger_type: 'position_assigned',
    active: true,
  },
  {
    id: 'preview-due7',
    code: 'DUE_REMINDER_7',
    name: 'Recordatorio 7 días',
    description: 'Notifica capacitaciones próximas a vencer.',
    trigger_type: 'schedule',
    active: true,
  },
  {
    id: 'preview-failed2',
    code: 'FAILED_TWICE',
    name: 'Dos intentos fallidos',
    description: 'Notifica al colaborador y, cuando exista, a su supervisor.',
    trigger_type: 'exam_attempt',
    active: true,
  },
  {
    id: 'preview-inactivity',
    code: 'INACTIVITY_15',
    name: 'Inactividad 15 días',
    description: 'Invita al usuario a retomar la ruta cuando lleva 15 días sin actividad.',
    trigger_type: 'schedule',
    active: true,
  },
  {
    id: 'preview-recert',
    code: 'RECERTIFICATION',
    name: 'Recertificación automática',
    description: 'Crea recordatorios y nueva matrícula cuando una certificación entra en ventana de renovación.',
    trigger_type: 'schedule',
    active: true,
  },
]

export const PREVIEW_CONNECTORS = [
  ['WEBHOOKS', 'Webhooks corporativos', 'webhook', 'planned'],
  ['XAPI', 'xAPI / Learning Record Store', 'xapi', 'planned'],
  ['SCORM', 'SCORM 1.2 / 2004', 'scorm', 'planned'],
  ['CMI5', 'cmi5', 'cmi5', 'planned'],
  ['LTI13', 'LTI 1.3', 'lti', 'planned'],
  ['RRHH', 'ERP / Recursos Humanos', 'api', 'planned'],
].map(([code, name, connector_type, status]) => ({ id: 'preview-' + code, code, name, connector_type, status }))

export const PREVIEW_MISSIONS = [
  { id: 'preview-m1', code: 'MISION_SEMANAL_2_CONTENIDOS', title: 'Avanza esta semana', description: 'Completa 2 contenidos durante la semana.', xp_reward: 35, cadence: 'weekly' },
  { id: 'preview-m2', code: 'MISION_EXAMEN', title: 'Reto de evaluación', description: 'Presenta una evaluación final.', xp_reward: 30, cadence: 'weekly' },
  { id: 'preview-m3', code: 'MISION_RUTA', title: 'Continúa tu ruta', description: 'Avanza en al menos una capacitación asignada.', xp_reward: 25, cadence: 'weekly' },
]

export function dueBucket(value) {
  if (!value) return null
  const due = new Date(value)
  const now = new Date()
  const days = Math.ceil((due - now) / 86400000)
  if (days < 0) return 'overdue'
  if (days <= 7) return 'due7'
  if (days <= 30) return 'due30'
  if (days <= 60) return 'due60'
  return 'later'
}

export function levelFromXp(xp = 0) {
  return 1 + Math.floor(Math.max(0, Number(xp) || 0) / 250)
}

export function previewSnapshot({ profiles = [], enrollments = [], courses = [] } = {}) {
  const activeProfiles = profiles.filter((item) => item.is_active !== false)
  const activeEnrollments = enrollments.filter((item) => !['completed', 'cancelled'].includes(item.status))
  const buckets = activeEnrollments.reduce((acc, item) => {
    const bucket = dueBucket(item.due_at)
    if (bucket) acc[bucket] = (acc[bucket] || 0) + 1
    return acc
  }, {})
  return {
    people_total: activeProfiles.length,
    people_with_position: 0,
    positions_total: PREVIEW_POSITIONS.length,
    paths_total: PREVIEW_PATHS.length,
    path_assignments: 0,
    overdue_enrollments: buckets.overdue || 0,
    due_7: buckets.due7 || 0,
    due_30: (buckets.due7 || 0) + (buckets.due30 || 0),
    due_60: (buckets.due7 || 0) + (buckets.due30 || 0) + (buckets.due60 || 0),
    avg_exam_score: null,
    exam_pass_rate: null,
    certificates_total: 0,
    certificates_expiring_30: 0,
    unread_notifications: 0,
    automation_rules_active: PREVIEW_AUTOMATIONS.filter((item) => item.active).length,
    telemetry_errors_24h: 0,
    risk_users: [],
    course_health: courses.map((course) => ({ id: course.id, title: course.title, attempts: 0, avg_score: null, pass_rate: null })).slice(0, 8),
    position_breakdown: PREVIEW_POSITIONS.map((position) => ({ id: position.id, name: position.name, status: position.status, people: 0 })),
  }
}
