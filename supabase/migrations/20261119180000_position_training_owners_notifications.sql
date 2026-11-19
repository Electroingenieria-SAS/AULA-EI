-- Aula EI: responsible trainers and position-aware onboarding notifications.
-- Additive changes: historical courses, profiles and completions remain intact.
alter table public.courses
  add column if not exists responsible_id uuid references public.profiles(id) on delete set null;
create index if not exists courses_responsible_id_idx on public.courses(responsible_id)
  where responsible_id is not null;

create or replace function public.check_course_responsible()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if new.responsible_id is not null and not exists (
    select 1 from public.profiles p
    where p.id = new.responsible_id and p.is_active = true
      and p.role in ('creador_contenido', 'revisor', 'admin', 'super_admin')
  ) then
    raise exception 'El responsable debe ser un usuario activo con permisos de formación.';
  end if;
  return new;
end;
$$;
revoke all on function public.check_course_responsible() from public, anon, authenticated;
drop trigger if exists check_course_responsible on public.courses;
create trigger check_course_responsible
  before insert or update of responsible_id on public.courses
  for each row execute function public.check_course_responsible();

-- Existing role names are preserved; "Supervisor / Revisor" uses revisor.
-- Administrators may delegate ONLY lower-level roles, not admin/super_admin.
create or replace function public.set_user_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_target_role text;
  v_new_role text;
  v_super_count integer;
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'Acceso denegado. Se requiere una sesión administrativa con MFA.';
  end if;
  select role into v_actor_role from public.profiles
  where id = v_actor and is_active = true;
  if p_user_id = v_actor then
    raise exception 'No puedes cambiar tu propio rol desde este panel.';
  end if;
  v_new_role := lower(trim(coalesce(p_role, '')));
  if v_new_role not in ('colaborador','creador_contenido','revisor','admin','super_admin') then
    raise exception 'Rol inválido.';
  end if;
  select role into v_target_role from public.profiles
    where id = p_user_id and is_active = true;
  if v_target_role is null then
    raise exception 'Usuario activo no encontrado en Aula EI.';
  end if;
  if v_actor_role = 'admin' and (
    v_target_role in ('admin','super_admin')
    or v_new_role not in ('colaborador','creador_contenido','revisor')
  ) then
    raise exception 'Un administrador solo puede gestionar roles inferiores a Administrador.';
  end if;
  if v_actor_role not in ('admin','super_admin') then
    raise exception 'El rol del actor no está autorizado.';
  end if;
  if v_target_role = 'super_admin' and v_new_role <> 'super_admin' then
    select count(*) into v_super_count from public.profiles
      where is_active = true and role = 'super_admin';
    if v_super_count <= 1 then
      raise exception 'No se puede degradar al último Super Admin activo.';
    end if;
  end if;
  update public.profiles set role = v_new_role, updated_at = now()
    where id = p_user_id;
  update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb)
      || jsonb_build_object('aula_ei_role',v_new_role,'aula_ei_active',true),
        raw_user_meta_data = coalesce(raw_user_meta_data,'{}'::jsonb)
      || jsonb_build_object('managed_role',v_new_role)
    where id = p_user_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(v_actor,'set_user_role','profile',p_user_id,
    jsonb_build_object('old_role',v_target_role,'new_role',v_new_role));
end;
$$;
revoke all on function public.set_user_role(uuid,text) from public, anon;
grant execute on function public.set_user_role(uuid,text) to authenticated;

-- The recipient is the designated trainer, never implicitly the uploader.
create or replace function public.notify_course_responsible_on_completion()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_responsible uuid;
  v_person text;
  v_position text;
  v_title text;
  v_total integer;
  v_completed integer;
  v_recipient record;
