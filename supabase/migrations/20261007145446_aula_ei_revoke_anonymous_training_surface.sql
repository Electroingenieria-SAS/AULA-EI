-- Aula EI production hardening: remove unnecessary anonymous table and helper access.

revoke all privileges on table
  public.job_positions,
  public.training_competencies,
  public.job_position_competencies,
  public.learning_paths,
  public.learning_path_courses,
  public.job_position_paths,
  public.profile_position_history,
  public.compliance_evidence,
  public.training_automation_rules,
  public.course_competencies,
  public.training_notifications,
  public.training_automation_runs
from anon;

revoke execute on function public.aula_is_aal2() from anon;
revoke execute on function public.normalize_aula_ei_role(text) from anon;
revoke execute on function public.touch_training_engine_updated_at() from anon;
