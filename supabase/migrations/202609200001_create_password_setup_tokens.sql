create table public.password_setup_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  purpose text not null check (purpose in ('invite', 'reset')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint password_setup_tokens_hash_format check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint password_setup_tokens_expiry check (expires_at > created_at)
);

comment on table public.password_setup_tokens is
'Single-use, server-managed links for initial password setup and admin-requested password resets.';

create index password_setup_tokens_user_created_idx
on public.password_setup_tokens (user_id, created_at desc);

create unique index password_setup_tokens_one_active_per_user_idx
on public.password_setup_tokens (user_id)
where used_at is null;

alter table public.password_setup_tokens enable row level security;

-- Only the server-side service role may create, inspect, or consume these tokens.
revoke all on table public.password_setup_tokens from anon, authenticated;
grant select, insert, update, delete on table public.password_setup_tokens to service_role;
