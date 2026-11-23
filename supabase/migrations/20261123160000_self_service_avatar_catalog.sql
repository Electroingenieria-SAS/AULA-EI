-- Aula EI: una sola identidad visual por cuenta, sin privilegios laborales.
-- Los 34 identificadores provienen exclusivamente del catálogo recibido y
-- verificado contra los SHA-256 de cada imagen completa del paquete.
-- No se conceden UPDATE genéricos sobre public.profiles.
create or replace function public.set_my_aula_avatar(
  p_avatar_id text,
  p_background_id text default 'FON-07'
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_avatar_url text;
begin
  if auth.uid() is null or not public.is_aula_active() then
    raise exception 'Debes iniciar sesión en Aula EI para personalizar tu avatar.' using errcode='42501';
  end if;

  if p_avatar_id is null or p_avatar_id not in (
    'EI-LOGISTICO-M-01',
    'EI-LOGISTICO-M-02',
    'EI-LOGISTICO-M-03',
    'EI-LOGISTICO-M-04',
    'EI-LOGISTICO-M-05',
    'EI-CONTRATISTA-M-01',
    'EI-CONTRATISTA-M-02',
    'EI-CONTRATISTA-M-03',
    'EI-CONTRATISTA-M-04',
    'EI-CONTRATISTA-M-05',
    'EI-ANALISTA-M-01',
    'EI-ANALISTA-M-02',
    'EI-ANALISTA-M-03',
    'EI-ANALISTA-M-04',
    'EI-ANALISTA-M-05',
    'EI-ANALISTA-F-01',
    'EI-ANALISTA-F-02',
    'EI-ANALISTA-F-03',
    'EI-ANALISTA-F-04',
    'EI-ANALISTA-F-05',
    'EI-LIDER-M-01',
    'EI-LIDER-M-02',
    'EI-LIDER-M-03',
    'EI-LIDER-M-04',
    'EI-LIDER-M-05',
    'EI-LIDER-F-01',
    'EI-LIDER-F-02',
    'EI-LIDER-F-03',
    'EI-JEFE-M-01',
    'EI-JEFE-M-02',
    'EI-JEFE-M-03',
    'EI-JEFE-F-01',
    'EI-JEFE-F-02',
    'EI-JEFE-F-03'
  ) then
    raise exception 'El personaje solicitado no existe en el catálogo autorizado.' using errcode='22023';
  end if;
  if p_background_id is null or p_background_id not in ('FON-01', 'FON-02', 'FON-03', 'FON-04', 'FON-05', 'FON-06', 'FON-07', 'FON-08') then
    raise exception 'El fondo solicitado no existe en el catálogo autorizado.' using errcode='22023';
  end if;

  -- Marcador textual, NO URL arbitraria: se renderiza solo desde assets locales
  -- resueltos por el catálogo en React y permanece entre sesiones/dispositivos.
  v_avatar_url := 'aula-ei-avatar:' || p_avatar_id || ':' || p_background_id;
  update public.profiles
    set avatar_url=v_avatar_url, updated_at=now()
    where id=auth.uid() and is_active=true;
  if not found then
    raise exception 'Perfil activo de Aula EI no encontrado.' using errcode='42501';
  end if;
  return v_avatar_url;
end;
$$;
revoke all on function public.set_my_aula_avatar(text,text) from public, anon, authenticated;
grant execute on function public.set_my_aula_avatar(text,text) to authenticated;
comment on function public.set_my_aula_avatar(text,text) is
'Permite actualizar exclusivamente avatar_url del perfil autenticado y activo; acepta solo uno de 34 avatares y 8 fondos institucionales. No altera RBAC, puestos, cursos ni certificados.';
