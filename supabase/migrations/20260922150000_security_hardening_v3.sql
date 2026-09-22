-- Aula EI Security v3
-- Mandatory AAL2 for Admin/Super Admin, server-side rate limiting and security audit trail.

create or replace function public.aula_is_aal2()
returns boolean
language sql
stable
security invoker
set search_path to 'public','pg_temp'
as $function$
  select coalesce(auth.jwt()->>'aal','aal1') = 'aal2';
$function$;

grant execute on function public.aula_is_aal2() to authenticated;
revoke execute on function public.aula_is_aal2() from anon;

create or replace function public.is_aula_active(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path to 'public','auth','pg_temp'
as $function$
  with caller as (
    select p.id,
           p.is_active,
           public.normalize_aula_ei_role(p.role) as profile_role,
           public.normalize_aula_ei_role(u.raw_app_meta_data->>'aula_ei_role') as app_role,
           coalesce(u.raw_app_meta_data->>'aula_ei_active','false') = 'true' as app_active
    from public.profiles p
    join auth.users u on u.id=p.id
    where p.id=auth.uid()
  )
  select p_user_id is not null
    and (
      p_user_id=auth.uid()
      or exists (
        select 1 from caller c
        where c.is_active=true
          and c.app_active=true
          and c.profile_role=c.app_role
          and c.profile_role in ('admin','super_admin')
          and public.aula_is_aal2()
      )
    )
    and exists (
      select 1
      from public.profiles p
      join auth.users u on u.id=p.id
      where p.id=p_user_id
        and p.is_active=true
        and coalesce(u.raw_app_meta_data->>'aula_ei_active','false')='true'
        and u.raw_app_meta_data ? 'aula_ei_role'
        and public.normalize_aula_ei_role(u.raw_app_meta_data->>'aula_ei_role')=public.normalize_aula_ei_role(p.role)
    );
$function$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $function$
  select public.aula_is_aal2()
    and public.is_aula_active()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and public.normalize_aula_ei_role(p.role) in ('admin','super_admin')
    );
$function$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $function$
  select public.aula_is_aal2()
    and public.is_aula_active()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and public.normalize_aula_ei_role(p.role) = 'super_admin'
    );
$function$;

create or replace function public.can_manage_courses()
returns boolean
language sql
stable
security invoker
set search_path to 'public','pg_temp'
as $function$
  select public.is_aula_active()
    and (
      public.normalize_aula_ei_role(auth.jwt()->'app_metadata'->>'aula_ei_role') in ('creador_contenido','revisor')
      or (
        public.normalize_aula_ei_role(auth.jwt()->'app_metadata'->>'aula_ei_role') in ('admin','super_admin')
        and public.aula_is_aal2()
      )
    );
$function$;

-- Atomic rate limiter for trusted server-side Edge Functions.
create table if not exists public.aula_security_rate_limits (
  scope text not null,
  actor_id uuid not null,
  bucket_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, actor_id)
);

alter table public.aula_security_rate_limits enable row level security;
revoke all on table public.aula_security_rate_limits from anon, authenticated;

drop policy if exists aula_security_rate_limits_deny_clients on public.aula_security_rate_limits;
create policy aula_security_rate_limits_deny_clients
on public.aula_security_rate_limits
as restrictive
for all
to authenticated
using (false)
with check (false);

