-- One immutable recipient-specific catalog, independent of user chapters.
create table public.question_catalog (
 id uuid primary key default gen_random_uuid(),
 book_type_id uuid not null references public.book_types(id),
 number integer not null check (number between 1 and 100),
 prompt text not null check (char_length(prompt) between 1 and 1000),
 unique(book_type_id, number)
);
alter table public.question_catalog enable row level security;
create policy "Authenticated users read the question catalog" on public.question_catalog for select to authenticated using (true);
revoke all on public.question_catalog from anon, authenticated;
grant select on public.question_catalog to authenticated;

alter table public.questions add column book_id uuid references public.books(id) on delete cascade;
update public.questions q set book_id = c.book_id from public.chapters c where c.id = q.chapter_id;
alter table public.questions alter column book_id set not null;
alter table public.questions alter column chapter_id drop not null;
alter table public.questions add column catalog_id uuid references public.question_catalog(id);
-- Includes unassigned and previously hidden questions: removing a placement never creates another copy.
create unique index questions_book_catalog_idx on public.questions(book_id, catalog_id) where catalog_id is not null;
create index questions_book_pool_idx on public.questions(book_id) where chapter_id is null and deleted_at is null;
