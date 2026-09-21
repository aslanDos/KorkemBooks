alter table public.profiles
add column book_type_id uuid references public.book_types (id) on delete restrict;

-- Preserve the recipient type already chosen for existing users with a book.
update public.profiles as profiles
set book_type_id = books.type_id
from public.books as books
where books.owner_id = profiles.id
  and books.deleted_at is null;

comment on column public.profiles.book_type_id is
'Recipient type assigned by an administrator and used when the user creates a book.';

-- New accounts no longer carry a display name; phone is the account identifier.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone_e164)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone_e164', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'display_name'
where coalesce(raw_user_meta_data, '{}'::jsonb) ? 'display_name';

alter table public.profiles
drop column display_name;