begin
  if new.status <> 'completed' then return new; end if;
  if tg_op = 'UPDATE' then
    if old.status = 'completed' then return new; end if;
  end if;
  select c.responsible_id, c.title
    into v_responsible, v_title
    from public.courses c where c.id = new.course_id;
  select p.full_name, jp.name into v_person, v_position
    from public.profiles p
    left join public.job_positions jp on jp.id = p.job_position_id
    where p.id = new.user_id;
  v_person := coalesce(nullif(trim(v_person), ''), 'Un colaborador');
  v_position := coalesce(v_position,'cargo pendiente de parametrizar');

  if v_responsible is not null and exists (
    select 1 from public.profiles p
    where p.id = v_responsible and p.is_active = true
  ) then
    insert into public.training_notifications
      (user_id,notification_type,title,message,course_id,dedupe_key,metadata)
    values (
      v_responsible, 'responsible_course_completed', 'Capacitación finalizada',
      v_person || ' (' || v_position || ') completó ' || coalesce(v_title,'su capacitación') || '.',
      new.course_id, 'trainer:completed:' || new.id::text,
      jsonb_build_object('colleague_id',new.user_id,'course_id',new.course_id,'position',v_position)
    ) on conflict (dedupe_key) do nothing;
  end if;

  -- An induction is complete only when there are active assigned courses,
  -- and every non-cancelled assignment is completed. This is NOT proof of hire.
  select count(*), count(*) filter (where status = 'completed')
    into v_total, v_completed
    from public.enrollments e
    where e.user_id = new.user_id and e.status <> 'cancelled';
  if v_total > 0 and v_total = v_completed then
    for v_recipient in
      select distinct c.responsible_id as recipient_id
      from public.enrollments e
      join public.courses c on c.id = e.course_id
      join public.profiles owner on owner.id = c.responsible_id and owner.is_active = true
      where e.user_id = new.user_id
        and e.status = 'completed' and c.responsible_id is not null
    loop
      insert into public.training_notifications
        (user_id,notification_type,title,message,dedupe_key,metadata)
      values (
        v_recipient.recipient_id, 'responsible_induction_completed',
        'Plan de capacitación al 100 %',
        v_person || ' (' || v_position || ') completó el 100 % de sus capacitaciones asignadas. La vinculación laboral debe confirmarla el área responsable.',
        'trainer:induction:' || new.user_id::text || ':' || v_recipient.recipient_id::text,
        jsonb_build_object('colleague_id',new.user_id,'completion_percent',100,'position',v_position)
      ) on conflict (dedupe_key) do nothing;
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_course_responsible_on_completion() from public, anon, authenticated;
drop trigger if exists trg_notify_course_responsible_on_completion on public.enrollments;
create trigger trg_notify_course_responsible_on_completion
  after insert or update of status on public.enrollments
  for each row execute function public.notify_course_responsible_on_completion();

-- Least-privilege social-style profile for staff who own one of the learner's courses.
-- No private email, password, security fields or unassigned training is exposed.
create or replace function public.get_training_colleague_profile(p_user_id uuid)
returns jsonb language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_person record;
  v_allowed boolean;
  v_completed jsonb;
  v_total integer;
  v_done integer;
begin
  if auth.uid() is null or not public.is_aula_active() then
    raise exception 'No autorizado.';
  end if;
  v_allowed := p_user_id = auth.uid() or public.is_admin() or exists (
    select 1 from public.enrollments e
    join public.courses c on c.id = e.course_id
    where e.user_id = p_user_id and c.responsible_id = auth.uid()
  );
  if not v_allowed then raise exception 'Perfil no disponible para este responsable.'; end if;

  select p.full_name, p.is_active, p.created_at, jp.name as position_name,
    jp.department as department_name
  into v_person
  from public.profiles p
  left join public.job_positions jp on jp.id = p.job_position_id
  where p.id = p_user_id;
  if not found or v_person.is_active is distinct from true then
    raise exception 'Perfil no disponible.';
  end if;

  select count(*), count(*) filter (where e.status = 'completed')
    into v_total, v_done
  from public.enrollments e
  where e.user_id = p_user_id and e.status <> 'cancelled';

  select coalesce(jsonb_agg(jsonb_build_object('title',c.title,'completed_at',e.updated_at)
    order by e.updated_at desc), '[]'::jsonb) into v_completed
  from public.enrollments e join public.courses c on c.id=e.course_id
  where e.user_id=p_user_id and e.status='completed'
    and (public.is_admin() or p_user_id=auth.uid() or c.responsible_id=auth.uid());

  return jsonb_build_object(
    'id',p_user_id,
    'full_name',coalesce(v_person.full_name,'Colaborador EI'),
    'position',coalesce(v_person.position_name,'Cargo por definir'),
    'department',v_person.department_name,
    'created_at',v_person.created_at,
    'completed_courses',v_completed,
    'assigned_count',v_total,
    'completed_count',v_done,
    'completion_percent',case when v_total=0 then 0 else round(v_done * 100.0/v_total) end
  );
