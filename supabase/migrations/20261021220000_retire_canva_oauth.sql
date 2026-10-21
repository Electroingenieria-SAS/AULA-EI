-- Canva/OAuth integration was retired. No accounts or auth requests were present
-- when migration was prepared. These storage tables are no longer used.
drop table if exists public.aula_canva_oauth_requests;
drop table if exists public.aula_canva_connections;
