-- Aula EI - Fix real de arranque Auth / Perfil
-- Crea una RPC rápida para cargar el perfil del usuario autenticado sin depender de una consulta RLS pesada desde el frontend.

create or replace function public.get_my_profile()
returns table (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  role text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    public.normalize_aula_ei_role(p.role) as role,
    p.created_at,
    p.updated_at
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_my_profile() to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'profiles'
      and indexname = 'idx_profiles_email_aula_ei'
  ) then
    create index idx_profiles_email_aula_ei on public.profiles (lower(email));
  end if;
end $$;
