-- Aula EI · Motor de Formación y Cumplimiento 360 · V1
-- Primera instancia empresarial: cargos, competencias, rutas, cumplimiento,
-- automatizaciones, notificaciones, calendario, gamificación, analítica,
-- interoperabilidad, IA preparada y observabilidad.
--
-- Los cargos sembrados aquí son PROVISIONALES y deben validarse contra la
-- planta/catálogo oficial antes de marcarlos como definitivos.

begin;

create extension if not exists pgcrypto;

-- =========================================================
-- 1. CARGOS Y ESTRUCTURA ORGANIZACIONAL
-- =========================================================

create table if not exists public.job_positions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  department text,
  description text,
  status text not null default 'provisional'
    check (status in ('provisional','validated','inactive')),
  source_note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists job_position_id uuid references public.job_positions(id) on delete set null,
  add column if not exists department text,
  add column if not exists site text,
  add column if not exists supervisor_id uuid references public.profiles(id) on delete set null;

create index if not exists profiles_job_position_idx on public.profiles(job_position_id);
create index if not exists profiles_supervisor_idx on public.profiles(supervisor_id);

-- =========================================================
-- 2. COMPETENCIAS Y MATRIZ CARGO ↔ COMPETENCIA
-- =========================================================

create table if not exists public.competencies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null default 'corporativa',
  description text,
  max_level smallint not null default 5 check (max_level between 1 and 5),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_position_competencies (
  id uuid primary key default gen_random_uuid(),
  job_position_id uuid not null references public.job_positions(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete cascade,
  required_level smallint not null default 1 check (required_level between 1 and 5),
  mandatory boolean not null default true,
  weight numeric(5,2) not null default 1 check (weight >= 0),
  created_at timestamptz not null default now(),
  unique(job_position_id, competency_id)
);

create table if not exists public.course_competencies (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete cascade,
  granted_level smallint not null default 1 check (granted_level between 1 and 5),
  validity_days integer check (validity_days is null or validity_days > 0),
  created_at timestamptz not null default now(),
  unique(course_id, competency_id)
);

create table if not exists public.profile_competency_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  attained_level smallint not null default 1 check (attained_level between 1 and 5),
  evidence_type text not null default 'course'
    check (evidence_type in ('course','certificate','manual','external')),
  evidence_ref text,
  attained_at timestamptz not null default now(),
  valid_until timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists profile_competency_user_idx on public.profile_competency_evidence(user_id);
create index if not exists profile_competency_validity_idx on public.profile_competency_evidence(valid_until);
create unique index if not exists profile_competency_evidence_ref_idx
  on public.profile_competency_evidence(user_id,competency_id,evidence_type,evidence_ref)
  where evidence_ref is not null;

-- =========================================================
-- 3. RUTAS DE APRENDIZAJE Y PRERREQUISITOS
-- =========================================================

create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  job_position_id uuid references public.job_positions(id) on delete set null,
  version integer not null default 1,
  default_due_days integer not null default 30 check (default_due_days > 0),
  recertification_days integer check (recertification_days is null or recertification_days > 0),
  active boolean not null default true,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_path_steps (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  sort_order integer not null,
  step_type text not null default 'course'
    check (step_type in ('course','assessment','certification','activity','external')),
  title text not null,
  description text,
  course_id uuid references public.courses(id) on delete set null,
  required boolean not null default true,
  unlock_after_step_id uuid references public.learning_path_steps(id) on delete set null,
  due_offset_days integer check (due_offset_days is null or due_offset_days >= 0),
  minimum_score integer check (minimum_score is null or minimum_score between 0 and 100),
  config jsonb not null default '{}'::jsonb,
  unique(path_id, sort_order)
);

create index if not exists path_steps_path_idx on public.learning_path_steps(path_id, sort_order);

create table if not exists public.profile_learning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  due_at timestamptz,
  status text not null default 'assigned'
    check (status in ('assigned','in_progress','completed','overdue','cancelled')),
  source text not null default 'manual'
    check (source in ('manual','position','automation','recertification')),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id, path_id)
);

create index if not exists profile_paths_user_idx on public.profile_learning_paths(user_id);
create index if not exists profile_paths_due_idx on public.profile_learning_paths(due_at);

-- =========================================================
-- 4. CUMPLIMIENTO Y RECERTIFICACIÓN
-- =========================================================

create table if not exists public.course_compliance_rules (
  course_id uuid primary key references public.courses(id) on delete cascade,
  compliance_name text,
  valid_days integer check (valid_days is null or valid_days > 0),
  reminder_days integer[] not null default array[60,30,7],
  auto_reenroll boolean not null default false,
  mandatory boolean not null default false,
  evidence_retention_days integer not null default 1825,
  updated_at timestamptz not null default now()
);

