-- ============================================================
-- AULA EI · FIRMAS PERSISTENTES EN SUPABASE
-- Corrige firmas que desaparecen por guardarse en localStorage.
-- NO borra certificados ni usuarios.
-- ============================================================

begin;

-- ============================================================
-- 1. TABLA CENTRAL DE FIRMAS POR CERTIFICADO
-- ============================================================

create table if not exists public.certificate_signatures (
  certificate_code text primary key references public.certificates(certificate_code) on delete cascade,
  participant_signature_data text,
  admin_signature_data text,
  participant_signed_by uuid references public.profiles(id) on delete set null,
  admin_signed_by uuid references public.profiles(id) on delete set null,
  participant_signed_at timestamptz,
  admin_signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists certificate_signatures_participant_signed_by_idx
on public.certificate_signatures(participant_signed_by);

create index if not exists certificate_signatures_admin_signed_by_idx
on public.certificate_signatures(admin_signed_by);

-- ============================================================
-- 2. UPDATED_AT
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

drop trigger if exists certificate_signatures_updated_at on public.certificate_signatures;

create trigger certificate_signatures_updated_at
before update on public.certificate_signatures
for each row
execute function public.set_updated_at();

-- ============================================================
-- 3. FUNCIÓN DE ACCESO A CERTIFICADO
-- Usuario dueño del certificado o usuario administrativo.
-- ============================================================

create or replace function public.can_access_certificate(
  p_certificate_code text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.certificates cert
    where cert.certificate_code = p_certificate_code
      and (
        cert.user_id = auth.uid()
        or public.is_admin()
      )
  );
$$;

-- ============================================================
-- 4. OBTENER FIRMAS GUARDADAS
-- ============================================================

create or replace function public.get_certificate_signatures(
  p_certificate_code text
)
returns table (
  participant_signature_data text,
  admin_signature_data text,
  participant_signed_at timestamptz,
  admin_signed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sesión requerida.';
  end if;

  if not public.can_access_certificate(p_certificate_code) then
    raise exception 'No tienes permiso para ver las firmas de este certificado.';
  end if;

  return query
  select
    cs.participant_signature_data,
    cs.admin_signature_data,
    cs.participant_signed_at,
    cs.admin_signed_at
  from public.certificates cert
  left join public.certificate_signatures cs
    on cs.certificate_code = cert.certificate_code
  where cert.certificate_code = p_certificate_code
  limit 1;
end;
$$;

-- ============================================================
-- 5. GUARDAR FIRMA PERMANENTE
-- p_signature_type acepta:
-- participant, participante, admin, responsible, responsable
-- ============================================================

create or replace function public.save_certificate_signature(
  p_certificate_code text,
  p_signature_type text,
  p_signature_data text
)
returns table (
  participant_signature_data text,
  admin_signature_data text,
  participant_signed_at timestamptz,
  admin_signed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text := lower(trim(coalesce(p_signature_type, '')));
  v_user uuid := auth.uid();
  v_data text := coalesce(p_signature_data, '');
begin
  if v_user is null then
    raise exception 'Sesión requerida.';
  end if;

  if not public.can_access_certificate(p_certificate_code) then
    raise exception 'No tienes permiso para guardar firmas en este certificado.';
  end if;

  if v_type not in ('participant', 'participante', 'admin', 'responsible', 'responsable') then
    raise exception 'Tipo de firma inválido.';
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
    values (
      p_certificate_code,
      v_data,
      v_user,
      now(),
      now(),
      now()
    )
    on conflict (certificate_code)
    do update
    set
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
    values (
      p_certificate_code,
      v_data,
      v_user,
      now(),
      now(),
      now()
    )
    on conflict (certificate_code)
    do update
    set
      admin_signature_data = excluded.admin_signature_data,
      admin_signed_by = excluded.admin_signed_by,
      admin_signed_at = excluded.admin_signed_at,
      updated_at = now();
  end if;

  return query
  select
    cs.participant_signature_data,
    cs.admin_signature_data,
    cs.participant_signed_at,
    cs.admin_signed_at
  from public.certificate_signatures cs
  where cs.certificate_code = p_certificate_code;
end;
$$;

-- ============================================================
-- 6. QUITAR FIRMA CUANDO SE NECESITE REEMPLAZARLA
-- No elimina el certificado.
-- ============================================================

create or replace function public.clear_certificate_signature(
  p_certificate_code text,
  p_signature_type text
)
returns table (
  participant_signature_data text,
  admin_signature_data text,
  participant_signed_at timestamptz,
  admin_signed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text := lower(trim(coalesce(p_signature_type, '')));
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Sesión requerida.';
  end if;

  if not public.can_access_certificate(p_certificate_code) then
    raise exception 'No tienes permiso para modificar firmas en este certificado.';
  end if;

  if v_type not in ('participant', 'participante', 'admin', 'responsible', 'responsable') then
    raise exception 'Tipo de firma inválido.';
  end if;

  insert into public.certificate_signatures (
    certificate_code,
    created_at,
    updated_at
  )
  values (
    p_certificate_code,
    now(),
    now()
  )
  on conflict (certificate_code) do nothing;

  if v_type in ('participant', 'participante') then
    update public.certificate_signatures
    set
      participant_signature_data = null,
      participant_signed_by = null,
      participant_signed_at = null,
      updated_at = now()
    where certificate_code = p_certificate_code;
  else
    update public.certificate_signatures
    set
      admin_signature_data = null,
      admin_signed_by = null,
      admin_signed_at = null,
      updated_at = now()
    where certificate_code = p_certificate_code;
  end if;

  return query
  select
    cs.participant_signature_data,
    cs.admin_signature_data,
    cs.participant_signed_at,
    cs.admin_signed_at
  from public.certificate_signatures cs
  where cs.certificate_code = p_certificate_code;
end;
$$;

-- ============================================================
-- 7. RLS Y PERMISOS
-- ============================================================

alter table public.certificate_signatures enable row level security;

drop policy if exists certificate_signatures_select_policy on public.certificate_signatures;
drop policy if exists certificate_signatures_insert_policy on public.certificate_signatures;
drop policy if exists certificate_signatures_update_policy on public.certificate_signatures;

create policy certificate_signatures_select_policy
on public.certificate_signatures
for select
to authenticated
using (
  public.can_access_certificate(certificate_code)
);

create policy certificate_signatures_insert_policy
on public.certificate_signatures
for insert
to authenticated
with check (
  public.can_access_certificate(certificate_code)
);

create policy certificate_signatures_update_policy
on public.certificate_signatures
for update
to authenticated
using (
  public.can_access_certificate(certificate_code)
)
with check (
  public.can_access_certificate(certificate_code)
);

grant select, insert, update on public.certificate_signatures to authenticated;
grant execute on function public.can_access_certificate(text) to authenticated;
grant execute on function public.get_certificate_signatures(text) to authenticated;
grant execute on function public.save_certificate_signature(text, text, text) to authenticated;
grant execute on function public.clear_certificate_signature(text, text) to authenticated;

commit;

-- ============================================================
-- 8. DIAGNÓSTICO
-- ============================================================

select
  'certificate_signatures' as tabla,
  count(*) as registros
from public.certificate_signatures;
