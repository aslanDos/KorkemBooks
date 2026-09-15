alter table public.books drop constraint if exists books_page_font_check;
update public.books set page_font = 'literata';
alter table public.books alter column page_font set default 'literata';
alter table public.books add constraint books_page_font_check check (page_font in ('literata'));