create table if not exists public.job_position_course_requirements (
  id uuid primary key default gen_random_uuid(),
  job_position_id uuid not null references public.job_positions(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  mandatory boolean not null default true,
  due_days integer not null default 30,
  recertification_days integer,
  minimum_score integer check (minimum_score is null or minimum_score between 0 and 100),
  created_at timestamptz not null default now(),
  unique(job_position_id, course_id)
);

alter table public.certificates
  add column if not exists valid_until timestamptz,
  add column if not exists renewal_due_at timestamptz;

create table if not exists public.certificate_history (
  id uuid primary key default gen_random_uuid(),
  certificate_code text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  exam_attempt_id uuid,
  score integer,
  event_type text not null default 'issued' check (event_type in ('issued','recertified','manual')),
  issued_at timestamptz not null,
  valid_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(certificate_code, exam_attempt_id)
);

create index if not exists certificate_history_user_idx on public.certificate_history(user_id,issued_at desc);
create index if not exists certificate_history_validity_idx on public.certificate_history(valid_until);

-- =========================================================
-- 5. AUTOMATIZACIONES, NOTIFICACIONES Y CALENDARIO
-- =========================================================

create table if not exists public.learning_automation_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  trigger_type text not null,
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  priority integer not null default 100,
  last_run_at timestamptz,
  last_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default 'learning',
  title text not null,
  body text not null,
  action_url text,
  severity text not null default 'info' check (severity in ('info','success','warning','critical')),
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists learning_notifications_dedupe_idx
  on public.learning_notifications(user_id, dedupe_key)
  where dedupe_key is not null;
create index if not exists learning_notifications_user_idx
  on public.learning_notifications(user_id, read_at, created_at desc);

create table if not exists public.training_calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type text not null default 'training'
    check (event_type in ('training','deadline','session','assessment','recertification')),
  course_id uuid references public.courses(id) on delete set null,
  path_id uuid references public.learning_paths(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  capacity integer,
  audience jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 6. GAMIFICACIÓN
-- =========================================================

create table if not exists public.profile_gamification (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_activity_date date,
  last_activity_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.gamification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  xp_awarded integer not null default 0,
  source_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists gamification_unique_source_idx
  on public.gamification_events(user_id, event_type, source_ref)
  where source_ref is not null;

create table if not exists public.gamification_badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  icon text,
  criteria jsonb not null default '{}'::jsonb,
  xp_reward integer not null default 0,
  active boolean not null default true
);

create table if not exists public.profile_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.gamification_badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  source_ref text,
  unique(user_id, badge_id)
);

create table if not exists public.gamification_missions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  cadence text not null default 'weekly' check (cadence in ('once','daily','weekly','monthly')),
  xp_reward integer not null default 0,
  criteria jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

-- =========================================================
-- 7. EVENTOS, ANALÍTICA, xAPI E INTEROPERABILIDAD
-- =========================================================

create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  event_type text not null,
  verb text,
  object_type text,
  object_id text,
  session_id text,
  data jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists learning_events_user_time_idx on public.learning_events(user_id, occurred_at desc);
create index if not exists learning_events_course_time_idx on public.learning_events(course_id, occurred_at desc);
create index if not exists learning_events_type_time_idx on public.learning_events(event_type, occurred_at desc);

create table if not exists public.external_content_packages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  standard text not null check (standard in ('scorm_1_2','scorm_2004','xapi','cmi5','lti_1_3')),
  version text,
  status text not null default 'registered' check (status in ('registered','processing','ready','error','archived')),
  launch_url text,
  storage_path text,
  manifest jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_connectors (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  connector_type text not null,
  status text not null default 'planned' check (status in ('planned','configured','active','paused','error')),
  base_url text,
  scopes text[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_status jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_outbox (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid references public.integration_connectors(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','dead_letter')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- =========================================================
-- 8. IA PREPARADA Y OBSERVABILIDAD
-- =========================================================

create table if not exists public.ai_authoring_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  request_type text not null
    check (request_type in ('outline','questions','summary','ambiguity_review','alternate_bank','learner_answer')),
  source_ref text,
  prompt text,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','cancelled')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.app_telemetry_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  route text,
  message text,
  duration_ms numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists telemetry_type_time_idx on public.app_telemetry_events(event_type, created_at desc);

-- =========================================================
-- 9. SEMILLAS PROVISIONALES
-- =========================================================

insert into public.job_positions(code,name,department,description,status,source_note)
values
  ('CONDUCTOR','Conductor','Operaciones / Transporte','Cargo operativo asociado a conducción y seguridad vial.','provisional','Levantado a partir del Manual del Conductor y requerimientos operativos; validar contra catálogo oficial.'),
  ('ANALISTA_CALIDAD_MC','Analista de Calidad y Mejora Continua','Calidad y Mejora Continua','Cargo orientado a calidad, estandarización y mejora continua.','provisional','Cargo identificado en el contexto actual de Electroingeniería; validar denominación oficial.'),
  ('SUPERVISOR','Supervisor','Operaciones','Rol/cargo de supervisión operativa y seguimiento de personal.','provisional','Nombre inferido de flujos operativos existentes; validar denominación y alcance.')
on conflict(code) do update set
  name=excluded.name,
  department=excluded.department,
  description=excluded.description,
  source_note=excluded.source_note,
  updated_at=now();

insert into public.competencies(code,name,category,description,max_level)
values
  ('INDUCCION_CORPORATIVA','Inducción corporativa','corporativa','Comprende estructura, políticas, cultura y lineamientos base de la organización.',5),
  ('SEGURIDAD_VIAL','Seguridad vial','sst','Aplica principios de conducción segura, prevención y cumplimiento vial.',5),
  ('TRABAJO_SEGURO','Trabajo seguro','sst','Aplica controles, procedimientos y prácticas seguras durante la operación.',5),
  ('CALIDAD_MEJORA','Calidad y mejora continua','calidad','Interpreta procesos, evidencia, hallazgos y mejora continua.',5),
  ('CUMPLIMIENTO_OPERATIVO','Cumplimiento operativo y documental','cumplimiento','Cumple procedimientos, registros, evidencias y obligaciones internas.',5),
  ('COMPETENCIA_DIGITAL','Competencia digital','digital','Usa de forma adecuada herramientas digitales corporativas y plataformas internas.',5),
  ('SUPERVISION_OPERATIVA','Supervisión operativa','liderazgo','Coordina, verifica y retroalimenta la ejecución operativa del equipo.',5)
on conflict(code) do update set
  name=excluded.name,
  category=excluded.category,
  description=excluded.description,
  updated_at=now();

insert into public.job_position_competencies(job_position_id,competency_id,required_level,mandatory,weight)
select p.id,c.id,x.required_level,true,x.weight
from (values
  ('CONDUCTOR','INDUCCION_CORPORATIVA',1,1.0),
  ('CONDUCTOR','SEGURIDAD_VIAL',3,1.5),
  ('CONDUCTOR','TRABAJO_SEGURO',2,1.3),
  ('CONDUCTOR','CUMPLIMIENTO_OPERATIVO',2,1.0),
  ('ANALISTA_CALIDAD_MC','INDUCCION_CORPORATIVA',1,1.0),
  ('ANALISTA_CALIDAD_MC','CALIDAD_MEJORA',3,1.5),
  ('ANALISTA_CALIDAD_MC','CUMPLIMIENTO_OPERATIVO',3,1.2),
  ('ANALISTA_CALIDAD_MC','COMPETENCIA_DIGITAL',2,1.0),
  ('SUPERVISOR','INDUCCION_CORPORATIVA',1,1.0),
  ('SUPERVISOR','TRABAJO_SEGURO',3,1.4),
  ('SUPERVISOR','SUPERVISION_OPERATIVA',3,1.5),
  ('SUPERVISOR','CUMPLIMIENTO_OPERATIVO',3,1.2)
) as x(position_code,competency_code,required_level,weight)
join public.job_positions p on p.code=x.position_code
join public.competencies c on c.code=x.competency_code
on conflict(job_position_id,competency_id) do update set
  required_level=excluded.required_level,
  mandatory=excluded.mandatory,
  weight=excluded.weight;

insert into public.learning_paths(code,name,description,job_position_id,version,default_due_days,recertification_days,status)
select x.code,x.name,x.description,p.id,1,x.default_due,x.recert,'published'
from (values
  ('RUTA_BASE_CORPORATIVA','Ruta base corporativa','Ruta transversal para incorporación y fundamentos organizacionales.',null::text,30,365),
  ('RUTA_CONDUCTOR','Ruta de formación · Conductor','Inducción → Seguridad vial → Trabajo seguro → Evaluación → Certificación.','CONDUCTOR',30,365),
  ('RUTA_CALIDAD','Ruta de formación · Calidad y mejora continua','Inducción → Calidad y mejora → Cumplimiento documental → Evaluación → Certificación.','ANALISTA_CALIDAD_MC',45,365),
  ('RUTA_SUPERVISION','Ruta de formación · Supervisión','Inducción → Trabajo seguro → Supervisión operativa → Evaluación → Certificación.','SUPERVISOR',45,365)
) as x(code,name,description,position_code,default_due,recert)
left join public.job_positions p on p.code=x.position_code
on conflict(code) do update set
  name=excluded.name,
  description=excluded.description,
  job_position_id=excluded.job_position_id,
  default_due_days=excluded.default_due_days,
  recertification_days=excluded.recertification_days,
  updated_at=now();

-- Pasos iniciales. course_id queda NULL hasta vincular una capacitación existente.
insert into public.learning_path_steps(path_id,sort_order,step_type,title,description,required,due_offset_days)
select p.id,x.sort_order,x.step_type,x.title,x.description,true,x.due_offset
from (values
  ('RUTA_BASE_CORPORATIVA',1,'course','Inducción corporativa','Capacitación de ingreso y fundamentos de la organización.',0),
  ('RUTA_BASE_CORPORATIVA',2,'course','Políticas y cumplimiento base','Lineamientos corporativos y evidencia mínima de cumplimiento.',10),
  ('RUTA_BASE_CORPORATIVA',3,'assessment','Evaluación base','Validación de conocimientos fundamentales.',25),
  ('RUTA_BASE_CORPORATIVA',4,'certification','Certificación base','Cierre y evidencia de aprobación.',30),

  ('RUTA_CONDUCTOR',1,'course','Inducción corporativa','Ingreso y lineamientos generales.',0),
  ('RUTA_CONDUCTOR',2,'course','Seguridad vial','Conducción segura, prevención y cumplimiento.',7),
  ('RUTA_CONDUCTOR',3,'course','Trabajo seguro','Controles operativos y comportamiento seguro.',15),
  ('RUTA_CONDUCTOR',4,'assessment','Evaluación final','Evaluación integral de la ruta.',25),
  ('RUTA_CONDUCTOR',5,'certification','Certificación','Cierre, vigencia y recertificación.',30),

  ('RUTA_CALIDAD',1,'course','Inducción corporativa','Ingreso y lineamientos generales.',0),
  ('RUTA_CALIDAD',2,'course','Calidad y mejora continua','Procesos, riesgos, hallazgos y mejora.',10),
  ('RUTA_CALIDAD',3,'course','Cumplimiento documental','Evidencias, formatos, trazabilidad y control.',20),
  ('RUTA_CALIDAD',4,'assessment','Evaluación final','Evaluación integral de la ruta.',35),
  ('RUTA_CALIDAD',5,'certification','Certificación','Cierre y evidencia.',45),

  ('RUTA_SUPERVISION',1,'course','Inducción corporativa','Ingreso y lineamientos generales.',0),
  ('RUTA_SUPERVISION',2,'course','Trabajo seguro','Controles y seguimiento operativo.',10),
  ('RUTA_SUPERVISION',3,'course','Supervisión operativa','Seguimiento, retroalimentación y control.',20),
  ('RUTA_SUPERVISION',4,'assessment','Evaluación final','Evaluación integral de la ruta.',35),
  ('RUTA_SUPERVISION',5,'certification','Certificación','Cierre y evidencia.',45)
) as x(path_code,sort_order,step_type,title,description,due_offset)
join public.learning_paths p on p.code=x.path_code
on conflict(path_id,sort_order) do update set
  step_type=excluded.step_type,
  title=excluded.title,
  description=excluded.description,
  due_offset_days=excluded.due_offset_days;

insert into public.learning_automation_rules(code,name,description,trigger_type,conditions,actions,active,priority)
values
  ('AUTO_PATH_BY_POSITION','Asignar ruta por cargo','Al asignar un cargo, matricula automáticamente la ruta publicada correspondiente.','position_assigned','{"position_required":true}','{"assign_path":true,"assign_linked_courses":true}',true,10),
  ('DUE_REMINDER_7','Recordatorio 7 días','Notifica capacitaciones próximas a vencer.','schedule','{"days_before_due":7}','{"notify_user":true}',true,20),
  ('FAILED_TWICE','Dos intentos fallidos','Notifica al colaborador y supervisor después de dos intentos fallidos.','exam_attempt','{"failed_attempts":2}','{"notify_user":true,"notify_supervisor":true}',true,30),
  ('INACTIVITY_15','Inactividad 15 días','Recuerda al colaborador retomar su ruta después de 15 días sin actividad.','schedule','{"inactive_days":15}','{"notify_user":true}',true,40),
  ('RECERTIFICATION','Recertificación automática','Genera aviso y nueva matrícula cuando una certificación entra en ventana de renovación.','schedule','{"window_days":30}','{"notify_user":true,"reenroll":true}',true,50)
on conflict(code) do update set
  name=excluded.name,
  description=excluded.description,
  trigger_type=excluded.trigger_type,
  conditions=excluded.conditions,
  actions=excluded.actions,
  priority=excluded.priority,
  updated_at=now();

insert into public.gamification_badges(code,name,description,icon,criteria,xp_reward)
values
  ('PRIMER_PASO','Primer paso','Completaste tu primer contenido.','footprints','{"completed_blocks":1}',20),
  ('PRIMER_CERTIFICADO','Primera certificación','Obtuviste tu primer certificado en Aula EI.','award','{"certificates":1}',50),
  ('PERFECTO','Resultado perfecto','Lograste 100% en una evaluación final.','trophy','{"perfect_exam":true}',75),
  ('RACHA_3','Racha de 3 días','Aprendiste durante tres días consecutivos.','flame','{"streak":3}',30),
  ('RACHA_7','Racha de 7 días','Mantuviste una semana de aprendizaje continuo.','flame','{"streak":7}',80),
  ('CERTIFICADO_X3','Triple certificación','Obtuviste tres certificados.','medal','{"certificates":3}',100)
on conflict(code) do update set
  name=excluded.name,
  description=excluded.description,
  icon=excluded.icon,
  criteria=excluded.criteria,
  xp_reward=excluded.xp_reward;

insert into public.gamification_missions(code,title,description,cadence,xp_reward,criteria,active)
values
  ('MISION_SEMANAL_2_CONTENIDOS','Avanza esta semana','Completa 2 contenidos durante la semana.','weekly',35,'{"completed_blocks":2}',true),
  ('MISION_EXAMEN','Reto de evaluación','Presenta una evaluación final.','weekly',30,'{"exam_attempts":1}',true),
  ('MISION_RUTA','Continúa tu ruta','Avanza en al menos una capacitación asignada.','weekly',25,'{"learning_event":"course_progress"}',true)
on conflict(code) do update set
  title=excluded.title,
  description=excluded.description,
  cadence=excluded.cadence,
  xp_reward=excluded.xp_reward,
  criteria=excluded.criteria,
  active=excluded.active;

insert into public.integration_connectors(code,name,connector_type,status,scopes,config)
values
  ('WEBHOOKS','Webhooks corporativos','webhook','planned',array['completion','enrollment','certificate'],'{"direction":"outbound"}'),
  ('XAPI','xAPI / Learning Record Store','xapi','planned',array['statements:write','statements:read'],'{"version":"1.0.3"}'),
  ('SCORM','SCORM 1.2 / 2004','scorm','planned',array['package:launch','progress:read'],'{"versions":["1.2","2004"]}'),
  ('CMI5','cmi5','cmi5','planned',array['package:launch','xapi:write'],'{}'),
  ('LTI13','LTI 1.3','lti','planned',array['launch'],'{}'),
  ('RRHH','ERP / Recursos Humanos','api','planned',array['users:read','users:write','positions:read'],'{"purpose":"Sincronizar personas y cargos"}')
on conflict(code) do update set
  name=excluded.name,
  connector_type=excluded.connector_type,
  scopes=excluded.scopes,
  config=excluded.config,
  updated_at=now();

-- =========================================================
-- 10. FUNCIONES DE NEGOCIO
-- =========================================================

create or replace function public.touch_learning_activity()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_today date := current_date;
  v_previous date;
  v_streak integer;
begin
  if v_user is null or not public.is_aula_active(v_user) then
    raise exception 'Sesión de Aula EI requerida.';
  end if;

  select last_activity_date,current_streak
  into v_previous,v_streak
  from public.profile_gamification
  where user_id=v_user;

  if v_previous is null then
    v_streak := 1;
  elsif v_previous = v_today then
    v_streak := coalesce(v_streak,1);
  elsif v_previous = v_today - 1 then
    v_streak := coalesce(v_streak,0)+1;
  else
    v_streak := 1;
  end if;

  insert into public.profile_gamification(user_id,current_streak,longest_streak,last_activity_date,last_activity_at)
  values(v_user,v_streak,v_streak,v_today,now())
  on conflict(user_id) do update set
    current_streak=v_streak,
    longest_streak=greatest(public.profile_gamification.longest_streak,v_streak),
    last_activity_date=v_today,
    last_activity_at=now(),
    updated_at=now();

  return jsonb_build_object('streak',v_streak,'date',v_today);
end;
$$;

create or replace function public.award_learning_xp(
  p_user_id uuid,
  p_event_type text,
  p_xp integer,
  p_source_ref text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_id uuid;
begin
  insert into public.gamification_events(user_id,event_type,xp_awarded,source_ref,metadata)
  values(p_user_id,p_event_type,greatest(coalesce(p_xp,0),0),p_source_ref,coalesce(p_metadata,'{}'::jsonb))
  on conflict do nothing
  returning id into v_id;

  if v_id is null then return false; end if;

  insert into public.profile_gamification(user_id,xp,level,updated_at)
  values(p_user_id,greatest(coalesce(p_xp,0),0),1+floor(greatest(coalesce(p_xp,0),0)/250.0)::int,now())
  on conflict(user_id) do update set
    xp=public.profile_gamification.xp+greatest(coalesce(p_xp,0),0),
    level=1+floor((public.profile_gamification.xp+greatest(coalesce(p_xp,0),0))/250.0)::int,
    updated_at=now();

  return true;
end;
$$;

create or replace function public.log_learning_event(
  p_user_id uuid,
  p_course_id uuid,
  p_event_type text,
  p_verb text,
  p_object_type text,
  p_object_id text,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  insert into public.learning_events(user_id,course_id,event_type,verb,object_type,object_id,data)
  values(p_user_id,p_course_id,p_event_type,p_verb,p_object_type,p_object_id,coalesce(p_data,'{}'::jsonb));
end;
$$;

create or replace function public.learning360_block_progress_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_course uuid;
begin
  if new.status='completed' and (tg_op='INSERT' or old.status is distinct from new.status) then
    select p.course_id into v_course
    from public.content_blocks b
    join public.course_phases p on p.id=b.phase_id
    where b.id=new.block_id;

    perform public.award_learning_xp(new.user_id,'block_completed',10,new.block_id::text,jsonb_build_object('course_id',v_course));
    perform public.log_learning_event(new.user_id,v_course,'block_completed','completed','content_block',new.block_id::text,jsonb_build_object('progress_percent',new.progress_percent));
  end if;
  return new;
end;
$$;

drop trigger if exists learning360_block_progress on public.block_progress;
create trigger learning360_block_progress
after insert or update of status on public.block_progress
for each row execute function public.learning360_block_progress_trigger();

create or replace function public.learning360_exam_attempt_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  perform public.award_learning_xp(
    new.user_id,
    case when new.passed then 'exam_passed' else 'exam_attempted' end,
    case when new.passed then 50 else 15 end,
    new.id::text,
    jsonb_build_object('course_id',new.course_id,'score',new.score,'passed',new.passed)
  );
  perform public.log_learning_event(
    new.user_id,new.course_id,'exam_attempt',
    case when new.passed then 'passed' else 'attempted' end,
    'exam_attempt',new.id::text,
    jsonb_build_object('score',new.score,'passed',new.passed)
  );
  return new;
end;
$$;

drop trigger if exists learning360_exam_attempt on public.exam_attempts;
create trigger learning360_exam_attempt
after insert on public.exam_attempts
for each row execute function public.learning360_exam_attempt_trigger();

create or replace function public.learning360_certificate_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_valid_days integer;
  v_effective_issued timestamptz;
  v_valid_until timestamptz;
  v_event_type text;
  v_source_ref text;
begin
  -- Solo procesar una emisión inicial o un nuevo intento asociado al certificado.
  if tg_op='UPDATE' and old.exam_attempt_id is not distinct from new.exam_attempt_id then
    return new;
  end if;

  select valid_days into v_valid_days
  from public.course_compliance_rules
  where course_id=new.course_id;

  v_effective_issued := case when tg_op='INSERT' then coalesce(new.issued_at,now()) else now() end;
  v_valid_until := case when v_valid_days is null then new.valid_until else v_effective_issued + make_interval(days=>v_valid_days) end;
  v_event_type := case when tg_op='INSERT' then 'issued' else 'recertified' end;
  v_source_ref := new.certificate_code||':'||coalesce(new.exam_attempt_id::text,'manual');

  if v_valid_days is not null then
    update public.certificates
    set valid_until=v_valid_until,
        renewal_due_at=v_effective_issued + make_interval(days=>greatest(v_valid_days-30,1))
    where certificate_code=new.certificate_code;
  end if;

  insert into public.certificate_history(
    certificate_code,user_id,course_id,exam_attempt_id,score,event_type,issued_at,valid_until,metadata
  )
  values(
    new.certificate_code,new.user_id,new.course_id,new.exam_attempt_id,new.score,v_event_type,
    v_effective_issued,v_valid_until,jsonb_build_object('source','learning360')
  )
  on conflict(certificate_code,exam_attempt_id) do nothing;

  insert into public.profile_competency_evidence(
    user_id,competency_id,course_id,attained_level,evidence_type,evidence_ref,attained_at,valid_until,metadata
  )
  select
    new.user_id,cc.competency_id,new.course_id,cc.granted_level,'certificate',v_source_ref,
    v_effective_issued,
    case
      when cc.validity_days is not null then v_effective_issued + make_interval(days=>cc.validity_days)
      else v_valid_until
    end,
    jsonb_build_object('certificate_code',new.certificate_code,'exam_attempt_id',new.exam_attempt_id)
  from public.course_competencies cc
  where cc.course_id=new.course_id
  on conflict do nothing;

  perform public.award_learning_xp(new.user_id,'certificate_earned',100,v_source_ref,jsonb_build_object('course_id',new.course_id,'score',new.score,'event_type',v_event_type));
  perform public.log_learning_event(new.user_id,new.course_id,'certificate_earned',case when v_event_type='recertified' then 'recertified' else 'earned' end,'certificate',v_source_ref,jsonb_build_object('score',new.score,'valid_until',v_valid_until));

  return new;
end;
$$;

drop trigger if exists learning360_certificate on public.certificates;
create trigger learning360_certificate
after insert or update of exam_attempt_id on public.certificates
for each row execute function public.learning360_certificate_trigger();

create or replace function public.admin_assign_profile_position(p_user_id uuid,p_position_id uuid)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores pueden asignar cargos.'; end if;
  if not exists(select 1 from public.job_positions where id=p_position_id and active=true) then
    raise exception 'Cargo no disponible.';
  end if;

  update public.profiles
  set job_position_id=p_position_id,updated_at=now()
  where id=p_user_id;

  insert into public.profile_learning_paths(user_id,path_id,due_at,status,source)
  select p_user_id,lp.id,now()+make_interval(days=>lp.default_due_days),'assigned','position'
  from public.learning_paths lp
  where lp.active=true and lp.status='published'
    and (lp.job_position_id=p_position_id or lp.job_position_id is null)
  on conflict(user_id,path_id) do nothing;
end;
$$;

create or replace function public.admin_run_learning_automations()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_paths integer := 0;
  v_enrollments integer := 0;
  v_notifications integer := 0;
  v_supervisor_notifications integer := 0;
  v_reenrollments integer := 0;
begin
  if not public.is_admin() then raise exception 'Solo administradores pueden ejecutar automatizaciones.'; end if;

  -- 1) Rutas por cargo.
  with ins as (
    insert into public.profile_learning_paths(user_id,path_id,due_at,status,source)
    select pr.id,lp.id,now()+make_interval(days=>lp.default_due_days),'assigned','position'
    from public.profiles pr
    join public.learning_paths lp
      on lp.active=true and lp.status='published'
     and (lp.job_position_id=pr.job_position_id or lp.job_position_id is null)
    where pr.is_active=true
      and pr.job_position_id is not null
    on conflict(user_id,path_id) do nothing
    returning 1
  )
  select count(*) into v_paths from ins;

  -- 2) Cursos vinculados a pasos de ruta.
  with ins as (
    insert into public.enrollments(course_id,user_id,due_at,status)
    select s.course_id,plp.user_id,
      coalesce(plp.assigned_at + make_interval(days=>coalesce(s.due_offset_days,lp.default_due_days)),plp.due_at),
      'assigned'
    from public.profile_learning_paths plp
    join public.learning_paths lp on lp.id=plp.path_id
    join public.learning_path_steps s on s.path_id=lp.id
    where plp.status not in ('cancelled','completed')
      and s.step_type='course'
      and s.course_id is not null
      and not exists(
        select 1 from public.enrollments e
        where e.user_id=plp.user_id and e.course_id=s.course_id and coalesce(e.status,'assigned')<>'cancelled'
      )
    returning 1
  )
  select count(*) into v_enrollments from ins;

  -- 3) Aviso a 7 días.
  with ins as (
    insert into public.learning_notifications(user_id,category,title,body,action_url,severity,dedupe_key,metadata)
    select e.user_id,'deadline','Capacitación próxima a vencer',
      'Tu capacitación "'||c.title||'" vence el '||to_char(e.due_at,'DD/MM/YYYY')||'.',
      '/#/course/'||e.course_id::text,'warning',
      'due7:'||e.id::text||':'||to_char(e.due_at::date,'YYYYMMDD'),
      jsonb_build_object('course_id',e.course_id,'due_at',e.due_at)
    from public.enrollments e
    join public.courses c on c.id=e.course_id
    where e.due_at::date between current_date and current_date+7
      and coalesce(e.status,'assigned') not in ('completed','cancelled')
    on conflict do nothing
    returning 1
  )
  select count(*) into v_notifications from ins;

  -- 4) Dos o más intentos fallidos: usuario.
  with failed as (
    select user_id,course_id,count(*) count_failed,max(created_at) last_failed
    from public.exam_attempts
    where passed=false
    group by user_id,course_id
    having count(*)>=2
  ), ins as (
    insert into public.learning_notifications(user_id,category,title,body,action_url,severity,dedupe_key,metadata)
    select f.user_id,'assessment','Revisemos esta capacitación',
      'Ya realizaste dos intentos sin aprobar. Repasa los contenidos antes de volver a presentar el examen.',
      '/#/course/'||f.course_id::text,'warning',
      'failed2:'||f.user_id::text||':'||f.course_id::text,
      jsonb_build_object('course_id',f.course_id,'failed_attempts',f.count_failed)
    from failed f
    on conflict do nothing
    returning 1
  )
  select v_notifications+count(*) into v_notifications from ins;

  -- 5) Dos o más intentos fallidos: supervisor.
  with failed as (
    select a.user_id,a.course_id,count(*) count_failed
    from public.exam_attempts a
    where a.passed=false
    group by a.user_id,a.course_id
    having count(*)>=2
  ), ins as (
    insert into public.learning_notifications(user_id,category,title,body,severity,dedupe_key,metadata)
    select p.supervisor_id,'supervision','Seguimiento de aprendizaje',
      coalesce(p.full_name,p.email,'Un colaborador')||' acumula dos o más intentos fallidos en una capacitación.',
      'warning',
      'supervisor-failed2:'||p.id::text||':'||f.course_id::text,
      jsonb_build_object('user_id',p.id,'course_id',f.course_id,'failed_attempts',f.count_failed)
    from failed f
    join public.profiles p on p.id=f.user_id
    where p.supervisor_id is not null
    on conflict do nothing
    returning 1
  )
  select count(*) into v_supervisor_notifications from ins;

  -- 6) Inactividad 15 días.
  with ins as (
    insert into public.learning_notifications(user_id,category,title,body,action_url,severity,dedupe_key)
    select pr.id,'engagement','Retoma tu ruta de aprendizaje',
      'Han pasado 15 días o más desde tu última actividad. Continúa donde quedaste.',
      '/#/journey','info',
      'inactive15:'||pr.id::text||':'||to_char(current_date,'IYYYIW')
    from public.profiles pr
    left join public.profile_gamification g on g.user_id=pr.id
    where pr.is_active=true
      and coalesce(g.last_activity_at,pr.updated_at,pr.created_at) < now()-interval '15 days'
    on conflict do nothing
    returning 1
  )
  select v_notifications+count(*) into v_notifications from ins;

  -- 7) Recertificación. Solo aplica cuando el curso tiene regla y certificado con vigencia.
  with candidates as (
    select cert.user_id,cert.course_id,cert.valid_until,r.auto_reenroll
    from public.certificates cert
    join public.course_compliance_rules r on r.course_id=cert.course_id
    where cert.valid_until is not null
      and cert.valid_until <= now()+interval '30 days'
  ), notif as (
    insert into public.learning_notifications(user_id,category,title,body,action_url,severity,dedupe_key,metadata)
    select c.user_id,'recertification','Recertificación próxima',
      'Tu certificación entra en ventana de renovación. Revisa la capacitación asignada.',
      '/#/catalog','warning',
      'recert:'||c.user_id::text||':'||c.course_id::text||':'||to_char(c.valid_until::date,'YYYYMMDD'),
      jsonb_build_object('course_id',c.course_id,'valid_until',c.valid_until)
    from candidates c
    on conflict do nothing
    returning 1
  )
  select v_notifications+count(*) into v_notifications from notif;

  with candidates as (
    select cert.user_id,cert.course_id
    from public.certificates cert
    join public.course_compliance_rules r on r.course_id=cert.course_id
    where r.auto_reenroll=true
      and cert.valid_until is not null
      and cert.valid_until <= now()+interval '30 days'
      and not exists(
        select 1 from public.enrollments e
        where e.user_id=cert.user_id and e.course_id=cert.course_id
          and coalesce(e.status,'assigned') not in ('completed','cancelled')
      )
  ), ins as (
    insert into public.enrollments(course_id,user_id,due_at,status)
    select course_id,user_id,now()+interval '30 days','assigned'
    from candidates
    returning 1
  )
  select count(*) into v_reenrollments from ins;

  update public.learning_automation_rules
  set last_run_at=now(),
      last_result=jsonb_build_object(
        'paths_assigned',v_paths,
        'course_enrollments',v_enrollments,
        'notifications',v_notifications,
        'supervisor_notifications',v_supervisor_notifications,
        'recertification_enrollments',v_reenrollments,
        'ran_at',now()
      ),
      updated_at=now()
  where active=true;

  return jsonb_build_object(
    'paths_assigned',v_paths,
    'course_enrollments',v_enrollments,
    'notifications',v_notifications,
    'supervisor_notifications',v_supervisor_notifications,
    'recertification_enrollments',v_reenrollments,
    'ran_at',now()
  );
