-- Aula EI | 2026-11-23 | Read-only audit matrix. Safe to run in production.
-- Verify role grants and bounded SECURITY DEFINER RPCs; no application data returned.
select
  p.proname as rpc,
  pg_get_function_identity_arguments(p.oid) as signature,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_may_execute,
  has_function_privilege('PUBLIC',p.oid,'EXECUTE') as public_may_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_may_execute,
  p.proconfig::text like '%search_path%' as has_explicit_search_path,
  pg_get_functiondef(p.oid) ~* '\\mEXECUTE\\M' as uses_dynamic_sql,
  case
    when p.proname='erp_x_paco_snapshot' then 'Delegates actor verification to erp_supply.require_profile'
    when pg_get_functiondef(p.oid) ~* '(auth[.]uid|is_admin|is_super_admin|is_aula_active|can_manage_|creator_assignment_allowed)'
      then 'Authorization reference present (confirm branch-by-branch before changing grants)'
    else 'Manual review required'
  end as access_review
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef
  and has_function_privilege('authenticated',p.oid,'EXECUTE')
order by p.proname, pg_get_function_identity_arguments(p.oid);

-- Expected after migration: one SELECT / INSERT / UPDATE permissive policy each.
select cmd, count(*) as permissive_policy_count, string_agg(policyname,', ' order by policyname) as names
from pg_policies
where schemaname='public' and tablename='enrollments' and permissive='PERMISSIVE'
group by cmd order by cmd;

-- No public table may be accidentally exposed without RLS.
select c.relname
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;

-- Read-only unused-index cost (not a proposal to DROP).
select s.relname as table_name, s.indexrelname as index_name, s.idx_scan,
  pg_size_pretty(pg_relation_size(s.indexrelid)) as size,
  i.indisunique, i.indisprimary
from pg_stat_user_indexes s join pg_index i on i.indexrelid=s.indexrelid
where s.schemaname='public' and s.idx_scan=0
  and not i.indisunique and not i.indisprimary
order by pg_relation_size(s.indexrelid) desc, s.relname, s.indexrelname;
