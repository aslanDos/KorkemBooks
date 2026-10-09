alter table public.books
add column if not exists author_gender text,
add column if not exists recipient_gender text,
add column if not exists back_cover_text text not null default '';

alter table public.books
drop constraint if exists books_author_gender_check,
drop constraint if exists books_recipient_gender_check,
drop constraint if exists books_back_cover_text_check;

alter table public.books
add constraint books_author_gender_check
check (author_gender is null or author_gender in ('female', 'male')),
add constraint books_recipient_gender_check
check (recipient_gender is null or recipient_gender in ('female', 'male')),
add constraint books_back_cover_text_check
check (char_length(back_cover_text) <= 1000);

comment on column public.books.author_gender is
'Optional grammatical gender used when referring to the author.';
comment on column public.books.recipient_gender is
'Optional grammatical gender used when referring to the recipient.';
comment on column public.books.back_cover_text is
'Optional user-provided text printed on the back cover.';
