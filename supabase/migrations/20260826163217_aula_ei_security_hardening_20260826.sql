\
-- Aula EI security hardening - 2026-08-26
-- Scope is limited to Aula EI objects inside the shared Supabase project.

revoke all privileges on table
  public.block_progress,
  public.content_blocks,
  public.course_phases,
  public.courses,
  public.enrollments,
  public.profiles,
  public.question_options,
  public.questions,
  public.certificates,
  public.certificate_signatures,
  public.exam_attempts,
  public.audit_logs
from anon;

revoke all privileges on table
  public.block_progress,
  public.content_blocks,
  public.course_phases,
  public.courses,
  public.enrollments,
  public.profiles,
  public.question_options,
  public.questions,
  public.certificates,
  public.certificate_signatures,
  public.exam_attempts,
  public.audit_logs
from authenticated;

grant select, insert, update on table public.block_progress to authenticated;
grant select, insert, update, delete on table public.content_blocks to authenticated;
grant select, insert, update, delete on table public.course_phases to authenticated;
grant select, insert, update, delete on table public.courses to authenticated;
grant select, insert, update, delete on table public.enrollments to authenticated;
grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.question_options to authenticated;
grant select, insert, update, delete on table public.questions to authenticated;

-- Exam integrity.
drop policy if exists questions_admin_select on public.questions;
drop policy if exists questions_select_policy on public.questions;
drop policy if exists questions_staff_select on public.questions;
create policy questions_staff_select
on public.questions
for select
to authenticated
using ((select public.is_admin()));

drop policy if exists options_admin_select on public.question_options;
drop policy if exists question_options_select_policy on public.question_options;
drop policy if exists question_options_staff_select on public.question_options;
create policy question_options_staff_select
on public.question_options
for select
to authenticated
using ((select public.is_admin()));

-- Profiles are read-only from the browser.
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_update_own_basic on public.profiles;
drop policy if exists profiles_manager_update on public.profiles;

-- Never trust user-editable metadata for authorization.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (
    id, email, full_name, role, created_at, updated_at
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
      coalesce(new.raw_app_meta_data->>'aula_ei_role', 'colaborador')
    ),
    now(),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    role = public.profiles.role,
    updated_at = now();

  return new;
end;
$$;

