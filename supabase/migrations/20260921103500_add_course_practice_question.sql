-- Practice question helper for the learner course player.
-- Returns one real exam-bank question without exposing which option is correct.

create or replace function public.get_course_practice_question(
  p_course_id uuid,
  p_seed text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
  v_seed text := coalesce(nullif(p_seed, ''), extract(epoch from clock_timestamp())::text);
begin
  if v_user is null then
    raise exception 'Sesión requerida.';
  end if;

  if not public.is_aula_active(v_user) then
    raise exception 'Cuenta no habilitada para Aula EI.';
  end if;

  if not (
    public.can_manage_courses()
    or public.is_enrolled(p_course_id, v_user)
  ) then
    raise exception 'No tienes acceso a esta capacitación.';
  end if;

  select jsonb_build_object(
    'id', q.id,
    'prompt', q.prompt,
    'options', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', o.id, 'label', o.label)
        order by o.sort_order
      )
      from public.question_options o
      where o.question_id = q.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.questions q
  where q.course_id = p_course_id
    and q.active = true
  order by md5(
    q.id::text || ':' ||
    v_user::text || ':' ||
    p_course_id::text || ':' ||
    v_seed
  )
  limit 1;

  if v_result is null then
    raise exception 'El examen no tiene preguntas activas.';
  end if;

  return v_result;
end;
$$;

revoke execute on function public.get_course_practice_question(uuid, text) from public, anon;
grant execute on function public.get_course_practice_question(uuid, text) to authenticated, service_role;
