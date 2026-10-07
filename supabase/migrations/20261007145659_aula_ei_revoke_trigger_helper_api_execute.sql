-- Trigger helper is internal and must not be exposed through the API.
revoke all on function public.touch_training_engine_updated_at() from authenticated, anon, public;
