alter table public.profiles
add column activated_at timestamptz;

update public.profiles as profiles
set activated_at = users.last_sign_in_at
from auth.users as users
where users.id = profiles.id
  and users.last_sign_in_at is not null;

create index profiles_admin_activation_list_idx
on public.profiles (activated_at, created_at desc);

comment on column public.profiles.activated_at is
'First successful application sign-in. Used for indexed admin filtering and pagination without scanning auth.users.';
