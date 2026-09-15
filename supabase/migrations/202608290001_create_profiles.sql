-- Application roles are kept outside auth.users so application data remains
-- independent from Supabase Auth internals.
create type public.app_role as enum ('admin', 'manager', 'user');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'user',
  display_name text check (char_length(display_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'ShamBooks application data linked one-to-one with auth.users.';
comment on column public.profiles.role is 'Application authorization role. Only trusted server code may change it.';

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Backfill users that existed before this migration.
insert into public.profiles (id, display_name)
select
  users.id,
  nullif(trim(coalesce(users.raw_user_meta_data ->> 'display_name', '')), '')
from auth.users as users
on conflict (id) do nothing;

-- This is the initial-project migration. Promote the sole existing account to
-- administrator; if multiple accounts already exist, promote nobody implicitly.
update public.profiles
set role = 'admin'
where id = (select id from public.profiles order by created_at, id limit 1)
  and (select count(*) from public.profiles) = 1;

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

-- Profiles are created by the auth trigger and managed by trusted server code.
-- In particular, clients receive no UPDATE grant and cannot change `role`.
revoke all on table public.profiles from anon;
revoke insert, update, delete on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
