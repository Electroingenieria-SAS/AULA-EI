-- Let active content creators assign published training without granting user admin.
-- Course publishing already uses can_manage_courses() and remains subject
-- to validate_course_before_publish (>=10 active valid exam questions).
-- Existing admin/learner policies remain unchanged.

CREATE OR REPLACE FUNCTION public.creator_assignment_allowed(p_course_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
 SELECT auth.uid() IS NOT NULL
  AND public.is_aula_active()
  AND public.normalize_aula_ei_role(auth.jwt()->'app_metadata'->>'aula_ei_role') = 'creador_contenido'
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = p_course_id AND c.status = 'published'
  );
$$;

CREATE OR REPLACE FUNCTION public.creator_assignment_target_allowed(p_course_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
 SELECT public.creator_assignment_allowed(p_course_id)
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.id = p_user_id
      AND p.is_active = true
      AND (u.raw_app_meta_data->>'aula_ei_active') = 'true'
      AND public.normalize_aula_ei_role(u.raw_app_meta_data->>'aula_ei_role')
          = public.normalize_aula_ei_role(p.role)
  );
$$;

-- Only the four fields necessary to select a training recipient are returned;
-- creators do not receive management access to full profiles.
CREATE OR REPLACE FUNCTION public.list_training_assignment_candidates()
RETURNS TABLE(id uuid, email text, full_name text, role text, is_active boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
 IF NOT (
   public.is_aula_active()
   AND public.normalize_aula_ei_role(auth.jwt()->'app_metadata'->>'aula_ei_role') = 'creador_contenido'
 ) THEN
   RAISE EXCEPTION 'No tienes autorización para consultar el directorio de asignaciones.' USING ERRCODE='42501';
 END IF;
 RETURN QUERY
 SELECT p.id,p.email,p.full_name,public.normalize_aula_ei_role(p.role),p.is_active
 FROM public.profiles p
 JOIN auth.users u ON u.id = p.id
 WHERE p.is_active = true
   AND u.raw_app_meta_data->>'aula_ei_active' = 'true'
   AND public.normalize_aula_ei_role(u.raw_app_meta_data->>'aula_ei_role')
     = public.normalize_aula_ei_role(p.role)
 ORDER BY p.full_name,p.id;
END;
$$;

REVOKE ALL ON FUNCTION public.creator_assignment_allowed(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.creator_assignment_target_allowed(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_training_assignment_candidates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.creator_assignment_allowed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creator_assignment_target_allowed(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_training_assignment_candidates() TO authenticated;

-- Add creator-specific policies; keep existing admin policies intact.
CREATE POLICY creator_enrollments_read ON public.enrollments
 FOR SELECT TO authenticated
 USING (public.creator_assignment_allowed(course_id));

CREATE POLICY creator_enrollments_assign ON public.enrollments
 FOR INSERT TO authenticated
 WITH CHECK (
   public.creator_assignment_target_allowed(course_id,user_id)
   AND assigned_by=auth.uid()
   AND status='assigned'
 );

CREATE POLICY creator_enrollments_edit ON public.enrollments
 FOR UPDATE TO authenticated
 USING (public.creator_assignment_allowed(course_id))
 WITH CHECK (public.creator_assignment_target_allowed(course_id,user_id));

-- RLS cannot compare OLD/NEW during UPDATE. Prevent forged completion,
-- reassignment of identities, and overriding learners' completed results.
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
   ) THEN
     RAISE EXCEPTION 'El creador de contenido no puede modificar estados de progreso o certificación.' USING ERRCODE='42501';
   END IF;
 END IF;
 RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_creator_training_enrollment_update() FROM PUBLIC;
DROP TRIGGER IF EXISTS guard_creator_training_enrollment_update ON public.enrollments;
CREATE TRIGGER guard_creator_training_enrollment_update
BEFORE UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.guard_creator_training_enrollment_update();
