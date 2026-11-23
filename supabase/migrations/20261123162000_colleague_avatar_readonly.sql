-- Add an already-authorized avatar visual marker to the existing restricted colleague profile.
-- Permission checks and academic privacy remain unchanged.
CREATE OR REPLACE FUNCTION public.get_training_colleague_profile(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  select p.full_name, p.is_active, p.created_at, p.avatar_url, jp.name as position_name,
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
    'avatar_url',v_person.avatar_url,
    'position',coalesce(v_person.position_name,'Cargo por definir'),
    'department',v_person.department_name,
    'created_at',v_person.created_at,
    'completed_courses',v_completed,
    'assigned_count',v_total,
    'completed_count',v_done,
    'completion_percent',case when v_total=0 then 0 else round(v_done * 100.0/v_total) end
  );
end;
$function$
;
