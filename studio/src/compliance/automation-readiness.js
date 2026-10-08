const list = value => Array.isArray(value) ? value : []
const key = value => String(value || '')

/**
 * Read-only planning model; official authority, prerequisites, deadlines and
 * unique enrolments remain enforced by admin_sync_training_engine in Postgres.
 * No result here is a promise that a student will be enrolled.
 */
export function buildAutomationReadiness({
  people, positions, paths, pathCourses, positionPaths, courses, rules, complianceRows,
} = {}) {
  const activePeople = list(people).filter(person => person?.is_active !== false)
  const withPosition = activePeople.filter(person => Boolean(person.job_position_id))
  const activePaths = new Map(list(paths)
    .filter(path => path?.is_active !== false && path?.id)
    .map(path => [key(path.id), path]))
  const publishedCourses = new Map(list(courses)
    .filter(course => course?.status === 'published' && course?.id)
    .map(course => [key(course.id), course]))
  const positionNames = new Map(list(positions).map(position =>
    [key(position.id), String(position.name || 'Cargo sin nombre')]))
  const requiredByPosition = new Map()
  for (const link of list(positionPaths)) {
    if (link?.required === false || !activePaths.has(key(link?.path_id))) continue
    const positionId = key(link.position_id)
    const paths = requiredByPosition.get(positionId) || new Set()
    paths.add(key(link.path_id))
    requiredByPosition.set(positionId, paths)
  }
  const coursesByPath = new Map()
  for (const link of list(pathCourses)) {
    if (link?.required === false) continue
    const course = publishedCourses.get(key(link.course_id))
    if (!course || !activePaths.has(key(link.path_id))) continue
    const courses = coursesByPath.get(key(link.path_id)) || new Map()
    courses.set(key(course.id), { id: key(course.id), title: String(course.title || 'Curso publicado') })
    coursesByPath.set(key(link.path_id), courses)
  }
  const preview = withPosition.map(person => {
    const courseSet = new Map()
    const pathSet = requiredByPosition.get(key(person.job_position_id)) || new Set()
    for (const pathId of pathSet) {
      for (const course of coursesByPath.get(pathId)?.values() || []) {
        courseSet.set(course.id, course)
      }
    }
    return {
      userId: key(person.id), name: String(person.full_name || person.email || 'Colaborador'),
      position: positionNames.get(key(person.job_position_id)) || 'Cargo sin nombre',
      paths: pathSet.size,
      courses: [...courseSet.values()].sort((a, b) => a.title.localeCompare(b.title, 'es')),
    }
  }).sort((a,b)=>a.name.localeCompare(b.name,'es'))
  const candidatePairs = preview.reduce((n,person)=>n+person.courses.length,0)
  const withCandidate = preview.filter(person=>person.courses.length).length
  const rulesActive = list(rules).some(rule=>rule?.code === 'AUTO_CARGO_RUTA' && rule?.is_active === true)
  const missing = [
    ...(!withPosition.length ? [{
      code: 'missing-positions', message: 'No hay colaboradores activos con un cargo vinculado.',
      action: 'Asignar cargos', section: 'positions',
    }] : []),
    ...(!list(positionPaths).some(row => row?.required !== false && activePaths.has(key(row?.path_id))) ? [{
      code: 'missing-paths', message: 'Falta vincular rutas obligatorias a cargos activos.',
      action: 'Vincular rutas', section: 'positions',
    }] : []),
    ...(![...coursesByPath.values()].some(map => map.size) ? [{
      code: 'missing-courses', message: 'Las rutas no contienen capacitaciones obligatorias publicadas.',
      action: 'Configurar cursos por ruta', section: 'paths',
    }] : []),
    ...(!rulesActive ? [{
      code: 'rule-inactive', message: 'La regla AUTO_CARGO_RUTA está desactivada.',
      action: 'Revisar reglas', section: 'automation',
    }] : []),
    ...(withPosition.length && !withCandidate && list(pathCourses).length ? [{
      code: 'missing-coverage', message: 'Ningún colaborador con cargo coincide con una ruta que tenga cursos publicados.',
      action: 'Revisar relaciones', section: 'positions',
    }] : []),
  ]
  const matrix = list(complianceRows)
  const matrixMissing = matrix.filter(row=>row?.compliance_state === 'not_assigned').length
  return {
    ready: missing.length === 0 && candidatePairs > 0,
    missing, preview, peopleWithoutPosition: activePeople.length - withPosition.length,
    counts: { activePeople:activePeople.length, positioned:withPosition.length,
      linkedPeople:withCandidate, candidatePairs,
      routes:activePaths.size, publishedCourses:publishedCourses.size,
      matrixMissing, activeRules:list(rules).filter(rule=>rule?.is_active === true).length },
  }
}
