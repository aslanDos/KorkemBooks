alter table public.books
  add column if not exists page_background_style text not null default 'white';

update public.books as book
set page_background_style = coalesce((
  select page.background_style
  from public.book_question_pages as page
  where page.book_id = book.id
    and page.background_style <> 'white'
  order by page.updated_at desc, page.id
  limit 1
), 'white');

alter table public.books
  drop constraint if exists books_page_background_style_check;

alter table public.books
  add constraint books_page_background_style_check
  check (page_background_style in (
    'white', 'primary', 'wine', 'berry', 'terracotta', 'navy', 'umber', 'olive', 'ochre'
  ));

comment on column public.books.page_background_style is
'Main background for photo and blank pages throughout the book.';
