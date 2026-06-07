-- Aula EI · Parche fenomenal
-- Permisos finales: Admin crea/edita capacitaciones y asigna; Super Admin elimina y cambia roles críticos.
-- Ejecutar en Supabase > SQL Editor > New query > Run.

create extension if not exists pgcrypto;

-- 1) Auditoría segura, para evitar errores si la función no existe.
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.write_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- 2) Roles finales.
do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
  end loop;
end $$;

update public.profiles set role = 'worker' where role in ('learner','content_creator','reviewer');
update public.profiles set role = 'visitor' where role is null;

alter table public.profiles alter column role set default 'visitor';

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('visitor','worker','admin','super_admin'));

-- 3) Perfil automático. Permite visitantes externos si se crean desde la Edge Function.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id,email,full_name,role)
  values(
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'managed_role','visitor')
  )
  on conflict(id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name,''), excluded.full_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles(id,email,full_name,role)
select id, lower(email), coalesce(raw_user_meta_data->>'full_name',''), 'visitor'
from auth.users
on conflict(id) do nothing;

-- 4) Funciones de permisos.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'));
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;

create or replace function public.is_enrolled(p_course_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.enrollments where course_id = p_course_id and user_id = p_user_id);
$$;

create or replace function public.can_manage_courses()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin();
$$;

create or replace function public.can_delete_critical_content()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin();
$$;

-- Solo Super Admin puede cambiar roles existentes. La service_role también puede hacerlo por Edge Function.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role
     and not (
       public.is_super_admin()
       or current_user in ('postgres','supabase_admin','service_role')
     ) then
    raise exception 'Solo un Super Admin puede cambiar roles.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
before update on public.profiles
for each row
execute function public.prevent_role_escalation();

create or replace function public.set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Acceso denegado. Solo el Super Admin puede cambiar roles.';
  end if;

  if p_role not in ('visitor','worker','admin','super_admin') then
    raise exception 'Rol inválido.';
  end if;

  update public.profiles set role = p_role, updated_at = now() where id = p_user_id;
  perform public.write_audit_log('set_role','profile',p_user_id::text,jsonb_build_object('role',p_role));
end;
$$;

-- 5) RLS.
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_phases enable row level security;
alter table public.content_blocks enable row level security;
alter table public.enrollments enable row level security;
alter table public.block_progress enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.certificates enable row level security;
alter table public.audit_logs enable row level security;

-- 6) Limpiar políticas anteriores.
drop policy if exists profiles_self_select on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_admin_select on public.profiles;

drop policy if exists courses_admin_all on public.courses;
drop policy if exists courses_super_admin_all on public.courses;
drop policy if exists courses_admin_select on public.courses;
drop policy if exists courses_learner_select on public.courses;
drop policy if exists courses_admin_insert on public.courses;
drop policy if exists courses_admin_update on public.courses;
drop policy if exists courses_super_admin_delete on public.courses;

drop policy if exists phases_admin_all on public.course_phases;
drop policy if exists phases_super_admin_all on public.course_phases;
drop policy if exists phases_learner_select on public.course_phases;
drop policy if exists phases_admin_select on public.course_phases;
drop policy if exists phases_admin_insert on public.course_phases;
drop policy if exists phases_admin_update on public.course_phases;
drop policy if exists phases_super_admin_delete on public.course_phases;

drop policy if exists blocks_admin_all on public.content_blocks;
drop policy if exists blocks_super_admin_all on public.content_blocks;
drop policy if exists blocks_learner_select on public.content_blocks;
drop policy if exists blocks_admin_select on public.content_blocks;
drop policy if exists blocks_admin_insert on public.content_blocks;
drop policy if exists blocks_admin_update on public.content_blocks;
drop policy if exists blocks_super_admin_delete on public.content_blocks;

drop policy if exists questions_admin_all on public.questions;
drop policy if exists questions_super_admin_all on public.questions;
drop policy if exists questions_admin_select on public.questions;
drop policy if exists questions_admin_insert on public.questions;
drop policy if exists questions_admin_update on public.questions;
drop policy if exists questions_super_admin_delete on public.questions;

drop policy if exists options_admin_all on public.question_options;
drop policy if exists options_super_admin_all on public.question_options;
drop policy if exists options_admin_select on public.question_options;
drop policy if exists options_admin_insert on public.question_options;
drop policy if exists options_admin_update on public.question_options;
drop policy if exists options_super_admin_delete on public.question_options;

drop policy if exists enrollments_admin_all on public.enrollments;
drop policy if exists enrollments_self_select on public.enrollments;
drop policy if exists progress_admin_select on public.block_progress;
drop policy if exists progress_self_select on public.block_progress;
drop policy if exists attempts_admin_select on public.exam_attempts;
drop policy if exists attempts_self_select on public.exam_attempts;
drop policy if exists certificates_admin_all on public.certificates;
drop policy if exists certificates_self_select on public.certificates;
drop policy if exists audit_admin_select on public.audit_logs;

-- 7) Policies finales.
create policy profiles_self_select on public.profiles
for select to authenticated
using(id = auth.uid() or public.is_admin());

create policy profiles_self_update on public.profiles
for update to authenticated
using(id = auth.uid())
with check(id = auth.uid());

create policy courses_admin_select on public.courses
for select to authenticated
using(public.is_admin() or (status = 'published' and public.is_enrolled(id)));

