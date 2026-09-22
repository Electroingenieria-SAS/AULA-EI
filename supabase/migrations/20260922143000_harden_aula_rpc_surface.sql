-- Aula EI RPC surface hardening.
-- Reduce SECURITY DEFINER exposure without changing the public frontend contract.

-- 1. Read-only administrative reports use the caller's RLS context.
alter function public.admin_certificate_ranking() security invoker;
alter function public.admin_completed_without_certificate() security invoker;
alter function public.admin_content_block_analytics() security invoker;
alter function public.admin_question_analytics() security invoker;
alter function public.admin_training_analytics() security invoker;
alter function public.admin_training_compliance_rows() security invoker;
alter function public.admin_training_engine_snapshot() security invoker;

-- 2. Authorization wrappers do not need owner privileges. Their underlying
-- role primitives (is_admin/is_super_admin/is_aula_active) remain SECURITY DEFINER
-- because they intentionally validate trusted membership and avoid RLS recursion.
alter function public.can_access_certificate(text) security invoker;
alter function public.can_manage_assignments() security invoker;
alter function public.can_manage_users() security invoker;

-- can_manage_courses previously depended on the SECURITY DEFINER is_staff helper.
-- Derive the trusted role from the JWT only after is_aula_active() verifies that
-- auth.users metadata and the Aula profile are active and synchronized.
create or replace function public.can_manage_courses()
returns boolean
language sql
stable
security invoker
set search_path to 'public','pg_temp'
as $function$
  select public.is_aula_active()
    and public.normalize_aula_ei_role(
      auth.jwt()->'app_metadata'->>'aula_ei_role'
    ) in ('creador_contenido','revisor','admin','super_admin');
$function$;

-- is_enrolled is a read-only authorization helper. RLS on enrollments already
-- permits the current learner or assignment administrators.
alter function public.is_enrolled(uuid,uuid) security invoker;

-- 3. Internal-only helpers are not PostgREST endpoints anymore.
-- They remain callable by owner/service-side SECURITY DEFINER routines.
revoke execute on function public.admin_sync_user_training(uuid) from anon, authenticated;
revoke execute on function public.can_take_exam(uuid,uuid) from anon, authenticated;
revoke execute on function public.can_delete_critical_content() from anon, authenticated;
revoke execute on function public.is_staff() from anon, authenticated;

-- Keep explicit API grants for the wrappers still used by RLS.
grant execute on function public.can_access_certificate(text) to authenticated;
grant execute on function public.can_manage_assignments() to authenticated;
grant execute on function public.can_manage_courses() to authenticated;
grant execute on function public.can_manage_users() to authenticated;
grant execute on function public.is_enrolled(uuid,uuid) to authenticated;

comment on function public.admin_sync_user_training(uuid)
  is 'Aula EI internal helper. Not exposed to anon/authenticated; called by admin_set_user_job_position.';
comment on function public.can_take_exam(uuid,uuid)
  is 'Aula EI internal exam authorization helper. Not exposed directly through PostgREST.';
comment on function public.can_delete_critical_content()
  is 'Deprecated direct helper retained for compatibility; no anon/authenticated EXECUTE grant.';
comment on function public.is_staff()
  is 'Internal trusted-role primitive retained for compatibility; no anon/authenticated EXECUTE grant.';
