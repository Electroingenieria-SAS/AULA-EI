-- Include employees with explicitly verified jobs from the supplied HR matrix.
-- This changes only read-time reporting. No enrollment, certificates, score or
-- historical event is rewritten; existing cohorts still use latest attempts.
CREATE OR REPLACE FUNCTION public.admin_position_assessment_metrics()
 RETURNS TABLE(position_id uuid, position_name text, people_count bigint, evaluated_people bigint, approved_count bigint, failed_count bigint, mean_score numeric, technical_people bigint, technical_mean_score numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;
comment on function public.admin_position_assessment_metrics() is
'Aggregates exam attempts by verified current job position for both new and historical profiles. Prior exams are not rewritten or asserted to reflect a historical job.';
