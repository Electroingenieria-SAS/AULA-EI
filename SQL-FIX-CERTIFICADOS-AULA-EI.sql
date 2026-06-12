-- ============================================================
-- AULA EI · FIX CERTIFICADOS Y GENERACIÓN OFICIAL
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- Corrige/genera certificados obligatoriamente cuando el examen se aprueba
-- y habilita generación oficial desde Super Admin.
-- ============================================================

create extension if not exists pgcrypto;

create or replace function public.generate_certificate_code()
returns text
language sql
volatile
as $$
  select 'AEI-' || to_char(now(), 'YYYY') || '-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
$$;

create or replace function public.submit_exam(p_course_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_total integer;
  v_correct integer;
  v_score integer;
  v_passing integer;
  v_passed boolean;
  v_attempt uuid;
  v_code text;
  v_certificate_id uuid;
begin
  if v_user is null then
    raise exception 'Sesión requerida.';
  end if;

  if not public.is_enrolled(p_course_id, v_user) then
    raise exception 'No estás asignado a esta capacitación.';
  end if;

  if not public.can_take_exam(p_course_id, v_user) then
    raise exception 'Completa primero todos los contenidos obligatorios.';
  end if;

  select passing_score
  into v_passing
  from public.courses
  where id = p_course_id
    and status = 'published';

  if v_passing is null then
    raise exception 'Curso no disponible.';
  end if;

  select count(*)
  into v_total
  from public.questions
  where course_id = p_course_id
    and active = true;

  if v_total = 0 then
    raise exception 'El examen no tiene preguntas.';
  end if;

  select count(*)
  into v_correct
  from public.questions q
  join public.question_options o
    on o.question_id = q.id
   and o.is_correct = true
  where q.course_id = p_course_id
    and q.active = true
    and (p_answers ->> q.id::text) = o.id::text;

  v_score := round((v_correct::numeric / v_total::numeric) * 100)::integer;
  v_passed := v_score >= v_passing;

  insert into public.exam_attempts (
    course_id,
    user_id,
    answers,
    score,
    passed
  )
  values (
    p_course_id,
    v_user,
    p_answers,
    v_score,
    v_passed
  )
  returning id into v_attempt;

  if v_passed then
    v_code := public.generate_certificate_code();

    insert into public.certificates (
      course_id,
      user_id,
      exam_attempt_id,
      certificate_code,
      score
    )
    values (
      p_course_id,
      v_user,
      v_attempt,
      v_code,
      v_score
    )
    on conflict (course_id, user_id) do update
    set
      exam_attempt_id = excluded.exam_attempt_id,
      score = excluded.score,
      issued_at = now()
    returning id, certificate_code
    into v_certificate_id, v_code;

    update public.enrollments
    set
      status = 'completed',
      updated_at = now()
    where course_id = p_course_id
      and user_id = v_user;
  else
    update public.enrollments
    set
      status = 'in_progress',
      updated_at = now()
    where course_id = p_course_id
      and user_id = v_user;
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt,
    'score', v_score,
    'passed', v_passed,
    'certificate_id', v_certificate_id,
    'certificate_code', v_code
  );
end;
$$;

create or replace function public.admin_generate_certificate(
  p_course_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_attempt uuid;
  v_score integer;
  v_code text;
  v_certificate_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado. Solo un administrador puede generar certificados.';
  end if;

  select id, score
  into v_attempt, v_score
  from public.exam_attempts
  where course_id = p_course_id
    and user_id = p_user_id
    and passed = true
  order by submitted_at desc
  limit 1;

  if v_attempt is null then
    raise exception 'No existe un examen aprobado para este usuario y capacitación. No se puede emitir certificado oficial.';
  end if;

  v_code := public.generate_certificate_code();

  insert into public.certificates (
    course_id,
    user_id,
    exam_attempt_id,
    certificate_code,
    score
  )
  values (
    p_course_id,
    p_user_id,
    v_attempt,
    v_code,
    v_score
  )
  on conflict (course_id, user_id) do update
  set
    exam_attempt_id = excluded.exam_attempt_id,
    score = excluded.score,
    issued_at = now()
  returning id, certificate_code
  into v_certificate_id, v_code;

  update public.enrollments
  set
    status = 'completed',
    updated_at = now()
  where course_id = p_course_id
    and user_id = p_user_id;

  return jsonb_build_object(
    'certificate_id', v_certificate_id,
    'certificate_code', v_code,
    'score', v_score,
    'passed', true
  );
end;
$$;

create or replace function public.admin_repair_missing_certificates()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_count integer := 0;
  r record;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado.';
  end if;

  for r in
    select distinct on (ea.course_id, ea.user_id)
      ea.course_id,
      ea.user_id,
      ea.id as attempt_id,
      ea.score
    from public.exam_attempts ea
    left join public.certificates c
      on c.course_id = ea.course_id
     and c.user_id = ea.user_id
    where ea.passed = true
      and c.id is null
    order by ea.course_id, ea.user_id, ea.submitted_at desc
  loop
    insert into public.certificates (
      course_id,
      user_id,
      exam_attempt_id,
      certificate_code,
      score
    )
    values (
      r.course_id,
      r.user_id,
      r.attempt_id,
      public.generate_certificate_code(),
      r.score
    );

    update public.enrollments
    set status = 'completed', updated_at = now()
    where course_id = r.course_id
      and user_id = r.user_id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.generate_certificate_code() to authenticated;
grant execute on function public.submit_exam(uuid, jsonb) to authenticated;
grant execute on function public.admin_generate_certificate(uuid, uuid) to authenticated;
grant execute on function public.admin_repair_missing_certificates() to authenticated;

-- Reparar certificados faltantes existentes si ya hubo exámenes aprobados antes de este ajuste.
select public.admin_repair_missing_certificates() as certificados_reparados;
