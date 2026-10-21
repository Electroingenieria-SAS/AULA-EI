-- OAuth connections are never exposed through the Data API.
-- Service-role only; tokens are AES-GCM encrypted before insertion.
create table if not exists public.aula_canva_oauth_requests (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_verifier text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.aula_canva_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_cipher text not null,
  refresh_cipher text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists idx_aula_canva_oauth_expires on public.aula_canva_oauth_requests(expires_at);
alter table public.aula_canva_oauth_requests enable row level security;
alter table public.aula_canva_connections enable row level security;
revoke all on table public.aula_canva_oauth_requests from public, anon, authenticated;
revoke all on table public.aula_canva_connections from public, anon, authenticated;
grant select, insert, update, delete on table public.aula_canva_oauth_requests to service_role;
grant select, insert, update, delete on table public.aula_canva_connections to service_role;
-- Without any policies there are no direct client reads or writes.
