-- AULA EI Compliance Center
-- Legal documents, immutable acceptance evidence, privacy requests and audience context.

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  category text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.legal_documents(id) on delete restrict,
  version text not null,
  content_markdown text not null,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  is_material boolean not null default true,
  status text not null check (status in ('draft','approved','published','retired')),
  effective_at timestamptz,
  published_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (document_id, version),
  check (
    status <> 'published'
    or (effective_at is not null and published_at is not null and length(trim(content_markdown)) > 0)
  )
);

create index if not exists legal_document_versions_current_idx
  on public.legal_document_versions (document_id, status, effective_at desc, created_at desc);

create table if not exists public.legal_audience_rules (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.legal_documents(id) on delete cascade,
  audience text not null check (audience in ('employee','prehire','candidate')),
  required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (document_id, audience)
);

create table if not exists public.legal_user_contexts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_type text not null check (user_type in ('employee','prehire','candidate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  document_version_id uuid not null references public.legal_document_versions(id) on delete restrict,
  document_code text not null,
  document_version text not null,
  document_sha256 text not null check (document_sha256 ~ '^[0-9a-f]{64}$'),
  user_type text not null check (user_type in ('employee','prehire','candidate')),
  accepted_at timestamptz not null default now(),
  acceptance_method text not null default 'authenticated_explicit_acceptance',
  auth_session_id uuid,
  application_version text,
  created_at timestamptz not null default now(),
  unique (user_id, document_version_id)
);

create index if not exists legal_acceptances_user_idx
  on public.legal_acceptances (user_id, accepted_at desc);
create index if not exists legal_acceptances_version_idx
  on public.legal_acceptances (document_version_id);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete restrict,
  request_type text not null check (request_type in ('consulta','correccion','actualizacion','supresion','revocatoria','reclamo')),
  description text not null check (length(trim(description)) between 10 and 4000),
  status text not null default 'received' check (status in ('received','in_review','extended','resolved','rejected')),
  received_at timestamptz not null default now(),
  due_at timestamptz not null,
  extension_used boolean not null default false,
  resolution text,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists privacy_requests_requester_idx
  on public.privacy_requests (requester_user_id, received_at desc);
create index if not exists privacy_requests_due_idx
  on public.privacy_requests (status, due_at);

create table if not exists public.privacy_incidents (
  id uuid primary key default gen_random_uuid(),
  severity text not null check (severity in ('low','medium','high','critical')),
  category text not null,
  detected_at timestamptz not null,
  reported_internal_at timestamptz,
  description text not null,
  affected_scope text,
  containment text,
  root_cause text,
  remediation text,
  regulatory_report_required boolean,
  regulatory_reported_at timestamptz,
  status text not null default 'open' check (status in ('open','contained','investigating','resolved','closed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.retention_rules (
  id uuid primary key default gen_random_uuid(),
  data_category text not null unique,
  trigger_event text not null,
  retention_basis text not null,
  retention_days integer check (retention_days is null or retention_days >= 0),
  action text not null check (action in ('delete','anonymize','archive','review')),
  is_active boolean not null default true,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.legal_documents enable row level security;
alter table public.legal_document_versions enable row level security;
alter table public.legal_audience_rules enable row level security;
alter table public.legal_user_contexts enable row level security;
alter table public.legal_acceptances enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.privacy_incidents enable row level security;
alter table public.retention_rules enable row level security;

revoke all on table public.legal_documents from anon, authenticated;
revoke all on table public.legal_document_versions from anon, authenticated;
revoke all on table public.legal_audience_rules from anon, authenticated;
revoke all on table public.legal_user_contexts from anon, authenticated;
revoke all on table public.legal_acceptances from anon, authenticated;
revoke all on table public.privacy_requests from anon, authenticated;
revoke all on table public.privacy_incidents from anon, authenticated;
revoke all on table public.retention_rules from anon, authenticated;

create or replace function public.aula_legal_user_type(p_user_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(
    (select luc.user_type
       from public.legal_user_contexts luc
      where luc.user_id = p_user_id),
    'employee'
  );
$$;

revoke all on function public.aula_legal_user_type(uuid) from public, anon, authenticated;

create or replace function public.aula_add_business_days(p_start timestamptz, p_days integer)
returns timestamptz
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_cursor timestamptz := p_start;
  v_added integer := 0;
begin
  if p_days < 0 then
    raise exception 'business days must be non-negative';
  end if;
  while v_added < p_days loop
    v_cursor := v_cursor + interval '1 day';
    if extract(isodow from v_cursor) between 1 and 5 then
      v_added := v_added + 1;
    end if;
  end loop;
  return v_cursor;
end;
$$;

revoke all on function public.aula_add_business_days(timestamptz, integer) from public, anon, authenticated;

create or replace function public.get_my_legal_requirements()
returns table (
  document_id uuid,
  document_version_id uuid,
  document_code text,
  title text,
  category text,
  version text,
  content_markdown text,
  content_sha256 text,
  is_material boolean,
  effective_at timestamptz,
  accepted boolean,
  accepted_at timestamptz,
  needs_acceptance boolean,
  user_type text
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with actor as (
    select auth.uid() as user_id, public.aula_legal_user_type(auth.uid()) as user_type
  ),
  current_versions as (
    select
      d.id as document_id,
      d.code,
      d.title,
      d.category,
      v.id as version_id,
      v.version,
      v.content_markdown,
      v.content_sha256,
      v.is_material,
      v.effective_at,
      a.user_id,
      a.user_type,
      (
        select max(vm.effective_at)
        from public.legal_document_versions vm
        where vm.document_id = d.id
          and vm.status = 'published'
          and vm.effective_at <= v.effective_at
          and vm.is_material = true
      ) as latest_material_at
    from actor a
    join public.legal_audience_rules ar
      on ar.audience = a.user_type and ar.required = true
    join public.legal_documents d
      on d.id = ar.document_id and d.is_active = true
    join lateral (
      select v2.*
      from public.legal_document_versions v2
      where v2.document_id = d.id
        and v2.status = 'published'
        and v2.effective_at <= now()
      order by v2.effective_at desc, v2.created_at desc, v2.id desc
      limit 1
    ) v on true
    where a.user_id is not null
      and public.is_aula_active()
  )
  select
    cv.document_id,
    cv.version_id,
    cv.code,
    cv.title,
    cv.category,
    cv.version,
    cv.content_markdown,
    cv.content_sha256,
    cv.is_material,
    cv.effective_at,
    coalesce(ev.accepted, false),
    ev.accepted_at,
    not coalesce(ev.accepted, false),
    cv.user_type
  from current_versions cv
  left join lateral (
    select true as accepted, la.accepted_at
    from public.legal_acceptances la
    join public.legal_document_versions av on av.id = la.document_version_id
    where la.user_id = cv.user_id
      and av.document_id = cv.document_id
      and (
        la.document_version_id = cv.version_id
        or (
          cv.is_material = false
          and cv.latest_material_at is not null
          and av.effective_at >= cv.latest_material_at
          and av.effective_at <= cv.effective_at
        )
      )
    order by la.accepted_at desc
    limit 1
  ) ev on true
  order by cv.code;
$$;

revoke all on function public.get_my_legal_requirements() from public, anon;
grant execute on function public.get_my_legal_requirements() to authenticated;

create or replace function public.get_my_legal_acceptances()
returns table (
  acceptance_id uuid,
  document_code text,
  title text,
  document_version text,
  document_sha256 text,
  user_type text,
  accepted_at timestamptz,
  acceptance_method text,
  application_version text
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    la.id,
    la.document_code,
    d.title,
    la.document_version,
    la.document_sha256,
    la.user_type,
    la.accepted_at,
    la.acceptance_method,
    la.application_version
  from public.legal_acceptances la
  join public.legal_document_versions v on v.id = la.document_version_id
  join public.legal_documents d on d.id = v.document_id
  where auth.uid() is not null
    and la.user_id = auth.uid()
    and public.is_aula_active()
  order by la.accepted_at desc;
$$;

revoke all on function public.get_my_legal_acceptances() from public, anon;
grant execute on function public.get_my_legal_acceptances() to authenticated;

create or replace function public.accept_legal_document(
  p_document_version_id uuid,
  p_application_version text default null
)
returns table (
  acceptance_id uuid,
  document_code text,
  document_version text,
  document_sha256 text,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_type text;
  v_document_id uuid;
  v_document_code text;
  v_version text;
  v_sha text;
  v_effective_at timestamptz;
  v_current_version_id uuid;
  v_acceptance public.legal_acceptances%rowtype;
begin
  if v_user_id is null or not public.is_aula_active() then
    raise exception 'authenticated active Aula EI account required';
  end if;

  v_user_type := public.aula_legal_user_type(v_user_id);

  select d.id, d.code, v.version, v.content_sha256, v.effective_at
    into v_document_id, v_document_code, v_version, v_sha, v_effective_at
  from public.legal_document_versions v
  join public.legal_documents d on d.id = v.document_id
  join public.legal_audience_rules ar
    on ar.document_id = d.id
   and ar.audience = v_user_type
   and ar.required = true
  where v.id = p_document_version_id
    and d.is_active = true
    and v.status = 'published'
    and v.effective_at <= now();

  if v_document_id is null then
    raise exception 'legal document version is not currently applicable';
  end if;

  select v2.id
    into v_current_version_id
  from public.legal_document_versions v2
  where v2.document_id = v_document_id
    and v2.status = 'published'
    and v2.effective_at <= now()
  order by v2.effective_at desc, v2.created_at desc, v2.id desc
  limit 1;

  if v_current_version_id is distinct from p_document_version_id then
    raise exception 'only the current legal document version may be accepted';
  end if;

  insert into public.legal_acceptances (
    user_id,
    document_version_id,
    document_code,
    document_version,
    document_sha256,
    user_type,
    acceptance_method,
    auth_session_id,
    application_version
  ) values (
    v_user_id,
    p_document_version_id,
    v_document_code,
    v_version,
    v_sha,
    v_user_type,
    'authenticated_explicit_acceptance',
    nullif(auth.jwt()->>'session_id','')::uuid,
    nullif(left(trim(coalesce(p_application_version,'')),128),'')
  )
  on conflict (user_id, document_version_id) do update
    set application_version = coalesce(public.legal_acceptances.application_version, excluded.application_version)
  returning * into v_acceptance;

  return query
  select
    v_acceptance.id,
    v_acceptance.document_code,
    v_acceptance.document_version,
    v_acceptance.document_sha256,
    v_acceptance.accepted_at;
end;
$$;

revoke all on function public.accept_legal_document(uuid, text) from public, anon;
grant execute on function public.accept_legal_document(uuid, text) to authenticated;

create or replace function public.create_my_privacy_request(
  p_request_type text,
  p_description text
)
returns table (
  request_id uuid,
  request_type text,
  status text,
  received_at timestamptz,
  due_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_type text := lower(trim(coalesce(p_request_type,'')));
  v_desc text := trim(coalesce(p_description,''));
  v_days integer;
  v_row public.privacy_requests%rowtype;
begin
  if v_user_id is null or not public.is_aula_active() then
    raise exception 'authenticated active Aula EI account required';
  end if;

  if v_type not in ('consulta','correccion','actualizacion','supresion','revocatoria','reclamo') then
    raise exception 'invalid privacy request type';
  end if;
  if length(v_desc) < 10 or length(v_desc) > 4000 then
    raise exception 'privacy request description must be between 10 and 4000 characters';
  end if;

  v_days := case when v_type = 'consulta' then 10 else 15 end;

  insert into public.privacy_requests (
    requester_user_id, request_type, description, status, received_at, due_at
  ) values (
    v_user_id, v_type, v_desc, 'received', now(), public.aula_add_business_days(now(), v_days)
  )
  returning * into v_row;

  return query select v_row.id, v_row.request_type, v_row.status, v_row.received_at, v_row.due_at;
end;
$$;

revoke all on function public.create_my_privacy_request(text, text) from public, anon;
grant execute on function public.create_my_privacy_request(text, text) to authenticated;

create or replace function public.get_my_privacy_requests()
returns table (
  request_id uuid,
  request_type text,
  description text,
  status text,
  received_at timestamptz,
  due_at timestamptz,
  extension_used boolean,
  resolution text,
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    pr.id,
    pr.request_type,
    pr.description,
    pr.status,
    pr.received_at,
    pr.due_at,
    pr.extension_used,
    pr.resolution,
    pr.resolved_at
  from public.privacy_requests pr
  where auth.uid() is not null
    and pr.requester_user_id = auth.uid()
    and public.is_aula_active()
  order by pr.received_at desc;
$$;

revoke all on function public.get_my_privacy_requests() from public, anon;
grant execute on function public.get_my_privacy_requests() to authenticated;

create or replace function public.admin_set_legal_user_type(
  p_user_id uuid,
  p_user_type text
)
returns table (
  user_id uuid,
  user_type text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_type text := lower(trim(coalesce(p_user_type,'')));
  v_row public.legal_user_contexts%rowtype;
begin
  if not public.is_admin() or not public.aula_is_aal2() then
    raise exception 'admin AAL2 required';
  end if;
  if p_user_id is null or not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'Aula EI user not found';
  end if;
  if v_type not in ('employee','prehire','candidate') then
    raise exception 'invalid legal user type';
  end if;

  insert into public.legal_user_contexts (user_id, user_type, updated_by)
  values (p_user_id, v_type, auth.uid())
  on conflict (user_id) do update
    set user_type = excluded.user_type,
        updated_at = now(),
        updated_by = auth.uid()
  returning * into v_row;

  return query select v_row.user_id, v_row.user_type, v_row.updated_at;
end;
$$;

revoke all on function public.admin_set_legal_user_type(uuid, text) from public, anon;
grant execute on function public.admin_set_legal_user_type(uuid, text) to authenticated;

-- Defense in depth: no direct API path to append-only evidence or legal configuration.
revoke insert, update, delete on table public.legal_acceptances from authenticated;
revoke insert, update, delete on table public.legal_documents from authenticated;
revoke insert, update, delete on table public.legal_document_versions from authenticated;
revoke insert, update, delete on table public.legal_audience_rules from authenticated;
revoke insert, update, delete on table public.legal_user_contexts from authenticated;
revoke insert, update, delete on table public.privacy_requests from authenticated;
revoke all on table public.privacy_incidents from authenticated;
revoke all on table public.retention_rules from authenticated;
