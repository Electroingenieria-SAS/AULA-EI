-- Aula EI · Motor de Formación y Cumplimiento v1
-- Cargos -> competencias -> rutas -> cursos -> matrícula -> evidencia -> recertificación
-- 2026-09-21

begin;

-- ---------------------------------------------------------------------------
-- 1. Catálogo de cargos / categorías laborales
-- ---------------------------------------------------------------------------
create table if not exists public.job_positions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  department text,
  position_type text not null default 'cargo'
    check (position_type in ('cargo','categoria')),
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_positions_active_name_idx
  on public.job_positions (is_active, name);

insert into public.job_positions (code,name,description,department,position_type,sort_order)
values
  ('TRABAJADOR','Trabajador','Categoría laboral general heredada. Se conserva como categoría provisional hasta completar el catálogo detallado de cargos.','General','categoria',900),
  ('VISITANTE','Visitante','Categoría temporal para personas que requieren acceso a contenidos de inducción o cumplimiento sin pertenecer a la planta habitual.','General','categoria',950),
  ('ANALISTA_CALIDAD_MEJORA_CONTINUA','Analista de Calidad y Mejora Continua','Cargo inicial levantado para el frente de Calidad y Mejora Continua.','Calidad y Mejora Continua','cargo',100),
  ('DIRECTORA_MEJORAMIENTO_CONTINUO','Directora de Mejoramiento Continuo','Cargo directivo inicial levantado para el frente de Mejoramiento Continuo.','Mejoramiento Continuo','cargo',110)
on conflict (code) do nothing;

alter table public.profiles
  add column if not exists job_position_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_job_position_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_job_position_id_fkey
      foreign key (job_position_id)
      references public.job_positions(id)
      on delete set null;
  end if;
end $$;

create index if not exists profiles_job_position_idx
  on public.profiles (job_position_id)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- 2. Competencias
-- ---------------------------------------------------------------------------
create table if not exists public.training_competencies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  category text not null default 'corporativa',
  level_max integer not null default 5 check (level_max between 1 and 5),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.training_competencies (code,name,description,category)
values
  ('INDUCCION_CORPORATIVA','Inducción corporativa','Conocimiento de la organización, lineamientos internos y responsabilidades básicas.','corporativa'),
  ('SEGURIDAD_SALUD_TRABAJO','Seguridad y salud en el trabajo','Competencias de prevención, autocuidado y actuación segura.','seguridad'),
  ('CALIDAD_MEJORA_CONTINUA','Calidad y mejora continua','Aplicación de estándares, análisis de hallazgos, seguimiento y mejora.','calidad'),
  ('GESTION_DOCUMENTAL','Gestión documental','Manejo adecuado de documentos, registros, versiones y evidencias.','gestion'),
  ('SEGURIDAD_DIGITAL','Seguridad digital','Buenas prácticas de seguridad de la información y uso responsable de recursos digitales.','digital'),
  ('CUMPLIMIENTO_NORMATIVO','Cumplimiento normativo','Comprensión y aplicación de obligaciones, políticas y procedimientos internos.','cumplimiento')
on conflict (code) do nothing;

create table if not exists public.job_position_competencies (
  position_id uuid not null references public.job_positions(id) on delete cascade,
  competency_id uuid not null references public.training_competencies(id) on delete cascade,
  required_level integer not null default 1 check (required_level between 1 and 5),
  weight numeric(6,2) not null default 1 check (weight > 0),
  created_at timestamptz not null default now(),
  primary key (position_id, competency_id)
);

