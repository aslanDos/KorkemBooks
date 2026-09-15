alter table public.book_covers
add column if not exists title_size smallint not null default 24
check (title_size in (16, 20, 24, 28, 32)),
add column if not exists author_size smallint not null default 10
check (author_size in (8, 10, 12, 14, 16));