-- Signature authorization.
create or replace function public.save_certificate_signature(
  p_certificate_code text,
  p_signature_type text,
  p_signature_data text
)
returns table(
  participant_signature_data text,
  admin_signature_data text,
  participant_signed_at timestamptz,
  admin_signed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_type text := lower(trim(coalesce(p_signature_type, '')));
  v_user uuid := auth.uid();
  v_data text := coalesce(p_signature_data, '');
  v_owner uuid;
begin
  if v_user is null then
    raise exception 'Sesión requerida.';
  end if;

  select cert.user_id
  into v_owner
  from public.certificates cert
  where cert.certificate_code = p_certificate_code;

  if v_owner is null then
    raise exception 'Certificado no encontrado.';
  end if;

  if v_type not in ('participant', 'participante', 'admin', 'responsible', 'responsable') then
    raise exception 'Tipo de firma inválido.';
  end if;

  if v_type in ('participant', 'participante') and v_user <> v_owner then
    raise exception 'Solo el participante puede registrar su propia firma.';
  end if;

  if v_type in ('admin', 'responsible', 'responsable') and not public.can_manage_users() then
    raise exception 'Solo un Administrador o Super Administrador puede registrar la firma responsable.';
  end if;

  if length(v_data) < 30 then
    raise exception 'La firma está vacía o no es válida.';
  end if;

  if v_data !~ '^data:image/(png|jpeg|jpg|webp);base64,' then
    raise exception 'Formato de firma inválido. Usa PNG, JPG o WEBP.';
  end if;

  if length(v_data) > 1200000 then
    raise exception 'La firma es demasiado pesada. Usa una imagen más liviana.';
  end if;

  if v_type in ('participant', 'participante') then
    insert into public.certificate_signatures (
      certificate_code,
      participant_signature_data,
      participant_signed_by,
      participant_signed_at,
      created_at,
      updated_at
    )
    values (p_certificate_code, v_data, v_user, now(), now(), now())
    on conflict (certificate_code)
    do update set
      participant_signature_data = excluded.participant_signature_data,
      participant_signed_by = excluded.participant_signed_by,
      participant_signed_at = excluded.participant_signed_at,
      updated_at = now();
  else
    insert into public.certificate_signatures (
      certificate_code,
      admin_signature_data,
      admin_signed_by,
      admin_signed_at,
      created_at,
      updated_at
    )
    values (p_certificate_code, v_data, v_user, now(), now(), now())
    on conflict (certificate_code)
    do update set
      admin_signature_data = excluded.admin_signature_data,
      admin_signed_by = excluded.admin_signed_by,
      admin_signed_at = excluded.admin_signed_at,
      updated_at = now();
  end if;

  return query
  select cs.participant_signature_data, cs.admin_signature_data,
         cs.participant_signed_at, cs.admin_signed_at
  from public.certificate_signatures cs
  where cs.certificate_code = p_certificate_code;
end;
$$;

create or replace function public.clear_certificate_signature(
  p_certificate_code text,
  p_signature_type text
)
returns table(
  participant_signature_data text,
  admin_signature_data text,
  participant_signed_at timestamptz,
  admin_signed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_type text := lower(trim(coalesce(p_signature_type, '')));
  v_user uuid := auth.uid();
  v_owner uuid;
begin
  if v_user is null then
    raise exception 'Sesión requerida.';
  end if;

  select cert.user_id into v_owner
  from public.certificates cert
  where cert.certificate_code = p_certificate_code;

  if v_owner is null then
    raise exception 'Certificado no encontrado.';
  end if;

  if v_type not in ('participant', 'participante', 'admin', 'responsible', 'responsable') then
    raise exception 'Tipo de firma inválido.';
  end if;

  if v_type in ('participant', 'participante') and v_user <> v_owner then
    raise exception 'Solo el participante puede retirar su propia firma.';
  end if;

  if v_type in ('admin', 'responsible', 'responsable') and not public.can_manage_users() then
    raise exception 'Solo un Administrador o Super Administrador puede retirar la firma responsable.';
  end if;

  insert into public.certificate_signatures (certificate_code, created_at, updated_at)
  values (p_certificate_code, now(), now())
  on conflict (certificate_code) do nothing;

  if v_type in ('participant', 'participante') then
    update public.certificate_signatures
    set participant_signature_data = null,
        participant_signed_by = null,
        participant_signed_at = null,
        updated_at = now()
    where certificate_code = p_certificate_code;
  else
    update public.certificate_signatures
    set admin_signature_data = null,
        admin_signed_by = null,
        admin_signed_at = null,
        updated_at = now()
    where certificate_code = p_certificate_code;
  end if;

  return query
  select cs.participant_signature_data, cs.admin_signature_data,
         cs.participant_signed_at, cs.admin_signed_at
  from public.certificate_signatures cs
  where cs.certificate_code = p_certificate_code;
end;
$$;

-- Function execution allowlist.
revoke execute on function public.admin_certificate_ranking() from public, anon;
revoke execute on function public.admin_completed_without_certificate() from public, anon;
revoke execute on function public.admin_generate_certificate(uuid, uuid) from public, anon;
revoke execute on function public.can_access_certificate(text) from public, anon;
revoke execute on function public.can_manage_users() from public, anon;
revoke execute on function public.can_take_exam(uuid, uuid) from public, anon;
revoke execute on function public.clear_certificate_signature(text, text) from public, anon;
revoke execute on function public.get_certificate_by_code(text) from public, anon;
revoke execute on function public.get_certificate_signatures(text) from public, anon;
revoke execute on function public.get_exam_questions(uuid) from public, anon;
revoke execute on function public.get_my_certificates() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_enrolled(uuid, uuid) from public, anon;
revoke execute on function public.is_super_admin() from public, anon;
revoke execute on function public.next_certificate_code() from public, anon, authenticated;
revoke execute on function public.save_certificate_signature(text, text, text) from public, anon;
revoke execute on function public.set_user_role(uuid, text) from public, anon;
revoke execute on function public.submit_exam(uuid, jsonb) from public, anon;
revoke execute on function public.write_audit_log(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.prevent_role_escalation() from public, anon, authenticated;
revoke execute on function public.normalize_profile_role_trigger() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.admin_certificate_ranking() to authenticated;
grant execute on function public.admin_completed_without_certificate() to authenticated;
grant execute on function public.admin_generate_certificate(uuid, uuid) to authenticated;
grant execute on function public.can_access_certificate(text) to authenticated;
grant execute on function public.can_manage_users() to authenticated;
grant execute on function public.can_take_exam(uuid, uuid) to authenticated;
grant execute on function public.clear_certificate_signature(text, text) to authenticated;
grant execute on function public.get_certificate_by_code(text) to authenticated;
grant execute on function public.get_certificate_signatures(text) to authenticated;
grant execute on function public.get_exam_questions(uuid) to authenticated;
grant execute on function public.get_my_certificates() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_enrolled(uuid, uuid) to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.save_certificate_signature(text, text, text) to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;
grant execute on function public.submit_exam(uuid, jsonb) to authenticated;
grant execute on function public.write_audit_log(text, text, text, jsonb) to service_role;

-- Stable search_path.
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.normalize_profile_role_trigger() set search_path = public, pg_temp;
alter function public.normalize_aula_ei_role(text) set search_path = public, pg_temp;
alter function public.prevent_role_escalation() set search_path = public, pg_temp;
alter function public.is_admin() set search_path = public, pg_temp;
alter function public.is_super_admin() set search_path = public, pg_temp;
alter function public.is_enrolled(uuid, uuid) set search_path = public, pg_temp;
alter function public.can_manage_users() set search_path = public, pg_temp;
alter function public.can_access_certificate(text) set search_path = public, pg_temp;
alter function public.can_take_exam(uuid, uuid) set search_path = public, pg_temp;
alter function public.get_exam_questions(uuid) set search_path = public, pg_temp;
alter function public.submit_exam(uuid, jsonb) set search_path = public, pg_temp;
alter function public.get_certificate_by_code(text) set search_path = public, pg_temp;
alter function public.get_certificate_signatures(text) set search_path = public, pg_temp;
alter function public.save_certificate_signature(text, text, text) set search_path = public, pg_temp;
alter function public.clear_certificate_signature(text, text) set search_path = public, pg_temp;
alter function public.admin_certificate_ranking() set search_path = public, pg_temp;
alter function public.admin_completed_without_certificate() set search_path = public, pg_temp;
alter function public.admin_generate_certificate(uuid, uuid) set search_path = public, pg_temp;
alter function public.next_certificate_code() set search_path = public, pg_temp;
alter function public.write_audit_log(text, text, text, jsonb) set search_path = public, pg_temp;

-- Private bucket, smaller blast radius and MIME allowlist.
update storage.buckets
set public = false,
    file_size_limit = 104857600,
    allowed_mime_types = array[
      'application/pdf','image/png','image/jpeg','image/webp',
      'audio/mpeg','audio/mp4','video/mp4',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint'
    ]::text[]
where id = 'course-assets';
