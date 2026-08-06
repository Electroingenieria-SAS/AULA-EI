-- ============================================================
-- AULA EI · SQL COMPLETO CON ROLES EN ESPAÑOL
-- Roles oficiales:
-- colaborador, revisor, admin, super_admin, creador_contenido
-- Etiquetas visibles:
-- Colaborador, Revisor, Admin, Super Admin, Creador de contenido
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- 1. NORMALIZADOR DE ROLES
-- ============================================================

create or replace function public.normalize_aula_ei_role(p_role text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(p_role, '')) in ('visitor', 'visitante', 'worker', 'trabajador', 'colaborador', 'learner', 'estudiante', 'usuario') then 'colaborador'
    when lower(coalesce(p_role, '')) in ('content_creator', 'creador', 'creador_contenido', 'creador de contenido') then 'creador_contenido'
    when lower(coalesce(p_role, '')) in ('reviewer', 'revisor') then 'revisor'
    when lower(coalesce(p_role, '')) in ('admin', 'administrador') then 'admin'
    when lower(coalesce(p_role, '')) in ('super_admin', 'superadmin', 'super admin') then 'super_admin'
    else 'colaborador'
  end;
$$;

-- ============================================================
-- 2. TABLA PROFILES
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'colaborador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profiles alter column role set default 'colaborador';

-- Eliminar checks viejos sobre role.
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint if exists %I', r.conname);
  end loop;
end;
$$;

-- Normalizar roles existentes.
update public.profiles
set
  role = public.normalize_aula_ei_role(role),
  updated_at = now();

alter table public.profiles alter column role set not null;

alter table public.profiles
add constraint profiles_role_check
check (
  role in (
    'colaborador',
    'creador_contenido',
    'revisor',
    'admin',
    'super_admin'
  )
);

-- ============================================================
-- 3. UPDATED_AT
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- ============================================================
-- 4. SINCRONIZAR AUTH.USERS → PROFILES
-- ============================================================

insert into public.profiles (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
)
select
  u.id,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data->>'full_name', ''),
    split_part(coalesce(u.email, ''), '@', 1),
    'Colaborador EI'
  ),
  public.normalize_aula_ei_role(
    coalesce(
      u.raw_user_meta_data->>'managed_role',
      u.raw_app_meta_data->>'aula_ei_role',
      'colaborador'
    )
  ),
  now(),
  now()
from auth.users u
on conflict (id) do update
set
  email = coalesce(excluded.email, public.profiles.email),
  full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
  role = public.normalize_aula_ei_role(public.profiles.role),
  updated_at = now();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(coalesce(new.email, ''), '@', 1),
      'Colaborador EI'
    ),
    public.normalize_aula_ei_role(
      coalesce(
        new.raw_user_meta_data->>'managed_role',
        new.raw_app_meta_data->>'aula_ei_role',
        'colaborador'
      )
    ),
    now(),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    role = public.normalize_aula_ei_role(coalesce(public.profiles.role, excluded.role)),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert or update of email on auth.users
for each row
execute function public.handle_new_user();

-- ============================================================
-- 5. FUNCIONES DE PERMISOS
-- ============================================================

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
  );
$$;

create or replace function public.can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in (
        'creador_contenido',
        'revisor',
        'admin',
        'super_admin'
      )
  );
$$;

create or replace function public.set_user_role(
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_target_role text;
  v_new_role text;
begin
  v_new_role := public.normalize_aula_ei_role(p_role);

  select role
  into v_actor_role
  from public.profiles
  where id = auth.uid();

  if v_actor_role not in ('admin', 'super_admin') then
    raise exception 'Acceso denegado. Solo Admin o Super Admin pueden cambiar roles.';
  end if;

  select role
  into v_target_role
  from public.profiles
  where id = p_user_id;

  if v_target_role is null then
    raise exception 'Usuario no encontrado en profiles.';
  end if;

  if v_actor_role = 'admin'
     and v_new_role in ('admin', 'super_admin') then
    raise exception 'Un Admin no puede asignar roles Admin ni Super Admin.';
  end if;

  if v_actor_role = 'admin'
     and v_target_role in ('admin', 'super_admin') then
    raise exception 'Un Admin no puede modificar usuarios Admin ni Super Admin.';
  end if;

  update public.profiles
  set
    role = v_new_role,
    updated_at = now()
  where id = p_user_id;
end;
$$;

-- ============================================================
-- 6. RLS PROFILES
-- ============================================================

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own_or_manager on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own_basic on public.profiles;
drop policy if exists profiles_manager_update on public.profiles;

create policy profiles_select_own_or_manager
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.can_manage_users()
);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
);

create policy profiles_update_own_basic
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
);

create policy profiles_manager_update
on public.profiles
for update
to authenticated
using (
  public.can_manage_users()
)
with check (
  public.can_manage_users()
);

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;

grant execute on function public.normalize_aula_ei_role(text) to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_manage_users() to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- ============================================================
-- 7. AUDITORÍA OPCIONAL
-- ============================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index if not exists audit_logs_action_idx on public.audit_logs(action);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select_manager on public.audit_logs;

create policy audit_logs_select_manager
on public.audit_logs
for select
to authenticated
using (
  public.can_manage_users()
);

grant select on public.audit_logs to authenticated;

-- ============================================================
-- 8. REPARACIÓN DE MATRÍCULAS Y CURSOS, SI EXISTEN
-- ============================================================

do $$
begin
  if to_regclass('public.enrollments') is not null then
    execute '
      delete from public.enrollments e
      where not exists (
        select 1
        from public.profiles p
        where p.id = e.user_id
      )
    ';
  end if;

  if to_regclass('public.enrollments') is not null
     and to_regclass('public.courses') is not null then
    execute '
      delete from public.enrollments e
      where not exists (
        select 1
        from public.courses c
        where c.id = e.course_id
      )
    ';
  end if;

  if to_regclass('public.enrollments') is not null
     and to_regclass('public.courses') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = ''public''
         and table_name = ''courses''
         and column_name = ''status''
     ) then
    execute '
      update public.courses c
      set status = ''published''
      where c.status <> ''published''
        and exists (
          select 1
          from public.enrollments e
          where e.course_id = c.id
        )
    ';
  end if;
end;
$$;

-- ============================================================
-- 9. SUPER ADMIN PRINCIPAL
-- Ajusta o agrega correos reales aquí.
-- ============================================================

update public.profiles
set
  full_name = coalesce(nullif(full_name, ''), 'Juan Esteban Pérez'),
  role = 'super_admin',
  updated_at = now()
where lower(email) in (
  lower('j.perez@ei.com.co'),
  lower('juanespereztobon.1204@gmail.com')
);

commit;

-- ============================================================
-- 10. DIAGNÓSTICO FINAL
-- ============================================================

select
  p.id,
  p.email,
  p.full_name,
  case p.role
    when 'colaborador' then 'Colaborador'
    when 'creador_contenido' then 'Creador de contenido'
    when 'revisor' then 'Revisor'
    when 'admin' then 'Admin'
    when 'super_admin' then 'Super Admin'
    else p.role
  end as rol_visible,
  p.role as rol_interno,
  p.created_at,
  p.updated_at
from public.profiles p
order by
  case p.role
    when 'super_admin' then 1
    when 'admin' then 2
    when 'revisor' then 3
    when 'creador_contenido' then 4
    else 5
  end,
  p.full_name nulls last,
  p.email;
