-- A user may own several independent books, but every regular-user book must
-- be backed by an explicit entitlement issued by the team.

create table if not exists public.book_entitlements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  type_id uuid not null references public.book_types(id) on delete restrict,
  language public.book_language not null,
  book_id uuid unique references public.books(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  revoked_at timestamptz,
  constraint book_entitlements_consumption_check check (
    (book_id is null and consumed_at is null)
    or (book_id is not null and consumed_at is not null)
  )
);

create index if not exists book_entitlements_owner_idx
  on public.book_entitlements(owner_id);

create index if not exists book_entitlements_available_idx
  on public.book_entitlements(owner_id, created_at)
  where book_id is null and revoked_at is null;

-- Preserve every existing book as a consumed entitlement.
insert into public.book_entitlements (
  owner_id,
  type_id,
  language,
  book_id,
  created_at,
  consumed_at
)
select
  b.owner_id,
  b.type_id,
  b.language,
  b.id,
  b.created_at,
  b.created_at
from public.books b
where not exists (
  select 1
  from public.book_entitlements entitlement
  where entitlement.book_id = b.id
);

-- Profiles that were assigned a book but have not started it yet receive one
-- available entitlement.
insert into public.book_entitlements (owner_id, type_id, language)
select p.id, p.book_type_id, p.book_language
from public.profiles p
where p.role = 'user'
  and p.book_type_id is not null
  and p.book_language is not null
  and not exists (
    select 1
    from public.books b
    where b.owner_id = p.id
  )
  and not exists (
    select 1
    from public.book_entitlements entitlement
    where entitlement.owner_id = p.id
      and entitlement.book_id is null
      and entitlement.revoked_at is null
  );

alter table public.book_entitlements enable row level security;

drop policy if exists "Users can view their own book entitlements"
  on public.book_entitlements;
create policy "Users can view their own book entitlements"
  on public.book_entitlements
  for select
  using (owner_id = auth.uid());

drop policy if exists "Admins and managers can view book entitlements"
  on public.book_entitlements;
create policy "Admins and managers can view book entitlements"
  on public.book_entitlements
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );

grant select on public.book_entitlements to authenticated;

-- Retire the former one-book-per-user and profile-assignment guards.
drop trigger if exists books_regular_owner_limit on public.books;
drop function if exists public.guard_regular_book_limit();
drop trigger if exists profiles_guard_admin_book_limit on public.profiles;
drop function if exists public.guard_admin_role_demotion_with_books();
drop trigger if exists books_guard_user_assignment on public.books;
drop function if exists public.guard_user_book_assignment();

-- Regular users create books only through the entitlement-consuming function.
drop policy if exists "Users can create their own books" on public.books;
drop policy if exists "Admins can create books directly" on public.books;
create policy "Admins can create books directly"
  on public.books
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create or replace function public.guard_regular_book_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.app_role;
begin
  if new.owner_id is distinct from old.owner_id
    or new.type_id is distinct from old.type_id
    or new.language is distinct from old.language then
    select role into actor_role
    from public.profiles
    where id = auth.uid();

    if actor_role = 'user' then
      raise exception 'Book owner, type and language cannot be changed';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists books_guard_regular_identity on public.books;
create trigger books_guard_regular_identity
before update of owner_id, type_id, language on public.books
for each row execute function public.guard_regular_book_identity();

create or replace function public.create_book_from_entitlement(
  entitlement_id uuid,
  book_title text,
  book_author_name text,
  book_recipient_name text,
  book_recipient_gender text default null,
  book_author_gender text default null,
  book_back_cover_text text default null,
  book_writing_style text default 'warm_story'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_id uuid := auth.uid();
  entitlement public.book_entitlements%rowtype;
  new_book_id uuid;
begin
  if requester_id is null then
    raise exception 'Authentication required';
  end if;

  select * into entitlement
  from public.book_entitlements e
  where e.id = entitlement_id
    and e.owner_id = requester_id
    and e.book_id is null
    and e.consumed_at is null
    and e.revoked_at is null
  for update;

  if not found then
    raise exception 'Book entitlement is not available';
  end if;

  if not exists (
    select 1 from public.book_types bt
    where bt.id = entitlement.type_id and bt.is_active = true
  ) then
    raise exception 'Book type is not available';
  end if;

  insert into public.books (
    owner_id,
    type_id,
    language,
    title,
    author_name,
    recipient_name,
    recipient_gender,
    author_gender,
    back_cover_text,
    writing_style
  ) values (
    requester_id,
    entitlement.type_id,
    entitlement.language,
    trim(book_title),
    trim(book_author_name),
    trim(book_recipient_name),
    nullif(trim(book_recipient_gender), ''),
    nullif(trim(book_author_gender), ''),
    coalesce(trim(book_back_cover_text), ''),
    book_writing_style
  )
  returning id into new_book_id;

  update public.book_entitlements
  set book_id = new_book_id,
      consumed_at = now()
  where id = entitlement.id;

  return new_book_id;
end;
$$;

revoke all on function public.create_book_from_entitlement(
  uuid, text, text, text, text, text, text, text
) from public;
grant execute on function public.create_book_from_entitlement(
  uuid, text, text, text, text, text, text, text
) to authenticated;

comment on table public.book_entitlements is
  'One independently issued book slot; consuming it creates exactly one book.';
