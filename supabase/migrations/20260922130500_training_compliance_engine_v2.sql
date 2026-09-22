-- Aula EI · Motor de Formación y Cumplimiento v2
-- Rutas secuenciales, competencias por curso, notificaciones, automatización real y analítica.
-- 2026-09-22

begin;

-- ---------------------------------------------------------------------------
-- 1. Relaciones organizacionales y progresión de rutas
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists supervisor_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_supervisor_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_supervisor_id_fkey
      foreign key (supervisor_id)
      references public.profiles(id)
      on delete set null;
  end if;
end $$;

create index if not exists profiles_supervisor_idx
  on public.profiles(supervisor_id)
  where supervisor_id is not null;

alter table public.learning_paths
  add column if not exists unlock_mode text not null default 'sequential';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'learning_paths_unlock_mode_check'
      and conrelid = 'public.learning_paths'::regclass
  ) then
    alter table public.learning_paths
      add constraint learning_paths_unlock_mode_check
      check (unlock_mode in ('open','sequential'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Competencias que desarrolla cada capacitación
-- ---------------------------------------------------------------------------
create table if not exists public.course_competencies (
  course_id uuid not null references public.courses(id) on delete cascade,
  competency_id uuid not null references public.training_competencies(id) on delete cascade,
  level_awarded integer not null default 1 check (level_awarded between 1 and 5),
  created_at timestamptz not null default now(),
  primary key(course_id, competency_id)
);

alter table public.course_competencies enable row level security;

drop policy if exists course_competencies_read on public.course_competencies;
create policy course_competencies_read on public.course_competencies
for select to authenticated
using ((select public.is_aula_active(auth.uid())));

drop policy if exists course_competencies_admin_write on public.course_competencies;
create policy course_competencies_admin_write on public.course_competencies
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant select,insert,update,delete on public.course_competencies to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Centro de notificaciones y trazabilidad de automatizaciones
-- ---------------------------------------------------------------------------
create table if not exists public.training_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  course_id uuid references public.courses(id) on delete set null,
  path_id uuid references public.learning_paths(id) on delete set null,
  due_at timestamptz,
  read_at timestamptz,
  dedupe_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists training_notifications_user_unread_idx
  on public.training_notifications(user_id, created_at desc)
  where read_at is null;

create index if not exists training_notifications_created_idx
  on public.training_notifications(created_at desc);

alter table public.training_notifications enable row level security;

drop policy if exists training_notifications_read on public.training_notifications;
create policy training_notifications_read on public.training_notifications
for select to authenticated
using (
  user_id=(select auth.uid())
  or (select public.is_admin())
);

drop policy if exists training_notifications_mark_read on public.training_notifications;
create policy training_notifications_mark_read on public.training_notifications
for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

grant select on public.training_notifications to authenticated;
grant update(read_at) on public.training_notifications to authenticated;

create table if not exists public.training_automation_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check(status in ('running','success','error')),
  counters jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.training_automation_runs enable row level security;

drop policy if exists training_automation_runs_admin_read on public.training_automation_runs;
create policy training_automation_runs_admin_read on public.training_automation_runs
for select to authenticated
using ((select public.is_admin()));

grant select on public.training_automation_runs to authenticated;

-- Rules are data-driven. These are safe defaults and can still be toggled from Studio.
insert into public.training_automation_rules(
  code,name,description,trigger_type,conditions,actions,is_active
)
values
  (
    'ALERTA_VENCIMIENTO_7',
    'Recordatorio de vencimiento a 7 días',
    'Notifica al colaborador cuando una capacitación obligatoria está a siete días o menos de vencer.',
    'due_soon',
    '{"days_before":7}'::jsonb,
    '{"notify_user":true}'::jsonb,
    true
  ),
  (
    'ALERTA_INACTIVIDAD_15',
    'Recordatorio por 15 días de inactividad',
    'Genera un recordatorio interno cuando una cuenta activa lleva al menos quince días sin ingresar.',
    'inactive_user',
    '{"days_inactive":15}'::jsonb,
    '{"notify_user":true}'::jsonb,
    false
  ),
  (
    'REPROBADO_DOS_INTENTOS',
    'Escalamiento por dos intentos fallidos',
    'Al segundo intento no aprobado informa al colaborador y a su supervisor; si no hay supervisor, informa a administradores.',
    'exam_failed_twice',
    '{"failed_attempts":2}'::jsonb,
    '{"notify_user":true,"notify_supervisor":true,"fallback_admin":true}'::jsonb,
    true
  )
on conflict(code) do update
set
  name=excluded.name,
  description=excluded.description,
  trigger_type=excluded.trigger_type,
  conditions=excluded.conditions,
  actions=excluded.actions,
  updated_at=now();

update public.training_automation_rules
set is_active=true, updated_at=now()
where code='RECERTIFICACION';

-- ---------------------------------------------------------------------------
-- 4. Helpers internos: vigencia y desbloqueo progresivo
-- ---------------------------------------------------------------------------
create or replace function public.training_is_course_compliant(
  p_user_id uuid,
  p_course_id uuid
)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select
    exists(
      select 1
      from public.compliance_evidence ce
      where ce.user_id=p_user_id
        and ce.course_id=p_course_id
        and (ce.expires_at is null or ce.expires_at >= now())
    )
    or (
      not exists(
        select 1
        from public.compliance_evidence ce
        where ce.user_id=p_user_id and ce.course_id=p_course_id
      )
      and exists(
        select 1
        from public.enrollments e
        where e.user_id=p_user_id
          and e.course_id=p_course_id
          and e.status='completed'
      )
    );
$$;

revoke all on function public.training_is_course_compliant(uuid,uuid)
from public,anon,authenticated;

create or replace function public.training_course_is_unlocked(
  p_user_id uuid,
  p_path_id uuid,
  p_course_id uuid
)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select coalesce((
    select
      lp.unlock_mode='open'
      or not exists(
        select 1
        from public.learning_path_courses previous
        where previous.path_id=lpc.path_id
          and previous.required=true
          and previous.sort_order < lpc.sort_order
          and not public.training_is_course_compliant(p_user_id, previous.course_id)
      )
    from public.learning_path_courses lpc
    join public.learning_paths lp on lp.id=lpc.path_id
    where lpc.path_id=p_path_id
      and lpc.course_id=p_course_id
    limit 1
  ), true);
$$;

revoke all on function public.training_course_is_unlocked(uuid,uuid,uuid)
from public,anon,authenticated;

create or replace function public.sync_user_training_system(p_user_id uuid)
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
  v_locked integer:=0;
  req record;
  v_existing_status text;
begin
  select p.job_position_id,j.name
    into v_position,v_position_name
  from public.profiles p
  left join public.job_positions j on j.id=p.job_position_id
  where p.id=p_user_id and p.is_active=true;

  if not found then
    return jsonb_build_object(
      'ok',false,'user_id',p_user_id,'processed',0,
      'message','Usuario activo no encontrado.'
    );
  end if;

  if v_position is null then
    return jsonb_build_object(
      'ok',true,
      'user_id',p_user_id,
      'position_id',null,
      'processed',0,
      'inserted',0,
      'reactivated',0,
      'locked',0,
      'message','El usuario no tiene cargo asignado.'
    );
  end if;

  for req in
    select distinct
      lpc.path_id,
      lpc.course_id,
      lpc.sort_order,
      lp.unlock_mode,
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
    order by lpc.path_id,lpc.sort_order
  loop
    v_processed:=v_processed+1;

    if not public.training_course_is_unlocked(
      p_user_id,req.path_id,req.course_id
    ) then
      v_locked:=v_locked+1;
      continue;
    end if;

    select e.status into v_existing_status
    from public.enrollments e
    where e.course_id=req.course_id and e.user_id=p_user_id;

    insert into public.enrollments(
      course_id,user_id,due_at,status,created_at,updated_at
    )
    values(
      req.course_id,
      p_user_id,
      case when req.due_days is null
        then null
        else now()+make_interval(days=>req.due_days)
      end,
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
        when public.enrollments.status='completed'
             and public.training_is_course_compliant(p_user_id,req.course_id)
          then public.enrollments.due_at
        when public.enrollments.status='expired'
          then excluded.due_at
        when public.enrollments.due_at is not null
          then public.enrollments.due_at
        else excluded.due_at
      end,
      updated_at=now();

    if v_existing_status is null then
      v_inserted:=v_inserted+1;
    elsif v_existing_status='expired' then
      v_reactivated:=v_reactivated+1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'user_id',p_user_id,
    'position_id',v_position,
    'position_name',v_position_name,
    'processed',v_processed,
    'inserted',v_inserted,
    'reactivated',v_reactivated,
    'locked',v_locked
  );
end;
$$;

revoke all on function public.sync_user_training_system(uuid)
from public,anon,authenticated;

create or replace function public.admin_sync_user_training(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acceso denegado. Se requiere Admin o Super Admin.';
  end if;

  v_result:=public.sync_user_training_system(p_user_id);

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(
    auth.uid(),
    'sync_training_by_position',
    'profile',
    p_user_id,
    v_result
  );

  return v_result;
end;
$$;

revoke all on function public.admin_sync_user_training(uuid) from public,anon;
grant execute on function public.admin_sync_user_training(uuid) to authenticated;

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
  v_inserted integer:=0;
  v_reactivated integer:=0;
  v_locked integer:=0;
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
    v_result:=public.sync_user_training_system(person.id);
    v_requirements:=v_requirements+coalesce((v_result->>'processed')::integer,0);
    v_inserted:=v_inserted+coalesce((v_result->>'inserted')::integer,0);
    v_reactivated:=v_reactivated+coalesce((v_result->>'reactivated')::integer,0);
    v_locked:=v_locked+coalesce((v_result->>'locked')::integer,0);
  end loop;

  update public.training_automation_rules
  set last_run_at=now()
  where code='AUTO_CARGO_RUTA';

  return jsonb_build_object(
    'ok',true,
    'users_processed',v_users,
    'requirements_processed',v_requirements,
    'inserted',v_inserted,
    'reactivated',v_reactivated,
    'locked',v_locked,
    'executed_at',now()
  );
end;
$$;

revoke all on function public.admin_sync_training_engine() from public,anon;
grant execute on function public.admin_sync_training_engine() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Supervisor y cargo desde el mismo motor
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_user_supervisor(
  p_user_id uuid,
  p_supervisor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acceso denegado. Se requiere Admin o Super Admin.';
  end if;

  if p_user_id=p_supervisor_id then
    raise exception 'Una persona no puede ser su propio supervisor.';
  end if;

  if p_supervisor_id is not null and not exists(
    select 1 from public.profiles
    where id=p_supervisor_id and is_active=true
  ) then
    raise exception 'Supervisor activo no encontrado.';
  end if;

  update public.profiles
  set supervisor_id=p_supervisor_id,updated_at=now()
  where id=p_user_id and is_active=true;

  if not found then
    raise exception 'Usuario activo no encontrado.';
  end if;

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(
    auth.uid(),
    'set_training_supervisor',
    'profile',
    p_user_id,
    jsonb_build_object('supervisor_id',p_supervisor_id)
  );

  return jsonb_build_object(
    'ok',true,'user_id',p_user_id,'supervisor_id',p_supervisor_id
  );
end;
$$;

revoke all on function public.admin_set_user_supervisor(uuid,uuid)
from public,anon;
grant execute on function public.admin_set_user_supervisor(uuid,uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Evidencia y desbloqueo automático al completar
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
    join public.job_position_paths jpp
      on jpp.position_id=p.job_position_id
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
      case
        when v_months is null then null
        else now()+make_interval(months=>v_months)
      end,
      jsonb_build_object(
        'enrollment_id',new.id,
        'recertification_months',v_months
      )
    );

    perform public.sync_user_training_system(new.user_id);
  end if;

  return new;
end;
$$;

revoke all on function public.capture_training_completion_evidence()
from public,anon,authenticated;

-- ---------------------------------------------------------------------------
-- 7. Escalamiento inmediato al reprobar dos veces
-- ---------------------------------------------------------------------------
create or replace function public.notify_repeated_exam_failure()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_rule_active boolean;
  v_failed_count integer;
  v_supervisor uuid;
  v_course_title text;
  v_user_name text;
  admin_user record;
begin
  if new.passed then
    return new;
  end if;

  select is_active into v_rule_active
  from public.training_automation_rules
  where code='REPROBADO_DOS_INTENTOS';

  if coalesce(v_rule_active,false)=false then
    return new;
  end if;

  select count(*) into v_failed_count
  from public.exam_attempts
  where user_id=new.user_id
    and course_id=new.course_id
    and passed=false;

  if v_failed_count<>2 then
    return new;
  end if;

  select p.supervisor_id,p.full_name,c.title
    into v_supervisor,v_user_name,v_course_title
  from public.profiles p
  join public.courses c on c.id=new.course_id
  where p.id=new.user_id;

  insert into public.training_notifications(
    user_id,notification_type,title,message,course_id,dedupe_key,metadata
  )
  values(
    new.user_id,
    'exam_failed_twice',
    'Revisemos esta capacitación',
    'Has realizado dos intentos sin aprobar "'||coalesce(v_course_title,'la capacitación')||'". Revisa nuevamente el contenido antes del siguiente intento.',
    new.course_id,
    'exam-failed-2:user:'||new.user_id::text||':course:'||new.course_id::text,
    jsonb_build_object('failed_attempts',v_failed_count,'exam_attempt_id',new.id)
  )
  on conflict(dedupe_key) do nothing;

  if v_supervisor is not null then
    insert into public.training_notifications(
      user_id,notification_type,title,message,course_id,dedupe_key,metadata
    )
    values(
      v_supervisor,
      'supervisor_exam_alert',
      'Seguimiento formativo requerido',
      coalesce(v_user_name,'Un colaborador')||' ha realizado dos intentos sin aprobar "'||coalesce(v_course_title,'una capacitación')||'".',
      new.course_id,
      'exam-failed-2:supervisor:'||v_supervisor::text||':user:'||new.user_id::text||':course:'||new.course_id::text,
      jsonb_build_object('learner_id',new.user_id,'failed_attempts',v_failed_count)
    )
    on conflict(dedupe_key) do nothing;
  else
    for admin_user in
      select id from public.profiles
      where is_active=true and role in ('admin','super_admin')
    loop
      insert into public.training_notifications(
        user_id,notification_type,title,message,course_id,dedupe_key,metadata
      )
      values(
        admin_user.id,
        'admin_exam_alert',
        'Seguimiento formativo sin supervisor asignado',
        coalesce(v_user_name,'Un colaborador')||' ha realizado dos intentos sin aprobar "'||coalesce(v_course_title,'una capacitación')||'" y aún no tiene supervisor asignado.',
        new.course_id,
        'exam-failed-2:admin:'||admin_user.id::text||':user:'||new.user_id::text||':course:'||new.course_id::text,
        jsonb_build_object('learner_id',new.user_id,'failed_attempts',v_failed_count)
      )
      on conflict(dedupe_key) do nothing;
    end loop;
  end if;

  return new;
end;
$$;

revoke all on function public.notify_repeated_exam_failure()
from public,anon,authenticated;

drop trigger if exists trg_notify_repeated_exam_failure on public.exam_attempts;
create trigger trg_notify_repeated_exam_failure
after insert on public.exam_attempts
for each row execute function public.notify_repeated_exam_failure();

-- ---------------------------------------------------------------------------
-- 8. Motor periódico: vencimientos, recertificación e inactividad
-- ---------------------------------------------------------------------------
create or replace function public.process_training_automations()
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_temp
as $$
declare
  v_run_id bigint;
  v_notifications integer:=0;
  v_recertifications integer:=0;
  v_inactive integer:=0;
  v_days integer;
  rule_row record;
  item record;
  v_sync jsonb;
begin
  insert into public.training_automation_runs(status)
  values('running')
  returning id into v_run_id;

  begin
    -- Vencimientos configurados (7/30/etc.).
    for rule_row in
      select *
      from public.training_automation_rules
      where is_active=true and trigger_type='due_soon'
    loop
      v_days:=greatest(
        coalesce((rule_row.conditions->>'days_before')::integer,7),
        1
      );

      insert into public.training_notifications(
        user_id,notification_type,title,message,course_id,due_at,dedupe_key,metadata
      )
      select
        e.user_id,
        'course_due_soon',
        'Capacitación próxima a vencer',
        '"'||c.title||'" vence el '||to_char(e.due_at at time zone 'America/Bogota','DD/MM/YYYY')||'.',
        e.course_id,
        e.due_at,
        'due:'||v_days::text||':'||e.id::text||':'||to_char(e.due_at,'YYYY-MM-DD'),
        jsonb_build_object(
          'days_before',v_days,
          'enrollment_id',e.id,
          'rule_code',rule_row.code
        )
      from public.enrollments e
      join public.profiles p on p.id=e.user_id and p.is_active=true
      join public.courses c on c.id=e.course_id
      where e.status in ('assigned','in_progress')
        and e.due_at is not null
        and e.due_at>now()
        and e.due_at<=now()+make_interval(days=>v_days)
      on conflict(dedupe_key) do nothing;

      get diagnostics v_days = row_count;
      v_notifications:=v_notifications+v_days;
    end loop;

    -- Aviso de evidencia próxima a vencer cuando recertificación está activa.
    if exists(
      select 1 from public.training_automation_rules
      where code='RECERTIFICACION' and is_active=true
    ) then
      select greatest(
        coalesce((conditions->>'days_before')::integer,30),1
      ) into v_days
      from public.training_automation_rules
      where code='RECERTIFICACION';

      insert into public.training_notifications(
        user_id,notification_type,title,message,course_id,due_at,dedupe_key,metadata
      )
      select
        ce.user_id,
        'recertification_due',
        'Recertificación próxima',
        'Tu vigencia para "'||c.title||'" finaliza el '||to_char(ce.expires_at at time zone 'America/Bogota','DD/MM/YYYY')||'.',
        ce.course_id,
        ce.expires_at,
        'recert-due:'||ce.user_id::text||':'||ce.course_id::text||':'||to_char(ce.expires_at,'YYYY-MM-DD'),
        jsonb_build_object('evidence_id',ce.id,'days_before',v_days)
      from public.compliance_evidence ce
      join public.profiles p on p.id=ce.user_id and p.is_active=true
      join public.courses c on c.id=ce.course_id
      where ce.expires_at>now()
        and ce.expires_at<=now()+make_interval(days=>v_days)
        and not exists(
          select 1 from public.compliance_evidence newer
          where newer.user_id=ce.user_id
            and newer.course_id=ce.course_id
            and newer.issued_at>ce.issued_at
            and (newer.expires_at is null or newer.expires_at>ce.expires_at)
        )
      on conflict(dedupe_key) do nothing;

      get diagnostics v_days = row_count;
      v_notifications:=v_notifications+v_days;

      -- Reabre la obligación cuando la evidencia más reciente ya venció.
      for item in
        with latest as (
          select distinct on (ce.user_id,ce.course_id)
            ce.user_id,ce.course_id,ce.id,ce.expires_at
          from public.compliance_evidence ce
          where ce.course_id is not null
          order by ce.user_id,ce.course_id,ce.issued_at desc
        )
        select l.user_id,l.course_id,l.id as evidence_id,l.expires_at,c.title
        from latest l
        join public.profiles p on p.id=l.user_id and p.is_active=true
        join public.courses c on c.id=l.course_id
        where l.expires_at is not null
          and l.expires_at<now()
          and exists(
            select 1
            from public.learning_path_courses lpc
            join public.job_position_paths jpp
              on jpp.path_id=lpc.path_id
            join public.profiles px
              on px.job_position_id=jpp.position_id
            where px.id=l.user_id
              and lpc.course_id=l.course_id
              and lpc.required=true
              and jpp.required=true
          )
      loop
        update public.enrollments
        set status='expired',updated_at=now()
        where user_id=item.user_id
          and course_id=item.course_id
          and status='completed';

        v_sync:=public.sync_user_training_system(item.user_id);

        insert into public.training_notifications(
          user_id,notification_type,title,message,course_id,due_at,dedupe_key,metadata
        )
        values(
          item.user_id,
          'recertification_opened',
          'Recertificación habilitada',
          'La vigencia de "'||item.title||'" terminó. Aula EI volvió a habilitar la obligación para renovar tu evidencia.',
          item.course_id,
          item.expires_at,
          'recert-open:'||item.user_id::text||':'||item.course_id::text||':'||item.evidence_id::text,
          jsonb_build_object('evidence_id',item.evidence_id,'sync',v_sync)
        )
        on conflict(dedupe_key) do nothing;

        v_recertifications:=v_recertifications+1;
      end loop;
    end if;

    -- Inactividad.
    if exists(
      select 1 from public.training_automation_rules
      where code='ALERTA_INACTIVIDAD_15' and is_active=true
    ) then
      select greatest(
        coalesce((conditions->>'days_inactive')::integer,15),1
      ) into v_days
      from public.training_automation_rules
      where code='ALERTA_INACTIVIDAD_15';

      insert into public.training_notifications(
        user_id,notification_type,title,message,dedupe_key,metadata
      )
      select
        p.id,
        'inactive_user',
        'Tienes formación pendiente por revisar',
        'Han pasado al menos '||v_days::text||' días desde tu último ingreso a Aula EI. Revisa tus capacitaciones y vencimientos.',
        'inactive:'||v_days::text||':'||p.id::text||':'||coalesce(to_char(u.last_sign_in_at,'YYYY-MM-DD'),'never'),
        jsonb_build_object('days_inactive',v_days,'last_sign_in_at',u.last_sign_in_at)
      from public.profiles p
      join auth.users u on u.id=p.id
      where p.is_active=true
        and coalesce(u.last_sign_in_at,u.created_at)
          <= now()-make_interval(days=>v_days)
      on conflict(dedupe_key) do nothing;

      get diagnostics v_inactive = row_count;
      v_notifications:=v_notifications+v_inactive;
    end if;

    update public.training_automation_rules
    set last_run_at=now()
    where is_active=true
      and trigger_type in ('due_soon','evidence_expiring','inactive_user');

    update public.training_automation_runs
    set
      status='success',
      finished_at=now(),
      counters=jsonb_build_object(
        'notifications',v_notifications,
        'recertifications',v_recertifications,
        'inactive_notifications',v_inactive
      )
    where id=v_run_id;

    return jsonb_build_object(
      'ok',true,
      'run_id',v_run_id,
      'notifications',v_notifications,
      'recertifications',v_recertifications,
      'inactive_notifications',v_inactive
    );
  exception when others then
    update public.training_automation_runs
    set status='error',finished_at=now(),error_message=sqlerrm
    where id=v_run_id;
    raise;
  end;
end;
$$;

revoke all on function public.process_training_automations()
from public,anon,authenticated;

create or replace function public.admin_run_training_automations()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acceso denegado. Se requiere Admin o Super Admin.';
  end if;
  return public.process_training_automations();
end;
$$;

revoke all on function public.admin_run_training_automations()
from public,anon;
grant execute on function public.admin_run_training_automations()
to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Perfil formativo enriquecido para el colaborador
-- ---------------------------------------------------------------------------
create or replace function public.get_my_training_profile()
returns jsonb
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select jsonb_build_object(
    'position',
      case when jp.id is null then null
      else jsonb_build_object(
        'id',jp.id,
        'code',jp.code,
        'name',jp.name,
        'department',jp.department
      ) end,
    'supervisor',
      case when sp.id is null then null
      else jsonb_build_object(
        'id',sp.id,
        'name',sp.full_name,
        'email',sp.email
      ) end,
    'competencies',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id',tc.id,
            'code',tc.code,
            'name',tc.name,
            'required_level',jpc.required_level,
            'achieved_level',coalesce(ach.level,0),
            'gap',greatest(jpc.required_level-coalesce(ach.level,0),0),
            'category',tc.category
          )
          order by tc.name
        )
        from public.job_position_competencies jpc
        join public.training_competencies tc
          on tc.id=jpc.competency_id and tc.is_active=true
        left join lateral (
          select max(cc.level_awarded)::integer as level
          from public.course_competencies cc
          where cc.competency_id=tc.id
            and public.training_is_course_compliant(p.id,cc.course_id)
        ) ach on true
        where jpc.position_id=p.job_position_id
      ),'[]'::jsonb),
    'paths',
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id',lp.id,
            'code',lp.code,
            'name',lp.name,
            'required',jpp.required,
            'unlock_mode',lp.unlock_mode,
            'progress_percent',
              coalesce((
                select round(
                  100.0 *
                  count(*) filter(
                    where public.training_is_course_compliant(p.id,lpc2.course_id)
                  ) /
                  nullif(count(*) filter(where lpc2.required),0),
                  0
                )
                from public.learning_path_courses lpc2
                where lpc2.path_id=lp.id and lpc2.required=true
              ),0),
            'courses',
              coalesce((
                select jsonb_agg(
                  jsonb_build_object(
                    'course_id',lpc3.course_id,
                    'title',c.title,
                    'sort_order',lpc3.sort_order,
                    'required',lpc3.required,
                    'due_days',lpc3.due_days,
                    'recertification_months',lpc3.recertification_months,
                    'completed',public.training_is_course_compliant(p.id,lpc3.course_id),
                    'unlocked',public.training_course_is_unlocked(p.id,lp.id,lpc3.course_id),
                    'enrollment_status',e.status,
                    'due_at',e.due_at
                  )
                  order by lpc3.sort_order,c.title
                )
                from public.learning_path_courses lpc3
                join public.courses c on c.id=lpc3.course_id
                left join public.enrollments e
                  on e.user_id=p.id and e.course_id=lpc3.course_id
                where lpc3.path_id=lp.id
              ),'[]'::jsonb)
          )
          order by lp.name
        )
        from public.job_position_paths jpp
        join public.learning_paths lp
          on lp.id=jpp.path_id and lp.is_active=true
        where jpp.position_id=p.job_position_id
      ),'[]'::jsonb)
  )
  from public.profiles p
  left join public.job_positions jp on jp.id=p.job_position_id
  left join public.profiles sp on sp.id=p.supervisor_id
  where p.id=auth.uid()
    and public.is_aula_active(auth.uid())
  limit 1;