end;
$$;
revoke all on function public.get_training_colleague_profile(uuid) from public, anon;
grant execute on function public.get_training_colleague_profile(uuid) to authenticated;

-- Populate position-driven training whenever a managed profile receives a new cargo.
-- The core sync function is idempotent; keeping this on the database prevents
-- creation flows from diverging even when a UI request is interrupted.
create or replace function public.sync_training_on_profile_position()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if new.is_active = true and new.job_position_id is not null then
    if tg_op = 'INSERT' then
      perform public.sync_user_training_system(new.id);
    elsif new.job_position_id is distinct from old.job_position_id then
      perform public.sync_user_training_system(new.id);
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.sync_training_on_profile_position() from public, anon, authenticated;
drop trigger if exists trg_sync_training_on_profile_position on public.profiles;
create trigger trg_sync_training_on_profile_position
  after insert or update of job_position_id on public.profiles
  for each row execute function public.sync_training_on_profile_position();

create or replace function public.list_course_responsibles()
returns table (id uuid, full_name text, role text)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select p.id, coalesce(nullif(p.full_name,''),p.email,'Usuario EI'),p.role
  from public.profiles p
  where public.can_manage_courses()
    and p.is_active = true
    and p.role in ('creador_contenido','revisor','admin','super_admin')
  order by p.full_name,p.email;
$$;
revoke all on function public.list_course_responsibles() from public, anon;
grant execute on function public.list_course_responsibles() to authenticated;


-- Position-level examination KPIs: latest exam attempt per learner/course.
-- Suppress cohorts below three evaluated people. No personal data exposed.
create or replace function public.admin_position_assessment_metrics()
returns table (
  position_id uuid,
  position_name text,
  people_count bigint,
  evaluated_people bigint,
  approved_count bigint,
  failed_count bigint,
  mean_score numeric,
  technical_people bigint,
  technical_mean_score numeric
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Se requiere una sesión administrativa activa y verificada con MFA.';
  end if;
  return query
  with recent_attempt as (
    select distinct on (ea.user_id, ea.course_id)
      ea.user_id, ea.course_id, ea.passed, ea.score
    from public.exam_attempts ea
    order by ea.user_id, ea.course_id, ea.submitted_at desc, ea.id desc
  ), attributed as (
    select p.job_position_id, a.user_id, a.passed, a.score,
      exists (
        select 1 from public.course_competencies cc
        join public.training_competencies tc on tc.id = cc.competency_id
        where cc.course_id = a.course_id
          and lower(trim(tc.category)) in ('tecnica','técnica','tecnico','técnico')
      ) as technical
    from recent_attempt a
    join public.profiles p on p.id = a.user_id and p.is_active = true
      and p.job_position_id is not null
  )
  select jp.id, jp.name,
    count(distinct p.id)::bigint,
    count(distinct a.user_id)::bigint,
    case when count(distinct a.user_id) >= 3
      then count(a.user_id) filter (where a.passed is true)::bigint
      else null end,
    case when count(distinct a.user_id) >= 3
      then count(a.user_id) filter (where a.passed is false)::bigint
      else null end,
    case when count(distinct a.user_id) >= 3
      then round(avg(a.score),1) else null end,
    case when count(distinct a.user_id) filter (where a.technical) >= 3
      then count(distinct a.user_id) filter (where a.technical)::bigint else null end,
    case when count(distinct a.user_id) filter (where a.technical) >= 3
      then round(avg(a.score) filter (where a.technical),1) else null end
  from public.job_positions jp
  left join public.profiles p
    on p.job_position_id = jp.id and p.is_active = true
  left join attributed a on a.user_id = p.id and a.job_position_id = jp.id
  where jp.is_active = true
  group by jp.id,jp.name
  order by jp.name;
end;
$$;
revoke all on function public.admin_position_assessment_metrics() from public, anon;
grant execute on function public.admin_position_assessment_metrics() to authenticated;