create or replace function public.consume_aula_security_rate_limit(
  p_scope text,
  p_actor uuid,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_count integer;
  v_started timestamptz;
begin
  if p_scope is null or btrim(p_scope) = '' or p_actor is null
     or p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  insert into public.aula_security_rate_limits(scope,actor_id,bucket_started_at,request_count,updated_at)
  values(p_scope,p_actor,now(),1,now())
  on conflict(scope,actor_id) do update
    set request_count = case
          when public.aula_security_rate_limits.bucket_started_at <= now() - make_interval(secs=>p_window_seconds)
            then 1
          else public.aula_security_rate_limits.request_count + 1
        end,
        bucket_started_at = case
          when public.aula_security_rate_limits.bucket_started_at <= now() - make_interval(secs=>p_window_seconds)
            then now()
          else public.aula_security_rate_limits.bucket_started_at
        end,
        updated_at = now()
  returning request_count,bucket_started_at into v_count,v_started;

  delete from public.aula_security_rate_limits
  where updated_at < now() - interval '2 days';

  return v_count <= p_limit;
end;
$function$;

revoke all on function public.consume_aula_security_rate_limit(text,uuid,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_aula_security_rate_limit(text,uuid,integer,integer) to service_role;

-- Trigger-only audit function. It records metadata, never passwords, tokens or signature payloads.
create or replace function public.audit_aula_sensitive_mutation()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_row jsonb;
  v_id text;
  v_meta jsonb;
begin
  v_row := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_id := v_row->>'id';

  v_meta := jsonb_build_object(
    'table',tg_table_name,
    'operation',tg_op,
    'aal',coalesce(auth.jwt()->>'aal','unknown')
  );

  if tg_table_name='profiles' then
    v_meta := v_meta || jsonb_build_object(
      'role_before',case when tg_op='INSERT' then null else old.role end,
      'role_after',case when tg_op='DELETE' then null else new.role end,
      'active_before',case when tg_op='INSERT' then null else old.is_active end,
      'active_after',case when tg_op='DELETE' then null else new.is_active end,
      'job_position_before',case when tg_op='INSERT' then null else old.job_position_id end,
      'job_position_after',case when tg_op='DELETE' then null else new.job_position_id end,
      'supervisor_before',case when tg_op='INSERT' then null else old.supervisor_id end,
      'supervisor_after',case when tg_op='DELETE' then null else new.supervisor_id end
    );
  elsif tg_table_name='enrollments' then
    v_meta := v_meta || jsonb_build_object(
      'user_id',v_row->>'user_id',
      'course_id',v_row->>'course_id',
      'status',v_row->>'status'
    );
  elsif tg_table_name='courses' then
    v_meta := v_meta || jsonb_build_object(
      'title',v_row->>'title',
      'status',v_row->>'status'
    );
  elsif tg_table_name='certificates' then
    v_meta := v_meta || jsonb_build_object(
      'certificate_code',v_row->>'certificate_code',
      'user_id',v_row->>'user_id',
      'course_id',v_row->>'course_id'
    );
  elsif tg_table_name='certificate_signatures' then
    v_meta := v_meta || jsonb_build_object(
      'certificate_id',v_row->>'certificate_id',
      'signature_type',v_row->>'signature_type'
    );
  end if;

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'security_' || lower(tg_op),tg_table_name,v_id,v_meta);

  return case when tg_op='DELETE' then old else new end;
end;
$function$;

revoke all on function public.audit_aula_sensitive_mutation() from public, anon, authenticated;

drop trigger if exists audit_aula_profiles_security on public.profiles;
create trigger audit_aula_profiles_security
after insert or delete or update of role,is_active,job_position_id,supervisor_id
on public.profiles
for each row execute function public.audit_aula_sensitive_mutation();

drop trigger if exists audit_aula_enrollments_security on public.enrollments;
create trigger audit_aula_enrollments_security
after insert or delete or update of status,due_at,course_id,user_id
on public.enrollments
for each row execute function public.audit_aula_sensitive_mutation();

drop trigger if exists audit_aula_courses_security on public.courses;
create trigger audit_aula_courses_security
after insert or update or delete on public.courses
for each row execute function public.audit_aula_sensitive_mutation();

drop trigger if exists audit_aula_certificates_security on public.certificates;
create trigger audit_aula_certificates_security
after insert or update or delete on public.certificates
for each row execute function public.audit_aula_sensitive_mutation();

drop trigger if exists audit_aula_certificate_signatures_security on public.certificate_signatures;
create trigger audit_aula_certificate_signatures_security
after insert or update or delete on public.certificate_signatures
for each row execute function public.audit_aula_sensitive_mutation();