-- Base provisional. Podrá editarse desde Aula EI.
insert into public.job_position_competencies(position_id,competency_id,required_level,weight)
select p.id,c.id,x.required_level,x.weight
from (
  values
    ('TRABAJADOR','INDUCCION_CORPORATIVA',1,1.0::numeric),
    ('TRABAJADOR','SEGURIDAD_SALUD_TRABAJO',2,1.5::numeric),
    ('TRABAJADOR','SEGURIDAD_DIGITAL',1,1.0::numeric),
    ('VISITANTE','INDUCCION_CORPORATIVA',1,1.0::numeric),
    ('VISITANTE','SEGURIDAD_SALUD_TRABAJO',1,1.0::numeric),
    ('ANALISTA_CALIDAD_MEJORA_CONTINUA','CALIDAD_MEJORA_CONTINUA',4,2.0::numeric),
    ('ANALISTA_CALIDAD_MEJORA_CONTINUA','GESTION_DOCUMENTAL',3,1.4::numeric),
    ('ANALISTA_CALIDAD_MEJORA_CONTINUA','SEGURIDAD_DIGITAL',2,1.0::numeric),
    ('ANALISTA_CALIDAD_MEJORA_CONTINUA','CUMPLIMIENTO_NORMATIVO',3,1.3::numeric),
    ('DIRECTORA_MEJORAMIENTO_CONTINUO','CALIDAD_MEJORA_CONTINUA',5,2.0::numeric),
    ('DIRECTORA_MEJORAMIENTO_CONTINUO','GESTION_DOCUMENTAL',4,1.4::numeric),
    ('DIRECTORA_MEJORAMIENTO_CONTINUO','SEGURIDAD_DIGITAL',3,1.0::numeric),
    ('DIRECTORA_MEJORAMIENTO_CONTINUO','CUMPLIMIENTO_NORMATIVO',4,1.5::numeric)
) as x(position_code, competency_code, required_level, weight)
join public.job_positions p on p.code=x.position_code
join public.training_competencies c on c.code=x.competency_code
on conflict (position_id,competency_id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Rutas de aprendizaje
-- ---------------------------------------------------------------------------
create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  version integer not null default 1 check (version > 0),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_path_courses (
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  sort_order integer not null default 100,
  required boolean not null default true,
  due_days integer check (due_days is null or due_days >= 0),
  recertification_months integer check (recertification_months is null or recertification_months > 0),
  created_at timestamptz not null default now(),
  primary key (path_id,course_id)
);

create index if not exists learning_path_courses_course_idx
  on public.learning_path_courses(course_id,path_id);

create table if not exists public.job_position_paths (
  position_id uuid not null references public.job_positions(id) on delete cascade,
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  required boolean not null default true,
  due_days integer check (due_days is null or due_days >= 0),
  recertification_months integer check (recertification_months is null or recertification_months > 0),
  created_at timestamptz not null default now(),
  primary key(position_id,path_id)
);

insert into public.learning_paths(code,name,description,version)
values
  ('RUTA_BASE_TRABAJADOR','Ruta base del trabajador','Ruta inicial para inducción y cumplimiento general. Los cursos se vinculan desde Gestión Aula EI.',1),
  ('RUTA_BASE_VISITANTE','Ruta base del visitante','Ruta inicial para inducción de visitantes y personal temporal. Los cursos se vinculan desde Gestión Aula EI.',1),
  ('RUTA_CALIDAD_MEJORA_CONTINUA','Ruta de Calidad y Mejora Continua','Ruta base para cargos del frente de Calidad y Mejora Continua. Los cursos se vinculan desde Gestión Aula EI.',1)
on conflict(code) do nothing;

insert into public.job_position_paths(position_id,path_id,required,due_days,recertification_months)
select p.id,l.id,true,x.due_days,x.recertification_months
from (
  values
    ('TRABAJADOR','RUTA_BASE_TRABAJADOR',30,null::integer),
    ('VISITANTE','RUTA_BASE_VISITANTE',7,null::integer),
    ('ANALISTA_CALIDAD_MEJORA_CONTINUA','RUTA_BASE_TRABAJADOR',30,null::integer),
    ('ANALISTA_CALIDAD_MEJORA_CONTINUA','RUTA_CALIDAD_MEJORA_CONTINUA',45,12),
    ('DIRECTORA_MEJORAMIENTO_CONTINUO','RUTA_BASE_TRABAJADOR',30,null::integer),
    ('DIRECTORA_MEJORAMIENTO_CONTINUO','RUTA_CALIDAD_MEJORA_CONTINUA',30,12)
) as x(position_code,path_code,due_days,recertification_months)
join public.job_positions p on p.code=x.position_code
join public.learning_paths l on l.code=x.path_code
on conflict(position_id,path_id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Historial, evidencia y automatizaciones
-- ---------------------------------------------------------------------------
create table if not exists public.profile_position_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  position_id uuid references public.job_positions(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists profile_position_history_user_idx
  on public.profile_position_history(user_id,effective_from desc);

create table if not exists public.compliance_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  evidence_type text not null default 'course_completion',
  reference_id text,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists compliance_evidence_user_course_idx
  on public.compliance_evidence(user_id,course_id,issued_at desc);
create index if not exists compliance_evidence_expiry_idx
  on public.compliance_evidence(expires_at)
  where expires_at is not null;

create table if not exists public.training_automation_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  trigger_type text not null,
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.training_automation_rules(code,name,description,trigger_type,conditions,actions,is_active)
values
  (
    'AUTO_CARGO_RUTA',
    'Asignación automática por cargo',
    'Al asignar o cambiar un cargo, sincroniza las rutas y matrículas obligatorias preservando el progreso existente.',
    'position_assigned',
    '{"requires_active_position":true}'::jsonb,
    '{"sync_required_paths":true,"preserve_progress":true}'::jsonb,
    true
  ),
  (
    'ALERTA_VENCIMIENTO_30',
    'Alerta de vencimiento a 30 días',
    'Regla preparada para notificaciones antes del vencimiento de una obligación formativa.',
    'due_soon',
    '{"days_before":30}'::jsonb,
    '{"notify_user":true,"notify_admin":true}'::jsonb,
    false
  ),
  (
    'RECERTIFICACION',
    'Recertificación por vigencia',
    'Regla preparada para reabrir una obligación cuando venza su evidencia de cumplimiento.',
    'evidence_expiring',
    '{"days_before":30}'::jsonb,
    '{"reenroll":true,"notify_user":true}'::jsonb,
    false
  )
on conflict(code) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Timestamps
-- ---------------------------------------------------------------------------
create or replace function public.touch_training_engine_updated_at()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists trg_job_positions_touch on public.job_positions;
create trigger trg_job_positions_touch before update on public.job_positions
for each row execute function public.touch_training_engine_updated_at();

drop trigger if exists trg_training_competencies_touch on public.training_competencies;
create trigger trg_training_competencies_touch before update on public.training_competencies
for each row execute function public.touch_training_engine_updated_at();

drop trigger if exists trg_learning_paths_touch on public.learning_paths;
create trigger trg_learning_paths_touch before update on public.learning_paths
for each row execute function public.touch_training_engine_updated_at();

drop trigger if exists trg_training_automation_rules_touch on public.training_automation_rules;
create trigger trg_training_automation_rules_touch before update on public.training_automation_rules
for each row execute function public.touch_training_engine_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Motor de sincronización de matrículas
-- ---------------------------------------------------------------------------
create or replace function public.admin_sync_user_training(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_position uuid;
  v_position_name text;
  v_processed integer:=0;
  v_inserted integer:=0;
  v_reactivated integer:=0;
  req record;
  v_existing_status text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acceso denegado. Se requiere Admin o Super Admin.';
  end if;

  select p.job_position_id,j.name
    into v_position,v_position_name
  from public.profiles p
  left join public.job_positions j on j.id=p.job_position_id
  where p.id=p_user_id and p.is_active=true;

  if not found then
    raise exception 'Usuario activo no encontrado.';
  end if;

  if v_position is null then
    return jsonb_build_object(
      'ok',true,
      'user_id',p_user_id,
      'position_id',null,
      'processed',0,
      'inserted',0,
      'reactivated',0,
      'message','El usuario no tiene cargo asignado.'
    );
  end if;

  for req in
    select distinct
      lpc.course_id,
      coalesce(lpc.due_days,jpp.due_days) as due_days
    from public.job_position_paths jpp
    join public.learning_paths lp
      on lp.id=jpp.path_id and lp.is_active=true
    join public.learning_path_courses lpc
      on lpc.path_id=lp.id and lpc.required=true
    join public.courses c
      on c.id=lpc.course_id
    where jpp.position_id=v_position
      and jpp.required=true
      and c.status='published'
  loop
    v_processed:=v_processed+1;

    select e.status into v_existing_status
    from public.enrollments e
    where e.course_id=req.course_id and e.user_id=p_user_id;

    insert into public.enrollments(course_id,user_id,due_at,status,created_at,updated_at)
    values(
      req.course_id,
      p_user_id,
      case when req.due_days is null then null else now()+(req.due_days::text||' days')::interval end,
      'assigned',
      now(),
      now()
    )
    on conflict(course_id,user_id) do update
    set
      status=case
        when public.enrollments.status='expired' then 'assigned'
        else public.enrollments.status
      end,
      due_at=case
        when public.enrollments.status='completed' then public.enrollments.due_at
        when public.enrollments.due_at is not null then public.enrollments.due_at
        else excluded.due_at
      end,
      updated_at=now();

    if v_existing_status is null then
      v_inserted:=v_inserted+1;
    elsif v_existing_status='expired' then
      v_reactivated:=v_reactivated+1;
    end if;
  end loop;

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(
    auth.uid(),
    'sync_training_by_position',
    'profile',
    p_user_id,
    jsonb_build_object(
      'position_id',v_position,
      'position_name',v_position_name,
      'processed',v_processed,
      'inserted',v_inserted,
      'reactivated',v_reactivated
    )
  );

  return jsonb_build_object(
    'ok',true,
    'user_id',p_user_id,
    'position_id',v_position,
    'position_name',v_position_name,
    'processed',v_processed,
    'inserted',v_inserted,
    'reactivated',v_reactivated
  );
end;
$$;

create or replace function public.admin_set_user_job_position(
  p_user_id uuid,
  p_position_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_old_position uuid;
  v_sync jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acceso denegado. Se requiere Admin o Super Admin.';
  end if;

  if p_position_id is not null and not exists(
    select 1 from public.job_positions
    where id=p_position_id and is_active=true
  ) then
    raise exception 'El cargo seleccionado no existe o está inactivo.';
  end if;

  select job_position_id into v_old_position
  from public.profiles
  where id=p_user_id and is_active=true;

  if not found then
    raise exception 'Usuario activo no encontrado.';
  end if;

  if v_old_position is not distinct from p_position_id then
    if p_position_id is not null then
      v_sync:=public.admin_sync_user_training(p_user_id);
    else
      v_sync:=jsonb_build_object('ok',true,'processed',0);
    end if;
    return jsonb_build_object('ok',true,'changed',false,'sync',v_sync);
  end if;

  update public.profile_position_history
  set effective_to=now()
  where user_id=p_user_id and effective_to is null;

  update public.profiles
  set job_position_id=p_position_id,updated_at=now()
  where id=p_user_id;

  if p_position_id is not null then
    insert into public.profile_position_history(
      user_id,position_id,assigned_by,effective_from,notes
    )
    values(p_user_id,p_position_id,auth.uid(),now(),nullif(trim(coalesce(p_notes,'')),''));
    v_sync:=public.admin_sync_user_training(p_user_id);
  else
    v_sync:=jsonb_build_object('ok',true,'processed',0,'message','Cargo retirado sin cancelar matrículas históricas.');
  end if;

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(
    auth.uid(),
    'set_job_position',
    'profile',
    p_user_id,
    jsonb_build_object('old_position_id',v_old_position,'new_position_id',p_position_id)
  );

  return jsonb_build_object('ok',true,'changed',true,'sync',v_sync);
end;
$$;

create or replace function public.admin_sync_training_engine()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  person record;
  v_users integer:=0;
  v_requirements integer:=0;
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acceso denegado. Se requiere Admin o Super Admin.';
  end if;

  for person in
    select id from public.profiles
    where is_active=true and job_position_id is not null
  loop
    v_users:=v_users+1;
    v_result:=public.admin_sync_user_training(person.id);
    v_requirements:=v_requirements+coalesce((v_result->>'processed')::integer,0);
  end loop;

  update public.training_automation_rules
  set last_run_at=now()
  where code='AUTO_CARGO_RUTA';

  return jsonb_build_object(
    'ok',true,
    'users_processed',v_users,
    'requirements_processed',v_requirements,
    'executed_at',now()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Evidencia automática al completar una matrícula
-- ---------------------------------------------------------------------------
create or replace function public.capture_training_completion_evidence()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_months integer;
begin
  if new.status='completed'
     and (tg_op='INSERT' or old.status is distinct from 'completed') then

    select max(coalesce(lpc.recertification_months,jpp.recertification_months))
      into v_months
    from public.profiles p
    join public.job_position_paths jpp on jpp.position_id=p.job_position_id
    join public.learning_path_courses lpc
      on lpc.path_id=jpp.path_id and lpc.course_id=new.course_id
    where p.id=new.user_id
      and jpp.required=true
      and lpc.required=true;

    insert into public.compliance_evidence(
      user_id,course_id,evidence_type,reference_id,issued_at,expires_at,metadata
    )
    values(
      new.user_id,
      new.course_id,
      'course_completion',
      new.id::text,
      now(),
      case when v_months is null then null else now()+make_interval(months=>v_months) end,
      jsonb_build_object('enrollment_id',new.id,'recertification_months',v_months)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_capture_training_completion_evidence on public.enrollments;
create trigger trg_capture_training_completion_evidence
after insert or update of status on public.enrollments
for each row execute function public.capture_training_completion_evidence();

-- Backfill one historical evidence row per completed matrícula if missing.
insert into public.compliance_evidence(
  user_id,course_id,evidence_type,reference_id,issued_at,expires_at,metadata
)
select
  e.user_id,
  e.course_id,
  'historical_completion',
  e.id::text,
  coalesce(e.updated_at,e.created_at,now()),
  null,
  jsonb_build_object('backfilled',true,'enrollment_id',e.id)
from public.enrollments e
where e.status='completed'
  and not exists(
    select 1 from public.compliance_evidence ce
    where ce.user_id=e.user_id
      and ce.course_id=e.course_id
      and ce.reference_id=e.id::text
  );

-- ---------------------------------------------------------------------------
-- 8. Analítica administrativa
-- ---------------------------------------------------------------------------
create or replace function public.admin_training_compliance_rows()
returns table(
  user_id uuid,
  full_name text,
  email text,
  position_id uuid,
  position_name text,
  path_id uuid,
  path_name text,
  course_id uuid,
  course_title text,
  enrollment_status text,
  due_at timestamptz,
  latest_evidence_at timestamptz,
  evidence_expires_at timestamptz,
  compliance_state text
)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acceso denegado. Se requiere Admin o Super Admin.';
  end if;

  return query
  with requirements as (
    select distinct
      p.id as user_id,
      p.full_name,
      p.email,
      jp.id as position_id,
      jp.name as position_name,
      lp.id as path_id,
      lp.name as path_name,
      c.id as course_id,
      c.title as course_title,
      e.status as enrollment_status,
      e.due_at,
      ev.issued_at as latest_evidence_at,
      ev.expires_at as evidence_expires_at
    from public.profiles p
    join public.job_positions jp on jp.id=p.job_position_id
    join public.job_position_paths jpp on jpp.position_id=jp.id and jpp.required=true
    join public.learning_paths lp on lp.id=jpp.path_id and lp.is_active=true
    join public.learning_path_courses lpc on lpc.path_id=lp.id and lpc.required=true
    join public.courses c on c.id=lpc.course_id
    left join public.enrollments e on e.user_id=p.id and e.course_id=c.id
    left join lateral (
      select ce.issued_at,ce.expires_at
      from public.compliance_evidence ce
      where ce.user_id=p.id and ce.course_id=c.id
      order by ce.issued_at desc
      limit 1
    ) ev on true
    where p.is_active=true
  )
  select
    r.user_id,r.full_name,r.email,r.position_id,r.position_name,
    r.path_id,r.path_name,r.course_id,r.course_title,
    r.enrollment_status,r.due_at,r.latest_evidence_at,r.evidence_expires_at,
    case
      when r.evidence_expires_at is not null and r.evidence_expires_at < now() then 'expired'
      when r.evidence_expires_at is not null and r.evidence_expires_at <= now()+interval '30 days' then 'expiring'
      when r.enrollment_status='completed' or (r.latest_evidence_at is not null and (r.evidence_expires_at is null or r.evidence_expires_at>=now())) then 'compliant'
      when r.due_at is not null and r.due_at < now() then 'overdue'
      when r.enrollment_status='in_progress' then 'in_progress'
      when r.enrollment_status='assigned' then 'assigned'
      else 'not_assigned'
    end as compliance_state
  from requirements r
  order by r.position_name,r.full_name,r.path_name,r.course_title;
end;
$$;

create or replace function public.admin_training_engine_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_positions integer;
  v_competencies integer;
  v_paths integer;
  v_active_users integer;
  v_users_with_position integer;
  v_requirements integer;
  v_compliant integer;
  v_due_soon integer;
  v_overdue integer;
  v_without_position integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acceso denegado. Se requiere Admin o Super Admin.';
  end if;

  select count(*) into v_positions from public.job_positions where is_active=true;
  select count(*) into v_competencies from public.training_competencies where is_active=true;
  select count(*) into v_paths from public.learning_paths where is_active=true;
  select count(*) into v_active_users from public.profiles where is_active=true;
  select count(*) into v_users_with_position from public.profiles where is_active=true and job_position_id is not null;
  v_without_position:=greatest(v_active_users-v_users_with_position,0);

  select
    count(*),
    count(*) filter(where compliance_state='compliant'),
    count(*) filter(where compliance_state in ('expiring','assigned') and due_at is not null and due_at<=now()+interval '30 days'),
    count(*) filter(where compliance_state in ('overdue','expired'))
  into v_requirements,v_compliant,v_due_soon,v_overdue
  from public.admin_training_compliance_rows();

  return jsonb_build_object(
    'positions',v_positions,
    'competencies',v_competencies,
    'paths',v_paths,
    'active_users',v_active_users,
    'users_with_position',v_users_with_position,
    'without_position',v_without_position,
    'requirements',v_requirements,
    'compliant',v_compliant,
    'due_soon',v_due_soon,
    'overdue',v_overdue,
    'compliance_percent',case when v_requirements=0 then 0 else round((v_compliant::numeric/v_requirements::numeric)*100,1) end
  );
end;
$$;

create or replace function public.get_my_training_profile()
returns jsonb
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select jsonb_build_object(
    'position',case when jp.id is null then null else jsonb_build_object('id',jp.id,'code',jp.code,'name',jp.name,'department',jp.department) end,
    'competencies',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',tc.id,
        'code',tc.code,
        'name',tc.name,
        'required_level',jpc.required_level,
        'category',tc.category
      ) order by tc.name)
      from public.job_position_competencies jpc
      join public.training_competencies tc on tc.id=jpc.competency_id and tc.is_active=true
      where jpc.position_id=p.job_position_id
    ),'[]'::jsonb),
    'paths',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',lp.id,
        'code',lp.code,
        'name',lp.name,
        'required',jpp.required
      ) order by lp.name)
      from public.job_position_paths jpp
      join public.learning_paths lp on lp.id=jpp.path_id and lp.is_active=true
      where jpp.position_id=p.job_position_id
    ),'[]'::jsonb)
  )
  from public.profiles p
  left join public.job_positions jp on jp.id=p.job_position_id
  where p.id=auth.uid() and public.is_aula_active(auth.uid())
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 9. RLS y permisos
-- ---------------------------------------------------------------------------
alter table public.job_positions enable row level security;
alter table public.training_competencies enable row level security;
alter table public.job_position_competencies enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_path_courses enable row level security;
alter table public.job_position_paths enable row level security;
alter table public.profile_position_history enable row level security;
alter table public.compliance_evidence enable row level security;
alter table public.training_automation_rules enable row level security;

