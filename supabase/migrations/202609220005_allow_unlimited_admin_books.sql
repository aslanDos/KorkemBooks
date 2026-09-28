-- Replace the owner-wide unique index with a role-aware, serialized limit.
-- Administrators may own any number of active books; other roles remain at one.
drop index if exists public.books_one_active_book_per_owner;

create function public.guard_regular_book_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_role public.app_role;
begin
  if new.deleted_at is not null then return new; end if;

  -- Lock the profile to serialize concurrent creations for the same owner.
  select role into owner_role
  from public.profiles
  where id = new.owner_id
  for update;

  if owner_role = 'admin' then return new; end if;

  if exists (
    select 1 from public.books
    where owner_id = new.owner_id
      and deleted_at is null
      and id is distinct from new.id
  ) then
    raise exception 'books_one_active_book_per_owner'
      using errcode = '23505', constraint = 'books_one_active_book_per_owner';
  end if;
  return new;
end;
$$;

create trigger books_regular_owner_limit
before insert or update of owner_id, deleted_at on public.books
for each row execute function public.guard_regular_book_limit();

-- An admin with multiple books cannot be demoted while more than one is active.
create function public.guard_admin_role_demotion_with_books()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin' and new.role <> 'admin' and (
    select count(*) from public.books where owner_id = old.id and deleted_at is null
  ) > 1 then
    raise exception 'admin_has_multiple_active_books';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_admin_book_limit
before update of role on public.profiles
for each row execute function public.guard_admin_role_demotion_with_books();

revoke all on function public.guard_regular_book_limit() from public, anon, authenticated;
revoke all on function public.guard_admin_role_demotion_with_books() from public, anon, authenticated;
