-- Cover foreign keys introduced by AULA EI Compliance Center.
create index if not exists legal_documents_created_by_idx
  on public.legal_documents(created_by);

create index if not exists legal_document_versions_approved_by_idx
  on public.legal_document_versions(approved_by);

create index if not exists legal_document_versions_created_by_idx
  on public.legal_document_versions(created_by);

create index if not exists legal_user_contexts_updated_by_idx
  on public.legal_user_contexts(updated_by);

create index if not exists privacy_incidents_created_by_idx
  on public.privacy_incidents(created_by);

create index if not exists privacy_requests_resolved_by_idx
  on public.privacy_requests(resolved_by);

create index if not exists retention_rules_approved_by_idx
  on public.retention_rules(approved_by);
