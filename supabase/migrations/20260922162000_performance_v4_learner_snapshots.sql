-- Performance v4: consolidate learner screen reads into RLS-safe snapshots.
-- Both functions are SECURITY INVOKER and therefore preserve the caller's RLS.

create or replace function public.get_my_home_snapshot()
returns jsonb
language sql
stable
security invoker
set search_path to 'public','pg_temp'
as $function$
  with my_enrollments as (
    select
      e.id,
      e.status,
      e.due_at,
      e.created_at,
      case when c.id is null then null else jsonb_build_object(
        'id',c.id,
        'title',c.title,
        'description',c.description,
        'passing_score',c.passing_score,
        'status',c.status,
        'cover_path',c.cover_path
      ) end as course
    from public.enrollments e
    left join public.courses c on c.id=e.course_id
    where e.user_id=auth.uid()
    order by e.created_at desc
  )
  select jsonb_build_object(
    'enrollments',coalesce((select jsonb_agg(to_jsonb(x)) from my_enrollments x),'[]'::jsonb),
    'certificates',coalesce((select jsonb_agg(to_jsonb(c)) from public.get_my_certificates() c),'[]'::jsonb),
    'training_profile',public.get_my_training_profile()
  );
$function$;

create or replace function public.get_my_catalog_snapshot()
returns jsonb
language sql
stable
security invoker
set search_path to 'public','pg_temp'
as $function$
  with my_enrollments as (
    select
      e.id,
      e.status,
      e.due_at,
      e.created_at,
      e.updated_at,
      e.course_id,
      case when c.id is null then null else jsonb_build_object(
        'id',c.id,
        'title',c.title,
        'description',c.description,
        'passing_score',c.passing_score,
        'status',c.status,
        'cover_path',c.cover_path
      ) end as course
    from public.enrollments e
    left join public.courses c on c.id=e.course_id
    where e.user_id=auth.uid()
    order by e.created_at desc
  ),
  my_course_ids as (
    select distinct course_id from my_enrollments where course_id is not null
  ),
  visible_phases as (
    select jsonb_build_object(
      'id',p.id,
      'course_id',p.course_id,
      'blocks',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',b.id,
          'required',b.required,
          'status',b.status
        ) order by b.sort_order)
        from public.content_blocks b
        where b.phase_id=p.id
      ),'[]'::jsonb)
    ) as row_data
    from public.course_phases p
    where p.course_id in (select course_id from my_course_ids)
  ),
  my_progress as (
    select jsonb_build_object(
      'block_id',bp.block_id,
      'status',bp.status,
      'progress_percent',bp.progress_percent,
      'completed_at',bp.completed_at
    ) as row_data
    from public.block_progress bp
    where bp.user_id=auth.uid()
      and exists (
        select 1
        from public.content_blocks b
        join public.course_phases p on p.id=b.phase_id
        where b.id=bp.block_id
          and p.course_id in (select course_id from my_course_ids)
      )
  )
  select jsonb_build_object(
    'enrollments',coalesce((select jsonb_agg(to_jsonb(x)) from my_enrollments x),'[]'::jsonb),
    'phases',coalesce((select jsonb_agg(row_data) from visible_phases),'[]'::jsonb),
    'progress',coalesce((select jsonb_agg(row_data) from my_progress),'[]'::jsonb),
    'certificates',coalesce((select jsonb_agg(to_jsonb(c)) from public.get_my_certificates() c),'[]'::jsonb)
  );
$function$;

revoke all on function public.get_my_home_snapshot() from public, anon;
revoke all on function public.get_my_catalog_snapshot() from public, anon;
grant execute on function public.get_my_home_snapshot() to authenticated;
grant execute on function public.get_my_catalog_snapshot() to authenticated;
