alter table public.book_covers
add column if not exists spine_author_name text not null default ''
check (char_length(spine_author_name) <= 120);

comment on column public.book_covers.spine_author_name is
'Optional author name for the spine only. Empty means use books.author_name.';
