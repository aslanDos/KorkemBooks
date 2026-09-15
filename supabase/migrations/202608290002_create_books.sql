create type public.book_status as enum ('draft', 'in_progress', 'completed', 'archived');

create table public.book_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 80),
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  type_id uuid not null references public.book_types (id),
  title text not null check (char_length(title) between 1 and 200),
  author_name text not null check (char_length(author_name) between 1 and 120),
  recipient_name text not null check (char_length(recipient_name) between 1 and 120),
  status public.book_status not null default 'draft',
  progress smallint not null default 0 check (progress between 0 and 100),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.book_types is 'Recipient categories used to choose a default question template.';
comment on column public.books.recipient_name is 'Name of the person receiving the finished book.';
comment on column public.books.deleted_at is 'Soft-delete timestamp; non-null books are hidden from the application.';

create trigger book_types_set_updated_at
before update on public.book_types
for each row execute function public.set_updated_at();

create trigger books_set_updated_at
before update on public.books
for each row execute function public.set_updated_at();

insert into public.book_types (slug, name, sort_order) values
  ('girlfriend', 'Девушке', 10),
  ('boyfriend', 'Парню', 20),
  ('mother', 'Маме', 30),
  ('father', 'Папе', 40);

alter table public.book_types enable row level security;
alter table public.books enable row level security;

create policy "Authenticated users can read active book types"
on public.book_types
for select
to authenticated
using (is_active = true);

create policy "Users can read their own books"
on public.books
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can create their own books"
on public.books
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Users can update their own books"
on public.books
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

revoke all on table public.book_types from anon;
revoke insert, update, delete on table public.book_types from authenticated;
grant select on table public.book_types to authenticated;

revoke all on table public.books from anon;
revoke delete on table public.books from authenticated;
grant select, insert, update on table public.books to authenticated;

create index books_owner_updated_idx on public.books (owner_id, updated_at desc)
where deleted_at is null;
