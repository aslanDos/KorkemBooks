alter table public.books
  add column if not exists title_page_title_size smallint not null default 20;

alter table public.books
  drop constraint if exists books_title_page_title_size_check;

alter table public.books
  add constraint books_title_page_title_size_check
  check (title_page_title_size in (16, 18, 20, 22, 24));
