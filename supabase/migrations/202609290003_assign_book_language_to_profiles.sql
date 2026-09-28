alter table public.profiles
add column book_language public.book_language;

-- Preserve the language of an existing active book when possible.
with existing_book_languages as (
  select distinct on (owner_id) owner_id, language
  from public.books
  where deleted_at is null
  order by owner_id, created_at
)
update public.profiles as profiles
set book_language = existing_book_languages.language
from existing_book_languages
where existing_book_languages.owner_id = profiles.id;

-- Existing users without a book keep the historical Russian default. New user
-- accounts receive an explicit language from the account creation form.
update public.profiles
set book_language = 'ru'
where role = 'user' and book_language is null;

comment on column public.profiles.book_language is
'Book language assigned by an administrator and used when the user creates a book.';

create function public.guard_user_book_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner_role public.app_role;
  assigned_type uuid;
  assigned_language public.book_language;
begin
  select role, book_type_id, book_language
  into owner_role, assigned_type, assigned_language
  from public.profiles
  where id = new.owner_id;

  if not found then
    raise exception 'Book owner profile was not found';
  end if;

  if owner_role = 'user' then
    if assigned_type is null or assigned_language is null then
      raise exception 'Recipient type and book language must be assigned by an administrator';
    end if;
    if new.type_id is distinct from assigned_type then
      raise exception 'Book recipient type must match the owner profile';
    end if;
    if new.language is distinct from assigned_language
      and coalesce(current_setting('app.changing_book_language', true), '') <> 'true'
    then
      raise exception 'Book language must match the owner profile';
    end if;
  end if;

  return new;
end;
$$;

create trigger books_guard_user_assignment
before insert or update of owner_id, type_id, language on public.books
for each row execute function public.guard_user_book_assignment();

revoke all on function public.guard_user_book_assignment() from public, anon, authenticated;
