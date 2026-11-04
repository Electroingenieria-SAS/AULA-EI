-- Fix content creators' legitimate final-exam approval (Supabase HTTP 403).
-- submit_exam is SECURITY DEFINER, validates each official answer and score,
-- and writes exam_attempts + certificates in the same transaction *before*
-- setting the learner's enrollment to completed.
-- The enrollment trigger must recognize that genuine certified transition,
-- without allowing a creator to forge progress, scores or assign a certificate.

CREATE OR REPLACE FUNCTION public.guard_creator_training_enrollment_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
 IF public.is_aula_active() AND
    public.normalize_aula_ei_role(auth.jwt()->'app_metadata'->>'aula_ei_role')='creador_contenido' THEN
   IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.course_id IS DISTINCT FROM OLD.course_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
     RAISE EXCEPTION 'No puedes alterar la identidad o el responsable de una asignación.' USING ERRCODE='42501';
   END IF;
   IF OLD.status='completed' THEN
     RAISE EXCEPTION 'Las asignaciones completadas solo pueden revisarse, no modificarse.' USING ERRCODE='42501';
   END IF;
   IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
       (OLD.status IN ('expired','cancelled') AND NEW.status='assigned')
       OR (OLD.status IN ('assigned','in_progress') AND NEW.status='cancelled')
       OR (
         OLD.status IN ('assigned','expired')
         AND NEW.status='in_progress'
         AND NEW.user_id=auth.uid()
         AND EXISTS (
           SELECT 1
           FROM public.block_progress bp
           JOIN public.content_blocks b ON b.id=bp.block_id
           JOIN public.course_phases ph ON ph.id=b.phase_id
           WHERE bp.user_id=NEW.user_id
             AND bp.status='completed'
             AND ph.course_id=NEW.course_id
         )
       )
       OR (
         OLD.status IN ('assigned','in_progress','expired')
         AND NEW.status='completed'
         AND NEW.user_id=auth.uid()
         AND EXISTS (
           SELECT 1
           FROM public.certificates cert
           JOIN public.exam_attempts attempt ON attempt.id=cert.exam_attempt_id
             AND attempt.user_id=cert.user_id
             AND attempt.course_id=cert.course_id
           JOIN public.courses course ON course.id=cert.course_id
           WHERE cert.user_id=NEW.user_id
             AND cert.course_id=NEW.course_id
             AND attempt.passed=true
             AND attempt.score>=course.passing_score
             AND course.status='published'
         )
       )
   ) THEN
     RAISE EXCEPTION 'El creador de contenido no puede modificar estados de progreso o certificación.' USING ERRCODE='42501';
   END IF;
 END IF;
 RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_creator_training_enrollment_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_creator_training_enrollment_update() FROM anon, authenticated;
