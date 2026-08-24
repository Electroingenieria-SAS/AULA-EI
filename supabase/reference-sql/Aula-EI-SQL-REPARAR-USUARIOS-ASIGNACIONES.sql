-- ============================================================
-- AULA EI · REPARACIÓN USUARIOS CREADOS + ASIGNACIONES VISIBLES
-- Ejecutar en Supabase SQL Editor.
-- ============================================================

begin;

-- 1. Normalizar roles antiguos que pudieron quedar desde la función anterior.
update public.profiles
set
  role = case
    when lower(coalesce(role, '')) in ('visitor', 'visitante', 'worker', 'trabajador', 'colaborador', 'learner') then 'learner'
    when lower(coalesce(role, '')) in ('content_creator', 'creador', 'creador_contenido', 'creador de contenido') then 'content_creator'
    when lower(coalesce(role, '')) in ('reviewer', 'revisor') then 'reviewer'
    when lower(coalesce(role, '')) in ('admin', 'administrador') then 'admin'
    when lower(coalesce(role, '')) in ('super_admin', 'superadmin', 'super admin') then 'super_admin'
    else 'learner'
  end,
  updated_at = now();

-- 2. Crear perfiles faltantes para usuarios que existen en Authentication pero no en profiles.
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
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Colaborador EI'),
  case
    when lower(coalesce(u.raw_user_meta_data->>'managed_role', 'learner')) in ('visitor', 'visitante', 'worker', 'trabajador', 'colaborador', 'learner') then 'learner'
    when lower(coalesce(u.raw_user_meta_data->>'managed_role', 'learner')) in ('content_creator', 'creador', 'creador_contenido', 'creador de contenido') then 'content_creator'
    when lower(coalesce(u.raw_user_meta_data->>'managed_role', 'learner')) in ('reviewer', 'revisor') then 'reviewer'
    when lower(coalesce(u.raw_user_meta_data->>'managed_role', 'learner')) in ('admin', 'administrador') then 'admin'
    when lower(coalesce(u.raw_user_meta_data->>'managed_role', 'learner')) in ('super_admin', 'superadmin', 'super admin') then 'super_admin'
    else 'learner'
  end,
  now(),
  now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 3. Corregir nombres o correos vacíos.
update public.profiles p
set
  email = coalesce(nullif(p.email, ''), u.email),
  full_name = coalesce(nullif(p.full_name, ''), u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Colaborador EI'),
  updated_at = now()
from auth.users u
where u.id = p.id
  and (
    p.email is null
    or trim(p.email) = ''
    or p.full_name is null
    or trim(p.full_name) = ''
  );

-- 4. Eliminar matrículas huérfanas, si existieran.
delete from public.enrollments e
where not exists (
  select 1
  from public.profiles p
  where p.id = e.user_id
)
or not exists (
  select 1
  from public.courses c
  where c.id = e.course_id
);

-- 5. Publicar cursos que ya fueron asignados.
-- Motivo: si un curso asignado está en draft/archived, RLS devuelve course=null y el usuario no lo ve.
update public.courses c
set
  status = 'published',
  published_at = coalesce(c.published_at, now()),
  updated_at = now()
where c.status <> 'published'
  and exists (
    select 1
    from public.enrollments e
    where e.course_id = c.id
  );

-- 6. Asegurar Super Admin principal.
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

-- Diagnóstico final.
select
  p.id,
  p.email,
  p.full_name,
  p.role,
  count(e.id) as asignaciones
from public.profiles p
left join public.enrollments e on e.user_id = p.id
group by p.id, p.email, p.full_name, p.role
order by
  case p.role
    when 'super_admin' then 1
    when 'admin' then 2
    when 'reviewer' then 3
    when 'content_creator' then 4
    else 5
  end,
  p.full_name nulls last,
  p.email;
