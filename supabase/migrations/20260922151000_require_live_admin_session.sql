-- Security v3.1: administrative tokens must map to a live Supabase session
-- and the account must retain at least one verified MFA factor.

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
          and exists (
            select 1 from auth.sessions s
            where s.id::text = auth.jwt()->>'session_id'
              and s.user_id=auth.uid()
          )
          and exists (
            select 1 from auth.mfa_factors f
            where f.user_id=auth.uid()
              and f.status='verified'
          )
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
set search_path to 'public','auth','pg_temp'
as $function$
  select public.aula_is_aal2()
    and public.is_aula_active()
    and exists (
      select 1 from auth.sessions s
      where s.id::text = auth.jwt()->>'session_id'
        and s.user_id=auth.uid()
    )
    and exists (
      select 1 from auth.mfa_factors f
      where f.user_id=auth.uid()
        and f.status='verified'
    )
    and exists (
      select 1 from public.profiles p
      where p.id=auth.uid()
        and public.normalize_aula_ei_role(p.role) in ('admin','super_admin')
    );
$function$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public','auth','pg_temp'
as $function$
  select public.aula_is_aal2()
    and public.is_aula_active()
    and exists (
      select 1 from auth.sessions s
      where s.id::text = auth.jwt()->>'session_id'
        and s.user_id=auth.uid()
    )
    and exists (
      select 1 from auth.mfa_factors f
      where f.user_id=auth.uid()
        and f.status='verified'
    )
    and exists (
      select 1 from public.profiles p
      where p.id=auth.uid()
        and public.normalize_aula_ei_role(p.role)='super_admin'
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
      or public.is_admin()
    );
$function$;

create or replace function public.validate_aula_admin_session(
  p_user_id uuid,
  p_session_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public','auth','pg_temp'
as $function$
  select p_user_id is not null
    and p_session_id is not null
    and exists (
      select 1
      from public.profiles p
      join auth.users u on u.id=p.id
      join auth.sessions s on s.user_id=p.id
      where p.id=p_user_id
        and s.id=p_session_id
        and p.is_active=true
        and coalesce(u.raw_app_meta_data->>'aula_ei_active','false')='true'
        and public.normalize_aula_ei_role(p.role)=public.normalize_aula_ei_role(u.raw_app_meta_data->>'aula_ei_role')
        and public.normalize_aula_ei_role(p.role) in ('admin','super_admin')
        and s.aal::text='aal2'
        and exists (
          select 1 from auth.mfa_factors f
          where f.user_id=p.id and f.status='verified'
        )
    );
$function$;

revoke all on function public.validate_aula_admin_session(uuid,uuid) from public, anon, authenticated;
grant execute on function public.validate_aula_admin_session(uuid,uuid) to service_role;
