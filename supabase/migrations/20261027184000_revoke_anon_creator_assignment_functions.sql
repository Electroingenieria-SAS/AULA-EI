-- Platform defaults grant EXECUTE to anon as well as authenticated on new functions.
-- No anonymous caller needs the training assignment helpers.
REVOKE EXECUTE ON FUNCTION public.creator_assignment_allowed(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.creator_assignment_target_allowed(uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_training_assignment_candidates() FROM anon;
REVOKE EXECUTE ON FUNCTION public.guard_creator_training_enrollment_update() FROM anon;

-- Anonymous or PUBLIC must not be granted access to the restricted directory.
REVOKE ALL ON FUNCTION public.creator_assignment_allowed(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.creator_assignment_target_allowed(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_training_assignment_candidates() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_creator_training_enrollment_update() FROM PUBLIC;
