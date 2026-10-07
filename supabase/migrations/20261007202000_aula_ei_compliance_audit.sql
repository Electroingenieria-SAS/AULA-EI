-- Audit trail for AULA EI Compliance Center.
-- Records event metadata only; request/incident narrative text is deliberately excluded.

create or replace function public.audit_aula_compliance_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action text;
  v_entity_type text;
  v_entity_id text;
  v_metadata jsonb := '{}'::jsonb;
  v_document_code text;
begin
  if tg_table_name = 'legal_acceptances' and tg_op = 'INSERT' then
    v_action := 'legal.accepted';
    v_entity_type := 'legal_acceptance';
    v_entity_id := new.id::text;
    v_metadata := jsonb_build_object(
      'document_code', new.document_code,
      'document_version', new.document_version,
      'user_type', new.user_type
    );

  elsif tg_table_name = 'legal_document_versions' and tg_op = 'INSERT' then
    select d.code into v_document_code
      from public.legal_documents d where d.id = new.document_id;
    v_action := 'legal.version.created';
    v_entity_type := 'legal_document_version';
    v_entity_id := new.id::text;
    v_metadata := jsonb_build_object(
      'document_code', v_document_code,
      'version', new.version,
      'status', new.status,
      'is_material', new.is_material
    );

  elsif tg_table_name = 'legal_document_versions' and tg_op = 'UPDATE'
        and new.status is distinct from old.status then
    select d.code into v_document_code
      from public.legal_documents d where d.id = new.document_id;
    v_action := case
      when new.status = 'published' then 'legal.version.published'
      when new.status = 'retired' then 'legal.version.retired'
      else 'legal.version.status_changed'
    end;
    v_entity_type := 'legal_document_version';
    v_entity_id := new.id::text;
    v_metadata := jsonb_build_object(
      'document_code', v_document_code,
      'version', new.version,
      'old_status', old.status,
      'new_status', new.status,
      'is_material', new.is_material
    );

  elsif tg_table_name = 'legal_user_contexts'
        and tg_op in ('INSERT','UPDATE') then
    v_action := 'legal.user_context.changed';
    v_entity_type := 'legal_user_context';
    v_entity_id := new.user_id::text;
    v_metadata := jsonb_build_object(
      'user_type', new.user_type,
      'operation', lower(tg_op)
    );

  elsif tg_table_name = 'privacy_requests' and tg_op = 'INSERT' then
    v_action := 'privacy.request.created';
    v_entity_type := 'privacy_request';
    v_entity_id := new.id::text;
    v_metadata := jsonb_build_object(
      'request_type', new.request_type,
      'status', new.status,
      'due_at', new.due_at
    );

  elsif tg_table_name = 'privacy_requests' and tg_op = 'UPDATE'
        and new.status is distinct from old.status then
    v_action := 'privacy.request.status_changed';
    v_entity_type := 'privacy_request';
    v_entity_id := new.id::text;
    v_metadata := jsonb_build_object(
      'request_type', new.request_type,
      'old_status', old.status,
      'new_status', new.status,
      'extension_used', new.extension_used
    );

  elsif tg_table_name = 'privacy_incidents' and tg_op = 'INSERT' then
    v_action := 'privacy.incident.created';
    v_entity_type := 'privacy_incident';
    v_entity_id := new.id::text;
    v_metadata := jsonb_build_object(
      'severity', new.severity,
      'category', new.category,
      'status', new.status
    );
  else
    return coalesce(new, old);
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), v_action, v_entity_type, v_entity_id, v_metadata);

  return coalesce(new, old);
end;
$$;

revoke all on function public.audit_aula_compliance_mutation() from public, anon, authenticated;

drop trigger if exists trg_audit_legal_acceptances on public.legal_acceptances;
create trigger trg_audit_legal_acceptances
after insert on public.legal_acceptances
for each row execute function public.audit_aula_compliance_mutation();

drop trigger if exists trg_audit_legal_versions on public.legal_document_versions;
create trigger trg_audit_legal_versions
after insert or update on public.legal_document_versions
for each row execute function public.audit_aula_compliance_mutation();

drop trigger if exists trg_audit_legal_user_contexts on public.legal_user_contexts;
create trigger trg_audit_legal_user_contexts
after insert or update on public.legal_user_contexts
for each row execute function public.audit_aula_compliance_mutation();

drop trigger if exists trg_audit_privacy_requests on public.privacy_requests;
create trigger trg_audit_privacy_requests
after insert or update on public.privacy_requests
for each row execute function public.audit_aula_compliance_mutation();

drop trigger if exists trg_audit_privacy_incidents on public.privacy_incidents;
create trigger trg_audit_privacy_incidents
after insert on public.privacy_incidents
for each row execute function public.audit_aula_compliance_mutation();
