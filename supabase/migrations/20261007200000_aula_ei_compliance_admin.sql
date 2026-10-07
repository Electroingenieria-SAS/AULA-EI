-- Administrative surface for AULA EI Compliance Center.
-- All privileged entry points require live admin AAL2; privacy incidents require Super Admin.

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
          and vm.status in ('published','retired')
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

create or replace function public.admin_list_legal_documents()
returns table (
  document_id uuid,
  document_code text,
  title text,
  category text,
  is_active boolean,
  version_id uuid,
  version text,
  status text,
  is_material boolean,
  effective_at timestamptz,
  published_at timestamptz,
  content_sha256 text,
  content_markdown text
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_admin() or not public.aula_is_aal2() then
    raise exception 'admin AAL2 required';
  end if;

  return query
  select d.id,d.code,d.title,d.category,d.is_active,
         v.id,v.version,v.status,v.is_material,v.effective_at,v.published_at,
         v.content_sha256,v.content_markdown
  from public.legal_documents d
  left join public.legal_document_versions v on v.document_id=d.id
  order by d.code, v.created_at desc;
end;
$$;

revoke all on function public.admin_list_legal_documents() from public, anon;
grant execute on function public.admin_list_legal_documents() to authenticated;

create or replace function public.admin_create_legal_document_version(
  p_document_code text,
  p_version text,
  p_content_markdown text,
  p_is_material boolean default true
)
returns table (
  version_id uuid,
  document_code text,
  version text,
  status text,
  content_sha256 text
)
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_document_id uuid;
  v_content text := trim(coalesce(p_content_markdown,''));
  v_version text := trim(coalesce(p_version,''));
  v_row public.legal_document_versions%rowtype;
begin
  if not public.is_admin() or not public.aula_is_aal2() then
    raise exception 'admin AAL2 required';
  end if;
  if length(v_version) < 1 or length(v_version) > 32 then
    raise exception 'invalid legal document version';
  end if;
  if length(v_content) < 80 then
    raise exception 'legal document content is too short';
  end if;

  select d.id into v_document_id
  from public.legal_documents d
  where d.code=trim(p_document_code) and d.is_active=true;

  if v_document_id is null then
    raise exception 'legal document not found';
  end if;

  insert into public.legal_document_versions (
    document_id,version,content_markdown,content_sha256,is_material,status,created_by
  ) values (
    v_document_id,
    v_version,
    v_content,
    encode(extensions.digest(convert_to(v_content,'UTF8'),'sha256'),'hex'),
    coalesce(p_is_material,true),
    'draft',
    auth.uid()
  )
  returning * into v_row;

  return query select v_row.id,trim(p_document_code),v_row.version,v_row.status,v_row.content_sha256;
end;
$$;

revoke all on function public.admin_create_legal_document_version(text,text,text,boolean) from public, anon;
grant execute on function public.admin_create_legal_document_version(text,text,text,boolean) to authenticated;

create or replace function public.admin_publish_legal_document_version(p_version_id uuid)
returns table (
  version_id uuid,
  document_code text,
  version text,
  status text,
  effective_at timestamptz,
  content_sha256 text
)
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_row public.legal_document_versions%rowtype;
  v_code text;
begin
  if not public.is_admin() or not public.aula_is_aal2() then
    raise exception 'admin AAL2 required';
  end if;

  select v.*, d.code
  into v_row, v_code
  from public.legal_document_versions v
  join public.legal_documents d on d.id=v.document_id
  where v.id=p_version_id
  for update of v;

  if v_row.id is null then raise exception 'legal version not found'; end if;
  if v_row.status not in ('draft','approved') then
    raise exception 'only draft or approved versions can be published';
  end if;
  if length(trim(v_row.content_markdown)) < 80 then
    raise exception 'legal document content is too short';
  end if;

  update public.legal_document_versions
     set status='retired'
   where document_id=v_row.document_id
     and status='published'
     and id<>v_row.id;

  update public.legal_document_versions
     set status='published',
         approved_at=coalesce(approved_at,now()),
         approved_by=coalesce(approved_by,auth.uid()),
         published_at=now(),
         effective_at=now(),
         content_sha256=encode(extensions.digest(convert_to(content_markdown,'UTF8'),'sha256'),'hex')
   where id=v_row.id
   returning * into v_row;

  return query select v_row.id,v_code,v_row.version,v_row.status,v_row.effective_at,v_row.content_sha256;
end;
$$;

revoke all on function public.admin_publish_legal_document_version(uuid) from public, anon;
grant execute on function public.admin_publish_legal_document_version(uuid) to authenticated;

create or replace function public.admin_list_legal_user_contexts()
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text,
  user_type text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_admin() or not public.aula_is_aal2() then
    raise exception 'admin AAL2 required';
  end if;

  return query
  select p.id,p.full_name,p.email,public.normalize_aula_ei_role(p.role),
         coalesce(luc.user_type,'employee'),
         luc.updated_at
  from public.profiles p
  left join public.legal_user_contexts luc on luc.user_id=p.id
  where p.is_active=true
  order by p.full_name nulls last,p.email;
end;
$$;

revoke all on function public.admin_list_legal_user_contexts() from public, anon;
grant execute on function public.admin_list_legal_user_contexts() to authenticated;

create or replace function public.admin_list_privacy_requests()
returns table (
  request_id uuid,
  requester_user_id uuid,
  requester_name text,
  requester_email text,
  request_type text,
  description text,
  status text,
  received_at timestamptz,
  due_at timestamptz,
  extension_used boolean,
  resolution text,
  resolved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_admin() or not public.aula_is_aal2() then
    raise exception 'admin AAL2 required';
  end if;

  return query
  select pr.id,pr.requester_user_id,p.full_name,p.email,pr.request_type,pr.description,
         pr.status,pr.received_at,pr.due_at,pr.extension_used,pr.resolution,pr.resolved_at
  from public.privacy_requests pr
  left join public.profiles p on p.id=pr.requester_user_id
  order by case when pr.status in ('received','in_review','extended') then 0 else 1 end,
           pr.due_at,pr.received_at;
end;
$$;

revoke all on function public.admin_list_privacy_requests() from public, anon;
grant execute on function public.admin_list_privacy_requests() to authenticated;

create or replace function public.admin_resolve_privacy_request(
  p_request_id uuid,
  p_status text,
  p_resolution text
)
returns table (
  request_id uuid,
  status text,
  resolution text,
  resolved_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_status text := lower(trim(coalesce(p_status,'')));
  v_resolution text := trim(coalesce(p_resolution,''));
  v_row public.privacy_requests%rowtype;
begin
  if not public.is_admin() or not public.aula_is_aal2() then
    raise exception 'admin AAL2 required';
  end if;
  if v_status not in ('in_review','extended','resolved','rejected') then
    raise exception 'invalid privacy request status';
  end if;
  if v_status in ('resolved','rejected') and length(v_resolution)<10 then
    raise exception 'resolution text is required';
  end if;

  update public.privacy_requests
     set status=v_status,
         resolution=case when v_resolution='' then resolution else v_resolution end,
         extension_used=extension_used or v_status='extended',
         resolved_at=case when v_status in ('resolved','rejected') then now() else null end,
         resolved_by=case when v_status in ('resolved','rejected') then auth.uid() else null end
   where id=p_request_id
   returning * into v_row;

  if v_row.id is null then raise exception 'privacy request not found'; end if;
  return query select v_row.id,v_row.status,v_row.resolution,v_row.resolved_at;
end;
$$;

revoke all on function public.admin_resolve_privacy_request(uuid,text,text) from public, anon;
grant execute on function public.admin_resolve_privacy_request(uuid,text,text) to authenticated;

create or replace function public.admin_create_privacy_incident(
  p_severity text,
  p_category text,
  p_description text
)
returns table (
  incident_id uuid,
  severity text,
  status text,
  detected_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_severity text := lower(trim(coalesce(p_severity,'')));
  v_category text := trim(coalesce(p_category,''));
  v_description text := trim(coalesce(p_description,''));
  v_row public.privacy_incidents%rowtype;
begin
  if not public.is_super_admin() or not public.aula_is_aal2() then
    raise exception 'super admin AAL2 required';
  end if;
  if v_severity not in ('low','medium','high','critical') then raise exception 'invalid severity'; end if;
  if length(v_category)<3 or length(v_description)<10 then raise exception 'incident category/description too short'; end if;

  insert into public.privacy_incidents(severity,category,detected_at,description,status,created_by)
  values(v_severity,v_category,now(),v_description,'open',auth.uid())
  returning * into v_row;

  return query select v_row.id,v_row.severity,v_row.status,v_row.detected_at;
end;
$$;

revoke all on function public.admin_create_privacy_incident(text,text,text) from public, anon;
grant execute on function public.admin_create_privacy_incident(text,text,text) to authenticated;

create or replace function public.admin_list_privacy_incidents()
returns table (
  incident_id uuid,
  severity text,
  category text,
  detected_at timestamptz,
  description text,
  affected_scope text,
  containment text,
  remediation text,
  regulatory_report_required boolean,
  regulatory_reported_at timestamptz,
  status text
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_super_admin() or not public.aula_is_aal2() then
    raise exception 'super admin AAL2 required';
  end if;

  return query
  select i.id,i.severity,i.category,i.detected_at,i.description,i.affected_scope,
         i.containment,i.remediation,i.regulatory_report_required,i.regulatory_reported_at,i.status
  from public.privacy_incidents i
  order by i.detected_at desc;
end;
$$;

revoke all on function public.admin_list_privacy_incidents() from public, anon;
grant execute on function public.admin_list_privacy_incidents() to authenticated;