$$;

revoke all on function public.get_my_training_profile()
from public,anon;
grant execute on function public.get_my_training_profile()
to authenticated;

create or replace function public.get_my_course_route_access(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare
  v_user uuid:=auth.uid();
  v_restricted boolean:=false;
  v_unlocked boolean:=false;
  v_path_name text;
  v_previous_title text;
begin
  if v_user is null or not public.is_aula_active(v_user) then
    return jsonb_build_object(
      'allowed',false,'locked',true,'reason','Sesión no habilitada.'
    );
  end if;

  if public.can_manage_courses() then
    return jsonb_build_object(
      'allowed',true,'locked',false,'reason','Acceso de gestión.'
    );
  end if;

  select exists(
    select 1
    from public.profiles p
    join public.job_position_paths jpp
      on jpp.position_id=p.job_position_id and jpp.required=true
    join public.learning_path_courses lpc
      on lpc.path_id=jpp.path_id
    where p.id=v_user and lpc.course_id=p_course_id
  ) into v_restricted;

  if not v_restricted then
    return jsonb_build_object(
      'allowed',public.is_enrolled(p_course_id,v_user),
      'locked',false,
      'reason','Asignación individual.'
    );
  end if;

  select
    true,
    lp.name
  into v_unlocked,v_path_name
  from public.profiles p
  join public.job_position_paths jpp
    on jpp.position_id=p.job_position_id and jpp.required=true
  join public.learning_path_courses lpc
    on lpc.path_id=jpp.path_id and lpc.course_id=p_course_id
  join public.learning_paths lp on lp.id=lpc.path_id
  where p.id=v_user
    and public.training_course_is_unlocked(v_user,lp.id,p_course_id)
  limit 1;

  if coalesce(v_unlocked,false) then
    return jsonb_build_object(
      'allowed',true,'locked',false,'path_name',v_path_name
    );
  end if;

  select c.title
    into v_previous_title
  from public.profiles p
  join public.job_position_paths jpp
    on jpp.position_id=p.job_position_id and jpp.required=true
  join public.learning_path_courses current_lpc
    on current_lpc.path_id=jpp.path_id
   and current_lpc.course_id=p_course_id
  join public.learning_path_courses previous
    on previous.path_id=current_lpc.path_id
   and previous.required=true
   and previous.sort_order<current_lpc.sort_order
  join public.courses c on c.id=previous.course_id
  where p.id=v_user
    and not public.training_is_course_compliant(v_user,previous.course_id)
  order by previous.sort_order desc
  limit 1;

  return jsonb_build_object(
    'allowed',false,
    'locked',true,
    'path_name',v_path_name,
    'previous_course_title',v_previous_title,
    'reason',
      case when v_previous_title is null
        then 'Completa primero los pasos anteriores de tu ruta.'
        else 'Completa primero "'||v_previous_title||'".'
      end
  );
end;
$$;

revoke all on function public.get_my_course_route_access(uuid)
from public,anon;
grant execute on function public.get_my_course_route_access(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Analítica administrativa
-- ---------------------------------------------------------------------------
create or replace function public.admin_training_analytics()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_total_enrollments integer;
  v_completed integer;
  v_attempts integer;
  v_passed integer;
  v_average_score numeric;
  v_average_days numeric;
  v_at_risk integer;
  v_courses jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acceso denegado. Se requiere Admin o Super Admin.';
  end if;

  select
    count(*),
    count(*) filter(where status='completed'),
    round(avg(
      extract(epoch from (updated_at-created_at))/86400.0
    ) filter(where status='completed'),1)
  into v_total_enrollments,v_completed,v_average_days
  from public.enrollments;

  select
    count(*),
    count(*) filter(where passed),
    round(avg(score),1)
  into v_attempts,v_passed,v_average_score
  from public.exam_attempts;

  select count(distinct user_id)
    into v_at_risk
  from public.admin_training_compliance_rows()
  where compliance_state in ('overdue','expired');

  select coalesce(jsonb_agg(to_jsonb(x) order by x.assigned desc,x.course_title),'[]'::jsonb)
    into v_courses
  from (
    select
      c.id as course_id,
      c.title as course_title,
      (select count(*) from public.enrollments e where e.course_id=c.id) as assigned,
      (select count(*) from public.enrollments e where e.course_id=c.id and e.status='completed') as completed,
      coalesce((
        select round(
          100.0*count(*) filter(where e.status='completed')/
          nullif(count(*),0),1
        )
        from public.enrollments e
        where e.course_id=c.id
      ),0) as completion_percent,
      (select count(*) from public.exam_attempts a where a.course_id=c.id) as exam_attempts,
      coalesce((
        select round(
          100.0*count(*) filter(where a.passed)/nullif(count(*),0),1
        )
        from public.exam_attempts a
        where a.course_id=c.id
      ),0) as pass_percent,
      coalesce((
        select round(avg(a.score),1)
        from public.exam_attempts a
        where a.course_id=c.id
      ),0) as average_score
    from public.courses c
    where c.status<>'archived'
  ) x;

  return jsonb_build_object(
    'total_enrollments',v_total_enrollments,
    'completed',v_completed,
    'completion_percent',
      case when v_total_enrollments=0 then 0
      else round(100.0*v_completed/v_total_enrollments,1) end,
    'exam_attempts',v_attempts,
    'passed_attempts',v_passed,
    'pass_percent',
      case when v_attempts=0 then 0
      else round(100.0*v_passed/v_attempts,1) end,
    'average_score',coalesce(v_average_score,0),
    'average_completion_days',coalesce(v_average_days,0),
    'at_risk_users',coalesce(v_at_risk,0),
    'courses',v_courses
  );
end;
$$;

revoke all on function public.admin_training_analytics()
from public,anon;
grant execute on function public.admin_training_analytics()
to authenticated;

create or replace function public.admin_question_analytics()
returns table(
  course_id uuid,
  course_title text,
  question_id uuid,
  prompt text,
  answers_count bigint,
  correct_count bigint,
  error_percent numeric
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
  with picked as (
    select
      a.course_id,
      (entry.key)::uuid as question_id,
      (entry.value)::uuid as option_id
    from public.exam_attempts a
    cross join lateral jsonb_each_text(a.answers) entry
  ),
  stats as (
    select
      p.course_id,
      p.question_id,
      count(*) as answers_count,
      count(*) filter(where qo.is_correct) as correct_count
    from picked p
    join public.question_options qo
      on qo.id=p.option_id and qo.question_id=p.question_id
    group by p.course_id,p.question_id
  )
  select
    s.course_id,
    c.title,
    s.question_id,
    q.prompt,
    s.answers_count,
    s.correct_count,
    round(
      100.0*(s.answers_count-s.correct_count)/
      nullif(s.answers_count,0),
      1
    )
  from stats s
  join public.courses c on c.id=s.course_id
  join public.questions q on q.id=s.question_id
  order by
    round(
      100.0*(s.answers_count-s.correct_count)/
      nullif(s.answers_count,0),
      1
    ) desc,
    s.answers_count desc;
end;
$$;

revoke all on function public.admin_question_analytics()
from public,anon;
grant execute on function public.admin_question_analytics()
to authenticated;

create or replace function public.admin_content_block_analytics()
returns table(
  course_id uuid,
  course_title text,
  phase_id uuid,
  phase_title text,
  block_id uuid,
  block_title text,
  started_count bigint,
  completed_count bigint,
  completion_percent numeric
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
  select
    c.id,
    c.title,
    ph.id,
    ph.title,
    b.id,
    b.title,
    count(bp.id),
    count(bp.id) filter(where bp.status='completed'),
    coalesce(
      round(
        100.0*count(bp.id) filter(where bp.status='completed')/
        nullif(count(bp.id),0),
        1
      ),
      0
    )
  from public.content_blocks b
  join public.course_phases ph on ph.id=b.phase_id
  join public.courses c on c.id=ph.course_id
  left join public.block_progress bp on bp.block_id=b.id
  where b.status<>'draft'
  group by c.id,c.title,ph.id,ph.title,b.id,b.title,b.sort_order,ph.sort_order
  order by c.title,ph.sort_order,b.sort_order;
end;
$$;

revoke all on function public.admin_content_block_analytics()
from public,anon;
grant execute on function public.admin_content_block_analytics()
to authenticated;

-- ---------------------------------------------------------------------------
-- 11. Programación diaria en Supabase Cron
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;

select cron.schedule(
  'aula-ei-training-automation-daily',
  '5 13 * * *',
  'select public.process_training_automations();'
);

-- ---------------------------------------------------------------------------
-- 12. Hardening y permisos de trigger helpers
-- ---------------------------------------------------------------------------
revoke all on function public.capture_training_completion_evidence()
from public,anon,authenticated;

commit;
