alter table public.book_question_pages
add column background_style text not null default 'white'
check (background_style in ('white', 'primary'));

comment on column public.book_question_pages.background_style is
'Page background used by photo and blank question pages.';
