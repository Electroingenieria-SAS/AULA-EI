-- Retain legally relevant acceptance evidence when an erroneous non-admin
-- Aula EI user is permanently removed through Supabase Auth Admin API.
--
-- Actual root cause (Postgres logs, 2026-11-04):
--   "legal acceptance evidence is immutable"
-- Auth deletion cascades to legal_acceptances through its FK, but the
-- BEFORE DELETE trigger intentionally refuses to erase the evidence.
--
-- A legal acceptance is a historic, immutable fact. Its subject UUID must
-- continue to identify the original account even after that account no
-- longer exists in auth.users. It is a ledger identifier, not an active FK.
-- Removing this one FK means Auth deletion no longer tries to erase or
-- mutate legal_acceptances; its immutability trigger stays enabled.
--
-- All other FK cascades, preserved shared resources, and the existing
-- audit requirement for justified Admin/Super Admin deletion remain intact.
-- This migration neither deletes a user nor modifies an acceptance record.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_trigger
     WHERE tgrelid = 'public.legal_acceptances'::regclass
       AND tgname = 'trg_legal_acceptances_immutable'
       AND NOT tgisinternal
       AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'The legal acceptance immutability trigger must remain enabled.';
  END IF;
END
$$;

ALTER TABLE public.legal_acceptances
  DROP CONSTRAINT IF EXISTS legal_acceptances_user_id_fkey;

COMMENT ON COLUMN public.legal_acceptances.user_id IS
  'Immutable historical subject UUID. Intentionally not a foreign key to auth.users: acceptance evidence survives permanent user deletion, retaining its original subject identifier and document proof.';
