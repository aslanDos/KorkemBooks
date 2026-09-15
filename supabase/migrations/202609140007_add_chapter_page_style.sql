alter table public.books
  add column if not exists chapter_page_style text not null default 'default';

alter table public.books
  drop constraint if exists books_chapter_page_style_check;

alter table public.books
  add constraint books_chapter_page_style_check
  check (chapter_page_style in ('default', 'numeral', 'vertical'));
