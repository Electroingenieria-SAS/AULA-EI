-- Aula EI · Fase 8.5 · Auditoría de permisos, SOLO LECTURA.
-- Proyecto: ipoidimevokogptydbvt. No invocar RPC que modifiquen datos.
-- Ejecutar exclusivamente como consulta de auditoría. No modifica grants, RLS ni Auth.

-- 1. Superficie SECURITY DEFINER expuesta a authenticated.
with privileged_routines as (
  select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args,
    lower(pg_get_functiondef(p.oid)) as definition,
    exists(
      select 1 from aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) g
      where g.grantee=0 and g.privilege_type='EXECUTE'
    ) as execute_public
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef
    and has_function_privilege('authenticated',p.oid,'EXECUTE')
)
select count(*) as privileged_authenticated,
 count(*) filter(where has_function_privilege('anon',oid,'EXECUTE')) as accessible_to_anon,
 count(*) filter(where execute_public) as public_execute,
 count(*) filter(where definition not like '%set search_path%') as missing_search_path,
 count(*) filter(where definition like '%is_admin(%' or definition like '%is_super_admin(%' or
   definition like '%validate_aula_admin_session(%') as apparent_admin_checks,
 count(*) filter(where definition like '%auth.uid(%' or definition like '%is_aula_active(%' or
   definition like '%is_admin(%' or definition like '%is_super_admin(%') as apparent_identity_checks
from privileged_routines;

-- 2. Function-by-function list for review: boolean indicators are heuristics,
-- NOT proof of authorization. Do not grant or revoke based only on this query.
select p.proname as function_name,
 pg_get_function_identity_arguments(p.oid) as signature,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 position('is_admin(' in lower(pg_get_functiondef(p.oid)))>0 as admin_helper,
 position('is_super_admin(' in lower(pg_get_functiondef(p.oid)))>0 as super_admin_helper,
 position('auth.uid(' in lower(pg_get_functiondef(p.oid)))>0 as uses_auth_uid
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef
 and has_function_privilege('authenticated',p.oid,'EXECUTE')
order by p.proname;

-- 3. RLS tables with no policies. Verify both RLS and direct role GRANTs.
-- Some private tables are intentionally closed; do not create permissive policies.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
 has_table_privilege('anon',c.oid,'SELECT') as anon_select,
 has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p') and c.relrowsecurity
 and not exists(select 1 from pg_policy pol where pol.polrelid=c.oid)
order by c.relname;

-- 4. Policy and grants coverage of sensitive Aula EI data. Pure metadata.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
 count(pol.oid) as policy_count,
 has_table_privilege('anon',c.oid,'SELECT') as anon_select_grant,
 has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select_grant
from pg_class c join pg_namespace n on n.oid=c.relnamespace
left join pg_policy pol on pol.polrelid=c.oid
where n.nspname='public' and c.relname in
 ('profiles','courses','enrollments','content_blocks','certificates',
 'exam_attempts','learning_paths','training_notifications',
 'legal_acceptances','privacy_requests','audit_logs')
group by c.oid,c.relname,c.relrowsecurity
order by c.relname;
