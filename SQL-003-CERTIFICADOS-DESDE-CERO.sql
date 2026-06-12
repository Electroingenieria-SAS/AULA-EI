-- ============================================================
-- AULA EI · CERTIFICADOS DESDE CERO
-- Soluciona:
-- 1) Generación obligatoria al aprobar examen.
-- 2) Apertura del certificado desde ruta interna de la app.
-- 3) Ranking y consultas sin errores de relaciones ambiguas.
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- 1. Código único de certificado
-- ============================================================

create or replace function public.next_certificate_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_year text := to_char(now(), 'YYYY');
  v_try integer := 0;
begin
  loop
    v_try := v_try + 1;

    v_code :=
      'AEI-' ||
      v_year ||
      '-' ||
      upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));

    exit when not exists (
      select 1
      from public.certificates
      where certificate_code = v_code
    );

    if v_try > 30 then
      raise exception 'No fue posible generar un código único de certificado.';
    end if;
  end loop;

  return v_code;
end;
$$;

-- ============================================================
-- 2. submit_exam reconstruida
-- Al aprobar:
-- - inserta intento
-- - genera certificado obligatorio
-- - marca matrícula como completed
-- - devuelve certificate_code al frontend
-- ============================================================

create or replace function public.submit_exam(
  p_course_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
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
  v_existing_code text;
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
    raise exception 'Curso no disponible o no publicado.';
  end if;

  select count(*)
  into v_total
  from public.questions
  where course_id = p_course_id
    and active = true;

  if v_total = 0 then
    raise exception 'El examen no tiene preguntas activas.';
  end if;

  select count(*)
  into v_correct
  from public.questions q
  join public.question_options o
    on o.question_id = q.id
   and o.is_correct = true
  where q.course_id = p_course_id
    and q.active = true
    and (coalesce(p_answers, '{}'::jsonb) ->> (q.id::text)) = o.id::text;

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
    coalesce(p_answers, '{}'::jsonb),
    v_score,
    v_passed
  )
  returning id into v_attempt;

  if v_passed then
    select certificate_code
    into v_existing_code
    from public.certificates
    where course_id = p_course_id
      and user_id = v_user;

    v_code := coalesce(v_existing_code, public.next_certificate_code());

    insert into public.certificates (
      course_id,
      user_id,
      exam_attempt_id,
      certificate_code,
      score,
      issued_at
    )
    values (
      p_course_id,
      v_user,
      v_attempt,
      v_code,
      v_score,
      now()
    )
    on conflict (course_id, user_id)
    do update
    set
      exam_attempt_id = excluded.exam_attempt_id,
      certificate_code = public.certificates.certificate_code,
      score = greatest(public.certificates.score, excluded.score),
      issued_at = public.certificates.issued_at
    returning certificate_code into v_code;

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
    'certificate_code', v_code
  );
end;
$$;

-- ============================================================
-- 3. Obtener mis certificados
-- No usa relaciones embebidas; evita errores PostgREST.
-- ============================================================

