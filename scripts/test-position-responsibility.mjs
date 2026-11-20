import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')
const [
  users, userPanels, staffRoles, courseBuilder, coursePanels,
  notifications, createUser, migration, positionMetrics, compliance, positionsHook, profilesLoader, pkg,
] = await Promise.all([
  read('studio/src/UsersManager.jsx'),
  read('studio/src/users/UserPanels.jsx'),
  read('studio/src/shared.js'),
  read('studio/src/course-editor/CourseBuilder.jsx'),
  read('studio/src/course-editor/CourseBuilderPanels.jsx'),
  read('player/src/NotificationCenter.jsx'),
  read('supabase/functions/create-managed-user/index.ts'),
  read('supabase/migrations/20261119180000_position_training_owners_notifications.sql'),
  read('studio/src/compliance/PositionAssessmentAnalytics.jsx'),
  read('studio/src/ComplianceCenter.jsx'),
  read('studio/src/users/useUserPositions.js'),
  read('studio/src/useStudioData.js'),
  read('package.json'),
])

// Required job selection must be validated both on the client and the server.
assert.match(userPanels, /required value=\{form\.job_position_id/)
assert.match(users, /job_position_id: form\.job_position_id/)
assert.match(createUser, /POSITION_REQUIRED/)
assert.match(createUser, /\.from\("job_positions"\)/)
assert.match(createUser, /job_position_id: jobPositionId/)
assert.match(positionsHook, /admin_set_user_job_position/)

// Historical employees retain their academic records; verified job positions
// may be incorporated manually without creating new enrollments.
assert.match(migration, /add column if not exists onboarding_methodology_started_at timestamptz;/)
assert.doesNotMatch(migration, /add column if not exists onboarding_methodology_started_at timestamptz\s+default/i)
assert.match(createUser, /onboarding_methodology_started_at: new Date\(\)\.toISOString\(\)/)
assert.match(profilesLoader, /supervisor_id,onboarding_methodology_started_at/)
assert.match(users, /canChangePosition=\{canChangePosition\}/)
assert.match(positionsHook, /const legacy = !person\.onboarding_methodology_started_at/)
assert.match(positionsHook, /window\.confirm/)
assert.match(positionsHook, /Cargo histórico actualizado sin cambiar capacitaciones/)
assert.match(migration, /and new\.onboarding_methodology_started_at is not null/)
assert.match(migration, /p\.onboarding_methodology_started_at is not null/)
assert.match(migration, /if p_position_id is not null and v_is_new_methodology then/)
assert.match(migration, /if v_is_new_methodology then\s+v_sync:=public\.admin_sync_user_training\(p_user_id\);/)
assert.match(migration, /Registro histórico: no se modifica la formación existente/)
assert.match(migration, /Cargo histórico registrado sin generar ni cambiar matrículas/)
assert.match(userPanels, /onCreatePosition/)

// Role changes never grant admin/super_admin to standard administrators.
assert.match(staffRoles, /revisor: 'Supervisor \/ Revisor'/)
assert.match(users, /canChangeRoleFor/)
assert.match(migration, /v_actor_role = 'admin' and \(/)
assert.match(migration, /v_new_role not in \('colaborador','creador_contenido','revisor'\)/)
assert.match(migration, /public\.is_admin\(\)/)
assert.match(migration, /set raw_app_meta_data/)

// Trainer is distinct from author; notifications target designated responsible.
assert.match(coursePanels, /Responsable de la capacitación/)
assert.match(courseBuilder, /list_course_responsibles/)
assert.match(courseBuilder, /responsible_id: course\.responsible_id/)
assert.match(migration, /add column if not exists responsible_id uuid/)
assert.match(migration, /v_responsible.*v_title/s)
assert.match(migration, /'responsible_course_completed'/)
assert.match(migration, /'responsible_induction_completed'/)
assert.match(migration, /on conflict \(dedupe_key\) do nothing/g)
assert.match(migration, /status <> 'cancelled'/)
assert.match(migration, /La vinculación laboral debe confirmarla el área responsable/)

// A colleague profile can only be requested through the access-checked server RPC.
assert.match(notifications, /get_training_colleague_profile/)
assert.match(migration, /if not v_allowed then raise exception/)
assert.match(migration, /c\.responsible_id = auth\.uid\(\)/)
assert.doesNotMatch(migration.split('create or replace function public.get_training_colleague_profile')[1].split('create or replace function public.sync_training_on_profile_position')[0], /'email'/)

// Private cohort metrics require at least three people.
assert.match(positionMetrics, /admin_position_assessment_metrics/)
assert.match(compliance, /<PositionAssessmentAnalytics/)
assert.match(migration, /count\(distinct a\.user_id\) >= 3/)
assert.match(migration, /public\.is_admin\(\)/)
assert.match(migration, /ea\.submitted_at desc/)
assert.match(JSON.parse(pkg).scripts.build, /npm run test:position-responsibility/)
console.log('Nueva metodología prospectiva, historial intacto, cargos, notificaciones y métricas: contratos comprobados.')
