-- Fix HTTP 403 during `complete_block` for active content creators taking a course.
-- The prior creator-only enrollment guard rejected assigned -> in_progress
-- even after the trusted RPC saved the learner's first completed block.
-- Only allow the student's own enrollment to start, and only if the same
-- course has already recorded at least one completed block in the database.
-- All existing identity, cancellation, reassignment and completion rules remain.

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
   ) THEN
     RAISE EXCEPTION 'El creador de contenido no puede modificar estados de progreso o certificación.' USING ERRCODE='42501';
   END IF;
 END IF;
 RETURN NEW;
END;
$$;

-- No direct RPC execution: SECURITY DEFINER is called only by its trigger.
REVOKE ALL ON FUNCTION public.guard_creator_training_enrollment_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_creator_training_enrollment_update() FROM anon, authenticated;