drop policy if exists job_positions_read on public.job_positions;
create policy job_positions_read on public.job_positions
for select to authenticated
using ((select public.is_aula_active(auth.uid())));

drop policy if exists job_positions_admin_write on public.job_positions;
create policy job_positions_admin_write on public.job_positions
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists training_competencies_read on public.training_competencies;
create policy training_competencies_read on public.training_competencies
for select to authenticated
using ((select public.is_aula_active(auth.uid())));

drop policy if exists training_competencies_admin_write on public.training_competencies;
create policy training_competencies_admin_write on public.training_competencies
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists job_position_competencies_read on public.job_position_competencies;
create policy job_position_competencies_read on public.job_position_competencies
for select to authenticated
using ((select public.is_aula_active(auth.uid())));

drop policy if exists job_position_competencies_admin_write on public.job_position_competencies;
create policy job_position_competencies_admin_write on public.job_position_competencies
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists learning_paths_read on public.learning_paths;
create policy learning_paths_read on public.learning_paths
for select to authenticated
using ((select public.is_aula_active(auth.uid())));

drop policy if exists learning_paths_admin_write on public.learning_paths;
create policy learning_paths_admin_write on public.learning_paths
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists learning_path_courses_read on public.learning_path_courses;
create policy learning_path_courses_read on public.learning_path_courses
for select to authenticated
using ((select public.is_aula_active(auth.uid())));

