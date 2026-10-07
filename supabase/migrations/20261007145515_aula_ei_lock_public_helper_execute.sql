-- PostgreSQL grants EXECUTE on functions to PUBLIC by default.
-- Remove that inherited surface and re-grant only the helpers needed by authenticated sessions.

revoke all on function public.aula_is_aal2() from public;
grant execute on function public.aula_is_aal2() to authenticated;

revoke all on function public.normalize_aula_ei_role(text) from public;
grant execute on function public.normalize_aula_ei_role(text) to authenticated;

revoke all on function public.touch_training_engine_updated_at() from public;
