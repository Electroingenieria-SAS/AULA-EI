-- Allow deliberately justified, irreversible deletion of erroneous non-admin
-- accounts while retaining shared resources and the independent audit trail.
-- Supabase Auth remains the sole authority performing auth.admin.deleteUser.
-- This migration changes only FK actions; it does not delete any current user.
--
-- The user's own training, legal consents and privacy requests are removed
-- along with the account. Show this consequence before confirmation.
-- Administrative audit logs and shared courses/documents survive; historical
-- actor references become NULL when the profile is removed.

-- Auth-owned legal/privacy records that previously RESTRICTed deletion.
ALTER TABLE public.legal_acceptances
  DROP CONSTRAINT legal_acceptances_user_id_fkey,
  ADD CONSTRAINT legal_acceptances_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.privacy_requests
  DROP CONSTRAINT privacy_requests_requester_user_id_fkey,
  ADD CONSTRAINT privacy_requests_requester_user_id_fkey
    FOREIGN KEY (requester_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Never remove audit events made by an account that is later deleted.
ALTER TABLE public.audit_logs
  DROP CONSTRAINT audit_logs_actor_id_fkey,
  ADD CONSTRAINT audit_logs_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Preserve other employees' enrollments assigned by the deleted person.
ALTER TABLE public.enrollments
  DROP CONSTRAINT enrollments_assigned_by_fkey,
  ADD CONSTRAINT enrollments_assigned_by_fkey
    FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Preserve published courses and their learners rather than cascading the
-- author's entire course out of existence.
ALTER TABLE public.courses ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.courses
  DROP CONSTRAINT courses_created_by_fkey,
  ADD CONSTRAINT courses_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Preserve privacy incidents, including their remediation history.
ALTER TABLE public.privacy_incidents ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.privacy_incidents
  DROP CONSTRAINT privacy_incidents_created_by_fkey,
  ADD CONSTRAINT privacy_incidents_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Other optional attribution references on protected resources.
ALTER TABLE public.legal_documents
  DROP CONSTRAINT legal_documents_created_by_fkey,
  ADD CONSTRAINT legal_documents_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.legal_document_versions
  DROP CONSTRAINT legal_document_versions_created_by_fkey,
  ADD CONSTRAINT legal_document_versions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  DROP CONSTRAINT legal_document_versions_approved_by_fkey,
  ADD CONSTRAINT legal_document_versions_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.legal_user_contexts
  DROP CONSTRAINT legal_user_contexts_updated_by_fkey,
  ADD CONSTRAINT legal_user_contexts_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.privacy_requests
  DROP CONSTRAINT privacy_requests_resolved_by_fkey,
  ADD CONSTRAINT privacy_requests_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.retention_rules
  DROP CONSTRAINT retention_rules_approved_by_fkey,
  ADD CONSTRAINT retention_rules_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- The profile cascades both certificates and exam attempts; the relationship
-- between those children must also be cascade-safe regardless of delete order.
ALTER TABLE public.certificates
  DROP CONSTRAINT certificates_exam_attempt_id_fkey,
  ADD CONSTRAINT certificates_exam_attempt_id_fkey
    FOREIGN KEY (exam_attempt_id) REFERENCES public.exam_attempts(id) ON DELETE CASCADE;