drop policy if exists learning_path_courses_admin_write on public.learning_path_courses;
create policy learning_path_courses_admin_write on public.learning_path_courses
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists job_position_paths_read on public.job_position_paths;
create policy job_position_paths_read on public.job_position_paths
for select to authenticated
using ((select public.is_aula_active(auth.uid())));

drop policy if exists job_position_paths_admin_write on public.job_position_paths;
create policy job_position_paths_admin_write on public.job_position_paths
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists profile_position_history_admin_read on public.profile_position_history;
create policy profile_position_history_admin_read on public.profile_position_history
for select to authenticated
using ((select public.is_admin()));

drop policy if exists compliance_evidence_read on public.compliance_evidence;
create policy compliance_evidence_read on public.compliance_evidence
for select to authenticated
using (
  user_id=(select auth.uid())
  or (select public.is_admin())
);

drop policy if exists training_automation_rules_admin on public.training_automation_rules;
create policy training_automation_rules_admin on public.training_automation_rules
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant select,insert,update,delete on
  public.job_positions,
  public.training_competencies,
  public.job_position_competencies,
  public.learning_paths,
  public.learning_path_courses,
  public.job_position_paths,
  public.profile_position_history,
  public.compliance_evidence,
  public.training_automation_rules
to authenticated;

revoke all on function public.admin_sync_user_training(uuid) from public,anon;
revoke all on function public.admin_set_user_job_position(uuid,uuid,text) from public,anon;
revoke all on function public.admin_sync_training_engine() from public,anon;
revoke all on function public.admin_training_compliance_rows() from public,anon;
revoke all on function public.admin_training_engine_snapshot() from public,anon;
revoke all on function public.get_my_training_profile() from public,anon;

grant execute on function public.admin_sync_user_training(uuid) to authenticated;
grant execute on function public.admin_set_user_job_position(uuid,uuid,text) to authenticated;
grant execute on function public.admin_sync_training_engine() to authenticated;
grant execute on function public.admin_training_compliance_rows() to authenticated;
grant execute on function public.admin_training_engine_snapshot() to authenticated;
grant execute on function public.get_my_training_profile() to authenticated;

commit;
