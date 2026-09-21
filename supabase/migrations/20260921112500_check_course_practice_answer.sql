-- Validate only the practice option selected by the learner.
-- The function deliberately returns only true/false and never discloses
-- which different option is correct.

create or replace function public.check_course_practice_answer(
  p_course_id uuid,
  p_question_id uuid,
  p_option_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_valid_question boolean;
  v_correct boolean;
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

  select exists (
    select 1
    from public.questions q
    where q.id = p_question_id
      and q.course_id = p_course_id
      and q.active = true
  )
  into v_valid_question;

  if not v_valid_question then
    raise exception 'Pregunta de práctica inválida.';
  end if;

  select o.is_correct
  into v_correct
  from public.question_options o
  where o.id = p_option_id
    and o.question_id = p_question_id
  limit 1;

  if v_correct is null then
    raise exception 'Opción de práctica inválida.';
  end if;

  return jsonb_build_object('correct', v_correct);
end;
$$;

revoke execute on function public.check_course_practice_answer(uuid, uuid, uuid) from public, anon;
grant execute on function public.check_course_practice_answer(uuid, uuid, uuid) to authenticated, service_role;
