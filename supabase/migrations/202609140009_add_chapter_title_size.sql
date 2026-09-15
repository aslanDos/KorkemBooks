alter table public.books
  add column if not exists chapter_title_size smallint not null default 10;

alter table public.books
  drop constraint if exists books_chapter_title_size_check;

alter table public.books
  add constraint books_chapter_title_size_check
  check (chapter_title_size in (6, 8, 10, 12, 14));