end;
$$;

create or replace function public.get_my_learning_360()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null or not public.is_aula_active(v_user) then
    raise exception 'Sesión de Aula EI requerida.';
  end if;

  select jsonb_build_object(
    'profile',jsonb_build_object(
      'id',p.id,
      'full_name',p.full_name,
      'email',p.email,
      'role',p.role,
      'department',p.department,
      'site',p.site,
      'position',case when jp.id is null then null else jsonb_build_object('id',jp.id,'code',jp.code,'name',jp.name,'status',jp.status) end
    ),
    'paths',coalesce((
      select jsonb_agg(jsonb_build_object(
        'assignment_id',plp.id,
        'status',plp.status,
        'assigned_at',plp.assigned_at,
        'due_at',plp.due_at,
        'path',jsonb_build_object('id',lp.id,'code',lp.code,'name',lp.name,'description',lp.description),
        'steps',coalesce((
          select jsonb_agg(jsonb_build_object(
            'id',s.id,'sort_order',s.sort_order,'step_type',s.step_type,'title',s.title,'required',s.required,
            'course_id',s.course_id,
            'course_title',c.title,
            'course_status',e.status,
            'due_at',e.due_at,
            'linked',s.course_id is not null
          ) order by s.sort_order)
          from public.learning_path_steps s
          left join public.courses c on c.id=s.course_id
          left join public.enrollments e on e.course_id=s.course_id and e.user_id=v_user and coalesce(e.status,'assigned')<>'cancelled'
          where s.path_id=lp.id
        ),'[]'::jsonb)
      ) order by plp.assigned_at desc)
      from public.profile_learning_paths plp
      join public.learning_paths lp on lp.id=plp.path_id
      where plp.user_id=v_user and plp.status<>'cancelled'
    ),'[]'::jsonb),
    'competencies',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'code',c.code,'name',c.name,'category',c.category,
        'required_level',jpc.required_level,
        'attained_level',coalesce(ev.attained_level,0),
        'valid_until',ev.valid_until,
        'gap',greatest(jpc.required_level-coalesce(ev.attained_level,0),0)
      ) order by c.category,c.name)
      from public.profiles pp
      join public.job_position_competencies jpc on jpc.job_position_id=pp.job_position_id
      join public.competencies c on c.id=jpc.competency_id
      left join lateral (
        select max(e.attained_level) attained_level,max(e.valid_until) valid_until
        from public.profile_competency_evidence e
        where e.user_id=v_user and e.competency_id=c.id
          and (e.valid_until is null or e.valid_until>now())
      ) ev on true
      where pp.id=v_user
    ),'[]'::jsonb),
    'notifications',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',n.id,'category',n.category,'title',n.title,'body',n.body,'action_url',n.action_url,
        'severity',n.severity,'read_at',n.read_at,'created_at',n.created_at
      ) order by n.created_at desc)
      from (
        select * from public.learning_notifications
        where user_id=v_user
        order by created_at desc
        limit 20
      ) n
    ),'[]'::jsonb),
    'calendar',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',e.id,'title',e.title,'event_type',e.event_type,'starts_at',e.starts_at,'ends_at',e.ends_at,'location',e.location
      ) order by e.starts_at)
      from (
        select * from public.training_calendar_events
        where active=true and starts_at>=now()-interval '1 day'
        order by starts_at
        limit 20
      ) e
    ),'[]'::jsonb),
    'gamification',jsonb_build_object(
      'xp',coalesce(g.xp,0),
      'level',coalesce(g.level,1),
      'current_streak',coalesce(g.current_streak,0),
      'longest_streak',coalesce(g.longest_streak,0),
      'badges',coalesce((
        select jsonb_agg(jsonb_build_object('code',b.code,'name',b.name,'description',b.description,'icon',b.icon,'awarded_at',pb.awarded_at) order by pb.awarded_at desc)
        from public.profile_badges pb
        join public.gamification_badges b on b.id=pb.badge_id
        where pb.user_id=v_user
      ),'[]'::jsonb)
    )
  )
  into v_result
  from public.profiles p
  left join public.job_positions jp on jp.id=p.job_position_id
  left join public.profile_gamification g on g.user_id=p.id
  where p.id=v_user;

  return coalesce(v_result,'{}'::jsonb);
