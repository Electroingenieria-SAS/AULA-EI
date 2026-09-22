-- Aula EI: read-only self/certificate RPCs can rely on RLS.
alter function public.get_my_profile() security invoker;
alter function public.get_my_certificates() security invoker;
alter function public.get_certificate_by_code(text) security invoker;
alter function public.get_certificate_signatures(text) security invoker;
