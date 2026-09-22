-- Aula EI: contrato único de estados de matrícula y sincronización.
alter table public.enrollments
  drop constraint if exists enrollments_status_check;

alter table public.enrollments
  add constraint enrollments_status_check
  check (status = any (array[
    'assigned'::text,
    'in_progress'::text,
    'completed'::text,
    'expired'::text,
    'cancelled'::text
  ]));

create or replace function public.sync_user_training_system(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
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
  where p.id=p_user_id
    and p.is_active=true;

  if not found then
    return jsonb_build_object(
      'ok',false,
      'user_id',p_user_id,
      'processed',0,
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
      on lp.id=jpp.path_id
     and lp.is_active=true
    join public.learning_path_courses lpc
      on lpc.path_id=lp.id
     and lpc.required=true
    join public.courses c
      on c.id=lpc.course_id
    where jpp.position_id=v_position
      and jpp.required=true
      and c.status='published'
    order by lpc.path_id,lpc.sort_order
  loop
    v_processed:=v_processed+1;

    if not public.training_course_is_unlocked(p_user_id,req.path_id,req.course_id) then
      v_locked:=v_locked+1;
      continue;
    end if;

    select e.status
      into v_existing_status
    from public.enrollments e
    where e.course_id=req.course_id
      and e.user_id=p_user_id;

    insert into public.enrollments(
      course_id,user_id,due_at,status,created_at,updated_at
    )
    values(
      req.course_id,
      p_user_id,
      case
        when req.due_days is null then null
        else now()+make_interval(days=>req.due_days)
      end,
      'assigned',
      now(),
      now()
    )
    on conflict(course_id,user_id) do update
      set status=case
            when public.enrollments.status in ('expired','cancelled') then 'assigned'
            else public.enrollments.status
          end,
          due_at=case
            when public.enrollments.status='completed'
             and public.training_is_course_compliant(p_user_id,req.course_id)
              then public.enrollments.due_at
            when public.enrollments.status in ('expired','cancelled')
              then excluded.due_at
            when public.enrollments.due_at is not null
              then public.enrollments.due_at
            else excluded.due_at
          end,
          updated_at=now();

    if v_existing_status is null then
      v_inserted:=v_inserted+1;
    elsif v_existing_status in ('expired','cancelled') then
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
$function$;

alter function public.get_my_certificates()
  set search_path = public, pg_temp;