end;
$$;

create or replace function public.admin_learning_360_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Solo administradores pueden consultar analítica 360.'; end if;

  select jsonb_build_object(
    'people_total',(select count(*) from public.profiles where is_active=true),
    'people_with_position',(select count(*) from public.profiles where is_active=true and job_position_id is not null),
    'positions_total',(select count(*) from public.job_positions where active=true),
    'paths_total',(select count(*) from public.learning_paths where active=true),
    'path_assignments',(select count(*) from public.profile_learning_paths where status<>'cancelled'),
    'overdue_enrollments',(select count(*) from public.enrollments where due_at<now() and coalesce(status,'assigned') not in ('completed','cancelled')),
    'due_7',(select count(*) from public.enrollments where due_at::date between current_date and current_date+7 and coalesce(status,'assigned') not in ('completed','cancelled')),
    'due_30',(select count(*) from public.enrollments where due_at::date between current_date and current_date+30 and coalesce(status,'assigned') not in ('completed','cancelled')),
    'due_60',(select count(*) from public.enrollments where due_at::date between current_date and current_date+60 and coalesce(status,'assigned') not in ('completed','cancelled')),
    'avg_exam_score',(select round(avg(score)::numeric,1) from public.exam_attempts),
    'exam_pass_rate',(select round((100.0*sum(case when passed then 1 else 0 end)/nullif(count(*),0))::numeric,1) from public.exam_attempts),
    'avg_completion_hours',(select round(avg(extract(epoch from (updated_at-created_at))/3600.0)::numeric,1) from public.enrollments where status='completed' and updated_at>=created_at),
    'avg_attempts_per_user',(select round(avg(attempts)::numeric,2) from (select user_id,course_id,count(*) attempts from public.exam_attempts group by user_id,course_id) x),
    'certificates_total',(select count(*) from public.certificates),
    'certificates_expiring_30',(select count(*) from public.certificates where valid_until between now() and now()+interval '30 days'),
    'unread_notifications',(select count(*) from public.learning_notifications where read_at is null),
    'automation_rules_active',(select count(*) from public.learning_automation_rules where active=true),
    'telemetry_errors_24h',(select count(*) from public.app_telemetry_events where event_type in ('error','unhandledrejection') and created_at>now()-interval '24 hours'),
    'risk_users',coalesce((
      select jsonb_agg(row_to_json(r))
      from (
        select p.id,p.full_name,p.email,
          count(*) filter(where e.due_at<now() and coalesce(e.status,'assigned') not in ('completed','cancelled')) overdue,
          count(*) filter(where a.passed=false) failed_attempts
        from public.profiles p
        left join public.enrollments e on e.user_id=p.id
        left join public.exam_attempts a on a.user_id=p.id
        where p.is_active=true
        group by p.id,p.full_name,p.email
        having count(*) filter(where e.due_at<now() and coalesce(e.status,'assigned') not in ('completed','cancelled'))>0
            or count(*) filter(where a.passed=false)>=2
        order by overdue desc,failed_attempts desc
        limit 12
      ) r
    ),'[]'::jsonb),
    'course_health',coalesce((
      select jsonb_agg(row_to_json(ch))
      from (
        select c.id,c.title,
          count(a.id) attempts,
          round(avg(a.score)::numeric,1) avg_score,
          round((100.0*sum(case when a.passed then 1 else 0 end)/nullif(count(a.id),0))::numeric,1) pass_rate
        from public.courses c
        left join public.exam_attempts a on a.course_id=c.id
        group by c.id,c.title
        order by count(a.id) desc,c.title
        limit 15
      ) ch
    ),'[]'::jsonb),
    'hardest_questions',coalesce((
      select jsonb_agg(row_to_json(hq))
      from (
        select q.id,q.prompt,c.title course_title,
          count(a.id) responses,
          round((100.0*sum(case when (a.answers->>q.id::text) is distinct from o.id::text then 1 else 0 end)/nullif(count(a.id),0))::numeric,1) error_rate
        from public.questions q
        join public.courses c on c.id=q.course_id
        join public.question_options o on o.question_id=q.id and o.is_correct=true
        join public.exam_attempts a on a.course_id=q.course_id and a.answers ? q.id::text
        where q.active=true
        group by q.id,q.prompt,c.title,o.id
        having count(a.id)>0
        order by error_rate desc,responses desc
        limit 10
      ) hq
    ),'[]'::jsonb),
    'stalled_blocks',coalesce((
      select jsonb_agg(row_to_json(sb))
      from (
        select b.id,b.title,c.title course_title,
          count(*) filter(where bp.status<>'completed') stalled,
          count(*) total_progress_records
        from public.block_progress bp
        join public.content_blocks b on b.id=bp.block_id
        join public.course_phases ph on ph.id=b.phase_id
        join public.courses c on c.id=ph.course_id
        group by b.id,b.title,c.title
        having count(*) filter(where bp.status<>'completed')>0
        order by stalled desc,total_progress_records desc
        limit 10
      ) sb
    ),'[]'::jsonb),
    'cohorts',coalesce((
      select jsonb_agg(row_to_json(cohort))
      from (
        select to_char(date_trunc('month',created_at),'YYYY-MM') month,
          count(*) assigned,
          count(*) filter(where status='completed') completed,
          round((100.0*count(*) filter(where status='completed')/nullif(count(*),0))::numeric,1) completion_rate
        from public.enrollments
        group by date_trunc('month',created_at)
        order by date_trunc('month',created_at) desc
        limit 12
      ) cohort
    ),'[]'::jsonb),
    'position_breakdown',coalesce((
      select jsonb_agg(row_to_json(pb))
      from (
        select jp.id,jp.name,jp.status,count(p.id) people
        from public.job_positions jp
        left join public.profiles p on p.job_position_id=jp.id and p.is_active=true
        where jp.active=true
        group by jp.id,jp.name,jp.status
        order by people desc,jp.name
      ) pb
    ),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.record_external_learning_event(
  p_course_id uuid,
  p_event_type text,
  p_verb text,
  p_object_type text,
  p_object_id text,
  p_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or not public.is_aula_active(v_user) then
    raise exception 'Sesión de Aula EI requerida.';
  end if;

  if p_course_id is not null and not (
    public.can_manage_courses() or public.is_enrolled(p_course_id,v_user)
  ) then
    raise exception 'No tienes acceso a la capacitación indicada.';
  end if;

  insert into public.learning_events(user_id,course_id,event_type,verb,object_type,object_id,data)
  values(
    v_user,
    p_course_id,
    left(coalesce(p_event_type,'external_event'),100),
    left(coalesce(p_verb,'experienced'),100),
    left(coalesce(p_object_type,'activity'),100),
    left(coalesce(p_object_id,''),500),
    coalesce(p_data,'{}'::jsonb)
  );

  return jsonb_build_object('ok',true,'recorded_at',now());
end;
$;

create or replace function public.record_aula_telemetry(
  p_event_type text,
  p_route text,
  p_message text default null,
  p_duration_ms numeric default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.app_telemetry_events(user_id,event_type,route,message,duration_ms,metadata)
  values(auth.uid(),left(coalesce(p_event_type,'event'),80),left(coalesce(p_route,''),300),left(coalesce(p_message,''),2000),p_duration_ms,coalesce(p_metadata,'{}'::jsonb));
end;
$$;

-- =========================================================
-- 11. RLS Y PERMISOS
-- =========================================================

alter table public.job_positions enable row level security;
alter table public.competencies enable row level security;
alter table public.job_position_competencies enable row level security;
alter table public.course_competencies enable row level security;
alter table public.profile_competency_evidence enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_path_steps enable row level security;
alter table public.profile_learning_paths enable row level security;
alter table public.course_compliance_rules enable row level security;
alter table public.job_position_course_requirements enable row level security;
alter table public.certificate_history enable row level security;
alter table public.learning_automation_rules enable row level security;
alter table public.learning_notifications enable row level security;
alter table public.training_calendar_events enable row level security;
alter table public.profile_gamification enable row level security;
alter table public.gamification_events enable row level security;
alter table public.gamification_badges enable row level security;
alter table public.profile_badges enable row level security;
alter table public.gamification_missions enable row level security;
alter table public.learning_events enable row level security;
alter table public.external_content_packages enable row level security;
alter table public.integration_connectors enable row level security;
alter table public.integration_outbox enable row level security;
alter table public.ai_authoring_requests enable row level security;
alter table public.app_telemetry_events enable row level security;

-- Catálogos visibles a usuarios autenticados.
create policy job_positions_read on public.job_positions for select to authenticated using (active=true or public.is_admin());
create policy competencies_read on public.competencies for select to authenticated using (active=true or public.is_admin());
create policy position_competencies_read on public.job_position_competencies for select to authenticated using (true);
create policy course_competencies_read on public.course_competencies for select to authenticated using (true);
create policy learning_paths_read on public.learning_paths for select to authenticated using (active=true or public.is_admin());
create policy learning_path_steps_read on public.learning_path_steps for select to authenticated using (true);
create policy badges_read on public.gamification_badges for select to authenticated using (active=true or public.is_admin());
create policy missions_read on public.gamification_missions for select to authenticated using (active=true or public.is_admin());
create policy calendar_read on public.training_calendar_events for select to authenticated using (active=true or public.is_admin());

-- Admin CRUD en catálogos/configuración.
create policy job_positions_admin on public.job_positions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy competencies_admin on public.competencies for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy position_competencies_admin on public.job_position_competencies for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy course_competencies_admin on public.course_competencies for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy learning_paths_admin on public.learning_paths for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy learning_path_steps_admin on public.learning_path_steps for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy compliance_rules_admin on public.course_compliance_rules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy position_requirements_admin on public.job_position_course_requirements for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy automation_rules_admin on public.learning_automation_rules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy calendar_admin on public.training_calendar_events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy badges_admin on public.gamification_badges for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy missions_admin on public.gamification_missions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy packages_admin on public.external_content_packages for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy connectors_admin on public.integration_connectors for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy outbox_admin on public.integration_outbox for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ai_requests_admin on public.ai_authoring_requests for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Datos personales.
create policy profile_paths_self_admin on public.profile_learning_paths for select to authenticated
  using (user_id=auth.uid() or public.is_admin());
create policy profile_paths_admin_write on public.profile_learning_paths for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy competency_evidence_self_admin on public.profile_competency_evidence for select to authenticated
  using (user_id=auth.uid() or public.is_admin());
create policy certificate_history_self_admin on public.certificate_history for select to authenticated
  using (user_id=auth.uid() or public.is_admin());
create policy competency_evidence_admin_write on public.profile_competency_evidence for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy notifications_self_admin on public.learning_notifications for select to authenticated
  using (user_id=auth.uid() or public.is_admin());
create policy notifications_self_update on public.learning_notifications for update to authenticated
  using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy notifications_admin_write on public.learning_notifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy gamification_self_admin on public.profile_gamification for select to authenticated
  using (user_id=auth.uid() or public.is_admin());
create policy gamification_events_self_admin on public.gamification_events for select to authenticated
  using (user_id=auth.uid() or public.is_admin());
create policy profile_badges_self_admin on public.profile_badges for select to authenticated
  using (user_id=auth.uid() or public.is_admin());

-- Learning events: solo lectura admin; escrituras por funciones SECURITY DEFINER.
create policy learning_events_admin_read on public.learning_events for select to authenticated using (public.is_admin());
create policy telemetry_admin_read on public.app_telemetry_events for select to authenticated using (public.is_admin());

-- Paquetes externos pueden ser leídos por personal de contenido/admin.
create policy packages_staff_read on public.external_content_packages for select to authenticated using (public.can_manage_courses());

-- Conectores y outbox solo admin.
create policy connectors_admin_read on public.integration_connectors for select to authenticated using (public.is_admin());
create policy outbox_admin_read on public.integration_outbox for select to authenticated using (public.is_admin());
create policy ai_requests_self_read on public.ai_authoring_requests for select to authenticated
  using (requested_by=auth.uid() or public.is_admin());

-- Escritura directa restringida en eventos sensibles.
revoke insert,update,delete on public.gamification_events from anon,authenticated;
revoke insert,update,delete on public.learning_events from anon,authenticated;
revoke insert,update,delete on public.app_telemetry_events from anon,authenticated;
grant select on public.gamification_events,public.learning_events,public.app_telemetry_events to authenticated;

revoke execute on function public.touch_learning_activity() from public,anon;
revoke execute on function public.get_my_learning_360() from public,anon;
revoke execute on function public.admin_learning_360_snapshot() from public,anon;
revoke execute on function public.admin_run_learning_automations() from public,anon;
revoke execute on function public.admin_assign_profile_position(uuid,uuid) from public,anon;
revoke execute on function public.record_aula_telemetry(text,text,text,numeric,jsonb) from public,anon;
revoke execute on function public.record_external_learning_event(uuid,text,text,text,text,jsonb) from public,anon;

grant execute on function public.touch_learning_activity() to authenticated,service_role;
grant execute on function public.get_my_learning_360() to authenticated,service_role;
grant execute on function public.admin_learning_360_snapshot() to authenticated,service_role;
grant execute on function public.admin_run_learning_automations() to authenticated,service_role;
grant execute on function public.admin_assign_profile_position(uuid,uuid) to authenticated,service_role;
grant execute on function public.record_aula_telemetry(text,text,text,numeric,jsonb) to authenticated,service_role;
grant execute on function public.record_external_learning_event(uuid,text,text,text,text,jsonb) to authenticated,service_role;

commit;
