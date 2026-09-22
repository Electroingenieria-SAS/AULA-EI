-- Harden certificate RPCs so inactive Aula EI accounts cannot continue using old tokens.

create or replace function public.get_my_certificates()
returns table(
  certificate_code text,
  course_id uuid,
  course_title text,
  user_id uuid,
  user_full_name text,
  user_email text,
  score integer,
  issued_at timestamptz
)
language sql
security definer
set search_path to 'public','pg_temp'
as $function$
  select
    cert.certificate_code,
    cert.course_id,
    c.title as course_title,
    cert.user_id,
    p.full_name as user_full_name,
    p.email as user_email,
    cert.score,
    cert.issued_at
  from public.certificates cert
  join public.courses c on c.id=cert.course_id
  join public.profiles p on p.id=cert.user_id
  where cert.user_id=auth.uid()
    and public.is_aula_active(auth.uid())
  order by cert.issued_at desc;
$function$;

create or replace function public.get_certificate_by_code(p_certificate_code text)
returns table(
  certificate_code text,
  course_id uuid,
  course_title text,
  user_id uuid,
  user_full_name text,
  user_email text,
  score integer,
  issued_at timestamptz
)
language sql
security definer
set search_path to 'public','pg_temp'
as $function$
  select
    cert.certificate_code,
    cert.course_id,
    c.title as course_title,
    cert.user_id,
    p.full_name as user_full_name,
    p.email as user_email,
    cert.score,
    cert.issued_at
  from public.certificates cert
  join public.courses c on c.id=cert.course_id
  join public.profiles p on p.id=cert.user_id
  where cert.certificate_code=p_certificate_code
    and public.can_access_certificate(p_certificate_code)
  limit 1;
$function$;

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
set search_path to 'public','pg_temp'
as $function$
declare
  v_type text := lower(trim(coalesce(p_signature_type,'')));
  v_user uuid := auth.uid();
  v_data text := coalesce(p_signature_data,'');
  v_owner uuid;
begin
  if v_user is null then
    raise exception 'Sesión requerida.';
  end if;

  if not public.is_aula_active(v_user) then
    raise exception 'Cuenta no habilitada para Aula EI.';
  end if;

  select cert.user_id into v_owner
  from public.certificates cert
  where cert.certificate_code=p_certificate_code;

  if v_owner is null then
    raise exception 'Certificado no encontrado.';
  end if;

  if v_type not in ('participant','participante','admin','responsible','responsable') then
    raise exception 'Tipo de firma inválido.';
  end if;

  if v_type in ('participant','participante') and v_user<>v_owner then
    raise exception 'Solo el participante puede registrar su propia firma.';
  end if;

  if v_type in ('admin','responsible','responsable') and not public.can_manage_users() then
    raise exception 'Solo un Administrador o Super Administrador puede registrar la firma responsable.';
  end if;

  if length(v_data)<30 then
    raise exception 'La firma está vacía o no es válida.';
  end if;

  if v_data !~ '^data:image/(png|jpeg|jpg|webp);base64,' then
    raise exception 'Formato de firma inválido. Usa PNG, JPG o WEBP.';
  end if;

  if length(v_data)>1200000 then
    raise exception 'La firma es demasiado pesada. Usa una imagen más liviana.';
  end if;

  if v_type in ('participant','participante') then
    insert into public.certificate_signatures(
      certificate_code,
      participant_signature_data,
      participant_signed_by,
      participant_signed_at,
      created_at,
      updated_at
    )
    values(p_certificate_code,v_data,v_user,now(),now(),now())
    on conflict(certificate_code) do update
      set participant_signature_data=excluded.participant_signature_data,
          participant_signed_by=excluded.participant_signed_by,
          participant_signed_at=excluded.participant_signed_at,
          updated_at=now();
  else
    insert into public.certificate_signatures(
      certificate_code,
      admin_signature_data,
      admin_signed_by,
      admin_signed_at,
      created_at,
      updated_at
    )
    values(p_certificate_code,v_data,v_user,now(),now(),now())
    on conflict(certificate_code) do update
      set admin_signature_data=excluded.admin_signature_data,
          admin_signed_by=excluded.admin_signed_by,
          admin_signed_at=excluded.admin_signed_at,
          updated_at=now();
  end if;

  return query
  select
    cs.participant_signature_data,
    cs.admin_signature_data,
    cs.participant_signed_at,
    cs.admin_signed_at
  from public.certificate_signatures cs
  where cs.certificate_code=p_certificate_code;
end;
$function$;

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
set search_path to 'public','pg_temp'
as $function$
declare
  v_type text := lower(trim(coalesce(p_signature_type,'')));
  v_user uuid := auth.uid();
  v_owner uuid;
begin
  if v_user is null then
    raise exception 'Sesión requerida.';
  end if;

  if not public.is_aula_active(v_user) then
    raise exception 'Cuenta no habilitada para Aula EI.';
  end if;

  select cert.user_id into v_owner
  from public.certificates cert
  where cert.certificate_code=p_certificate_code;

  if v_owner is null then
    raise exception 'Certificado no encontrado.';
  end if;

  if v_type not in ('participant','participante','admin','responsible','responsable') then
    raise exception 'Tipo de firma inválido.';
  end if;

  if v_type in ('participant','participante') and v_user<>v_owner then
    raise exception 'Solo el participante puede retirar su propia firma.';
  end if;

  if v_type in ('admin','responsible','responsable') and not public.can_manage_users() then
    raise exception 'Solo un Administrador o Super Administrador puede retirar la firma responsable.';
  end if;

  insert into public.certificate_signatures(certificate_code,created_at,updated_at)
  values(p_certificate_code,now(),now())
  on conflict(certificate_code) do nothing;

  if v_type in ('participant','participante') then
    update public.certificate_signatures
      set participant_signature_data=null,
          participant_signed_by=null,
          participant_signed_at=null,
          updated_at=now()
    where certificate_code=p_certificate_code;
  else
    update public.certificate_signatures
      set admin_signature_data=null,
          admin_signed_by=null,
          admin_signed_at=null,
          updated_at=now()
    where certificate_code=p_certificate_code;
  end if;

  return query
  select
    cs.participant_signature_data,
    cs.admin_signature_data,
    cs.participant_signed_at,
    cs.admin_signed_at
  from public.certificate_signatures cs
  where cs.certificate_code=p_certificate_code;
end;
$function$;