create or replace function public.get_my_certificates()
returns table (
  certificate_code text,
  course_id uuid,
  course_title text,
  user_id uuid,
  user_full_name text,
  user_email text,
  score integer,
  issued_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    cert.certificate_code,
    cert.course_id,
    c.title as course_title,
    cert.user_id,
    p.full_name as user_full_name,
    p.email as user_email,
    cert.score,
    cert.issued_at
  from public.certificates cert
  join public.courses c
    on c.id = cert.course_id
  join public.profiles p
    on p.id = cert.user_id
  where cert.user_id = auth.uid()
  order by cert.issued_at desc;
$$;

-- ============================================================
-- 4. Obtener certificado por código
-- Para la ruta interna /certificate/:code.
-- Solo lo ve el dueño o un admin.
-- ============================================================

create or replace function public.get_certificate_by_code(
  p_certificate_code text
)
returns table (
  certificate_code text,
  course_id uuid,
  course_title text,
  user_id uuid,
  user_full_name text,
  user_email text,
  score integer,
  issued_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    cert.certificate_code,
    cert.course_id,
    c.title as course_title,
    cert.user_id,
    p.full_name as user_full_name,
    p.email as user_email,
    cert.score,
    cert.issued_at
  from public.certificates cert
  join public.courses c
    on c.id = cert.course_id
  join public.profiles p
    on p.id = cert.user_id
  where lower(cert.certificate_code) = lower(p_certificate_code)
    and (
      cert.user_id = auth.uid()
      or public.is_admin()
    )
  limit 1;
$$;

-- ============================================================
-- 5. Ranking administrativo de certificados
-- Sin embeds ambiguos.
-- ============================================================

create or replace function public.admin_certificate_ranking()
returns table (
  certificate_code text,
  course_id uuid,
  course_title text,
  user_id uuid,
  user_full_name text,
  user_email text,
  score integer,
  issued_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    cert.certificate_code,
    cert.course_id,
    c.title as course_title,
    cert.user_id,
    p.full_name as user_full_name,
    p.email as user_email,
    cert.score,
    cert.issued_at
  from public.certificates cert
  join public.courses c
    on c.id = cert.course_id
  join public.profiles p
    on p.id = cert.user_id
  where public.is_admin()
  order by cert.score desc, cert.issued_at desc;
$$;

-- ============================================================
-- 6. Aprobados sin certificado
-- Busca intentos aprobados que todavía no tienen certificado.
-- ============================================================

create or replace function public.admin_completed_without_certificate()
returns table (
  course_id uuid,
  course_title text,
  user_id uuid,
  user_full_name text,
  user_email text,
  score integer,
  completed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with approved as (
    select distinct on (ea.course_id, ea.user_id)
      ea.course_id,
      ea.user_id,
      ea.score,
      ea.submitted_at
    from public.exam_attempts ea
    where ea.passed = true
    order by ea.course_id, ea.user_id, ea.score desc, ea.submitted_at desc
  )
  select
    a.course_id,
    c.title as course_title,
    a.user_id,
    p.full_name as user_full_name,
    p.email as user_email,
    a.score,
    a.submitted_at as completed_at
  from approved a
  join public.courses c
    on c.id = a.course_id
  join public.profiles p
    on p.id = a.user_id
  where public.is_admin()
    and not exists (
      select 1
      from public.certificates cert
      where cert.course_id = a.course_id
        and cert.user_id = a.user_id
    )
  order by a.submitted_at desc;
$$;

-- ============================================================
-- 7. Generar certificado oficial desde Super Admin
-- Solo si existe examen aprobado.
-- ============================================================

create or replace function public.admin_generate_certificate(
  p_course_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_id uuid;
  v_score integer;
  v_code text;
  v_existing_code text;
begin
  if not public.is_admin() then
    raise exception 'Acceso denegado.';
  end if;

  select id, score
  into v_attempt_id, v_score
  from public.exam_attempts
  where course_id = p_course_id
    and user_id = p_user_id
    and passed = true
  order by score desc, submitted_at desc
  limit 1;

  if v_attempt_id is null then
    raise exception 'Este usuario no tiene un examen aprobado para esta capacitación.';
  end if;

  select certificate_code
  into v_existing_code
  from public.certificates
  where course_id = p_course_id
    and user_id = p_user_id;

  v_code := coalesce(v_existing_code, public.next_certificate_code());

  insert into public.certificates (
    course_id,
    user_id,
    exam_attempt_id,
    certificate_code,
    score,
    issued_at
  )
  values (
    p_course_id,
    p_user_id,
    v_attempt_id,
    v_code,
    v_score,
    now()
  )
  on conflict (course_id, user_id)
  do update
  set
    exam_attempt_id = excluded.exam_attempt_id,
    certificate_code = public.certificates.certificate_code,
    score = greatest(public.certificates.score, excluded.score),
    issued_at = public.certificates.issued_at
  returning certificate_code into v_code;

  update public.enrollments
  set
    status = 'completed',
    updated_at = now()
  where course_id = p_course_id
    and user_id = p_user_id;

  return jsonb_build_object(
    'course_id', p_course_id,
    'user_id', p_user_id,
    'certificate_code', v_code,
    'score', v_score,
    'generated', true
  );
end;
$$;

-- ============================================================
-- 8. Reparar certificados faltantes de exámenes aprobados
-- ============================================================

insert into public.certificates (
  course_id,
  user_id,
  exam_attempt_id,
  certificate_code,
  score,
  issued_at
)
select
  x.course_id,
  x.user_id,
  x.id as exam_attempt_id,
  public.next_certificate_code() as certificate_code,
  x.score,
  coalesce(x.submitted_at, now()) as issued_at
from (
  select distinct on (ea.course_id, ea.user_id)
    ea.id,
    ea.course_id,
    ea.user_id,
    ea.score,
    ea.submitted_at
  from public.exam_attempts ea
  where ea.passed = true
  order by
    ea.course_id,
    ea.user_id,
    ea.score desc,
    ea.submitted_at desc
) x
where not exists (
  select 1
  from public.certificates cert
  where cert.course_id = x.course_id
    and cert.user_id = x.user_id
)
on conflict (course_id, user_id) do nothing;

update public.enrollments e
set
  status = 'completed',
  updated_at = now()
where exists (
  select 1
  from public.certificates cert
  where cert.course_id = e.course_id
    and cert.user_id = e.user_id
);

grant execute on function public.next_certificate_code() to authenticated;
grant execute on function public.submit_exam(uuid, jsonb) to authenticated;
grant execute on function public.get_my_certificates() to authenticated;
grant execute on function public.get_certificate_by_code(text) to authenticated;
grant execute on function public.admin_certificate_ranking() to authenticated;
grant execute on function public.admin_completed_without_certificate() to authenticated;
grant execute on function public.admin_generate_certificate(uuid, uuid) to authenticated;

commit;

-- Verificación rápida
select
  cert.certificate_code,
  p.email,
  p.full_name,
  c.title as curso,
  cert.score,
  cert.issued_at
from public.certificates cert
join public.profiles p
  on p.id = cert.user_id
join public.courses c
  on c.id = cert.course_id
order by cert.issued_at desc;
