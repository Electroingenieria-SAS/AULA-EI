-- Aula EI / SST: remove six obsolete exam questions requested in October 2026.
-- The published SST course is identified by its stable UUID, not by title.
-- Original visible positions: 4, 25, 27, 28, 29, 30 (sort_order 3,24,26,27,28,29).
-- Idempotent: production data was corrected directly on 2026-10-26.
-- Previous exam_attempts and certificates remain untouched.
-- Full backup of deleted questions and options: public.audit_logs,
-- action='exam_questions_removed_by_request', audit ID 2772.
DELETE FROM public.questions
WHERE course_id = '101974dd-8029-4165-abc7-0d7213f81cd1'::uuid
  AND id IN (
    '991aa3d9-c028-4e60-b4f7-488fa99d2202'::uuid,
    '33302592-87ef-4549-b5a8-416926a80fbc'::uuid,
    'd58f0c3c-266e-4eb0-8d4b-89f8efb18e7c'::uuid,
    '1908dc46-cb32-408f-ae67-f11da5fa596d'::uuid,
    '6c61a2d5-9c86-4603-abaf-bec027e64586'::uuid,
    '31208c88-c830-4dfc-a388-60915b4fdcb5'::uuid
  );
