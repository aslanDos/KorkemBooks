alter table public.books
add column if not exists writing_style text not null default 'warm_story';

alter table public.books
drop constraint if exists books_writing_style_check;

alter table public.books
add constraint books_writing_style_check
check (writing_style in ('live_story', 'warm_story', 'literary_story'));

comment on column public.books.writing_style is 'Preferred tone used by the writing assistant; changing it does not rewrite saved answers.';
