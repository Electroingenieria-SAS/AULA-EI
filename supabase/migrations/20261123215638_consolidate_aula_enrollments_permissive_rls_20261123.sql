-- Applied on the connected Aula EI production database as migration 20261123215638.
-- The former permissive policies were OR-combined by PostgreSQL.
-- This migration folds creator rules into the existing policy names WITHOUT changing permissions.
-- No enrollments or learner history data are modified.
do $guard$
begin
  if (select count(*) from pg_policies where schemaname='public'
      and tablename='enrollments'
      and policyname in ('enrollments_select_policy','creator_enrollments_read',
       'enrollments_admin_insert','creator_enrollments_assign',
       'enrollments_admin_update','creator_enrollments_edit')) <> 6 then
    raise exception 'enrollments RLS policy precondition failed: expected six original policies';
  end if;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname='enrollments' and c.relrowsecurity) then
    raise exception 'enrollments RLS must be enabled';
  end if;
end
$guard$;

alter policy enrollments_select_policy on public.enrollments
  using (
    ((user_id = (select auth.uid())) and (select public.is_aula_active()))
    or (select public.can_manage_assignments())
    or public.creator_assignment_allowed(course_id)
  );

alter policy enrollments_admin_insert on public.enrollments
  with check (
    (select public.can_manage_assignments())
    or (
      public.creator_assignment_target_allowed(course_id,user_id)
      and assigned_by = (select auth.uid())
      and status = 'assigned'::text
    )
  );

alter policy enrollments_admin_update on public.enrollments
  using (
    (select public.can_manage_assignments())
    or public.creator_assignment_allowed(course_id)
  )
  with check (
    (select public.can_manage_assignments())
    or public.creator_assignment_target_allowed(course_id,user_id)
  );

drop policy creator_enrollments_read on public.enrollments;
drop policy creator_enrollments_assign on public.enrollments;
drop policy creator_enrollments_edit on public.enrollments;