create policy courses_admin_insert on public.courses
for insert to authenticated
with check(public.is_admin());

create policy courses_admin_update on public.courses
for update to authenticated
using(public.is_admin())
with check(public.is_admin());

create policy courses_super_admin_delete on public.courses
for delete to authenticated
using(public.is_super_admin());

create policy phases_admin_select on public.course_phases
for select to authenticated
using(public.is_admin() or exists(select 1 from public.courses c where c.id = course_id and c.status = 'published' and public.is_enrolled(c.id)));

create policy phases_admin_insert on public.course_phases
for insert to authenticated
with check(public.is_admin());

create policy phases_admin_update on public.course_phases
for update to authenticated
using(public.is_admin())
with check(public.is_admin());

create policy phases_super_admin_delete on public.course_phases
for delete to authenticated
using(public.is_super_admin());

create policy blocks_admin_select on public.content_blocks
for select to authenticated
using(public.is_admin() or (status = 'published' and exists(select 1 from public.course_phases p join public.courses c on c.id = p.course_id where p.id = phase_id and c.status = 'published' and public.is_enrolled(c.id))));

create policy blocks_admin_insert on public.content_blocks
for insert to authenticated
with check(public.is_admin());

create policy blocks_admin_update on public.content_blocks
for update to authenticated
using(public.is_admin())
with check(public.is_admin());

create policy blocks_super_admin_delete on public.content_blocks
for delete to authenticated
using(public.is_super_admin());

create policy questions_admin_select on public.questions
for select to authenticated
using(public.is_admin() or exists(select 1 from public.courses c where c.id = course_id and c.status = 'published' and public.is_enrolled(c.id)));

create policy questions_admin_insert on public.questions
for insert to authenticated
with check(public.is_admin());

create policy questions_admin_update on public.questions
for update to authenticated
using(public.is_admin())
with check(public.is_admin());

create policy questions_super_admin_delete on public.questions
for delete to authenticated
using(public.is_super_admin());

create policy options_admin_select on public.question_options
for select to authenticated
using(public.is_admin() or exists(select 1 from public.questions q join public.courses c on c.id = q.course_id where q.id = question_id and c.status = 'published' and public.is_enrolled(c.id)));

create policy options_admin_insert on public.question_options
for insert to authenticated
with check(public.is_admin());

create policy options_admin_update on public.question_options
for update to authenticated
using(public.is_admin())
with check(public.is_admin());

create policy options_super_admin_delete on public.question_options
for delete to authenticated
using(public.is_super_admin());

create policy enrollments_admin_all on public.enrollments
for all to authenticated
using(public.is_admin())
with check(public.is_admin());

create policy enrollments_self_select on public.enrollments
for select to authenticated
using(user_id = auth.uid());

create policy progress_admin_select on public.block_progress
for select to authenticated
using(public.is_admin());

create policy progress_self_select on public.block_progress
for select to authenticated
using(user_id = auth.uid());

create policy attempts_admin_select on public.exam_attempts
for select to authenticated
using(public.is_admin());

create policy attempts_self_select on public.exam_attempts
for select to authenticated
using(user_id = auth.uid());

create policy certificates_admin_all on public.certificates
for all to authenticated
using(public.is_admin())
with check(public.is_admin());

create policy certificates_self_select on public.certificates
for select to authenticated
using(user_id = auth.uid());

create policy audit_admin_select on public.audit_logs
for select to authenticated
using(public.is_admin());

-- 8) Storage.
insert into storage.buckets(id,name,public,file_size_limit)
values('course-assets','course-assets',false,314572800)
on conflict(id) do update set public = false, file_size_limit = 314572800;

drop policy if exists course_assets_admin_insert on storage.objects;
drop policy if exists course_assets_admin_update on storage.objects;
drop policy if exists course_assets_admin_delete on storage.objects;
drop policy if exists course_assets_authorized_select on storage.objects;

create policy course_assets_admin_insert
on storage.objects
for insert to authenticated
with check(bucket_id = 'course-assets' and public.is_admin());

create policy course_assets_admin_update
on storage.objects
for update to authenticated
using(bucket_id = 'course-assets' and public.is_admin())
with check(bucket_id = 'course-assets' and public.is_admin());

create policy course_assets_admin_delete
on storage.objects
for delete to authenticated
using(bucket_id = 'course-assets' and public.is_super_admin());

create policy course_assets_authorized_select
on storage.objects
for select to authenticated
using(
  bucket_id = 'course-assets'
  and (
    public.is_admin()
    or exists(
      select 1
      from public.enrollments e
      join public.courses c on c.id = e.course_id
      where e.user_id = auth.uid()
        and c.status = 'published'
        and e.course_id::text = (storage.foldername(name))[1]
    )
  )
);

-- 9) Grants.
grant execute on function public.write_audit_log(text,text,text,jsonb) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_enrolled(uuid,uuid) to authenticated;
grant execute on function public.can_manage_courses() to authenticated;
grant execute on function public.can_delete_critical_content() to authenticated;
grant execute on function public.set_user_role(uuid,text) to authenticated;

-- 10) Confirmar Super Admin principal.
update public.profiles
set role = 'super_admin', updated_at = now()
where lower(email) = lower('j.perez@ei.com.co');
