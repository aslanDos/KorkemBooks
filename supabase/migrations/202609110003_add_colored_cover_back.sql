alter table public.book_covers
add column if not exists colored_back boolean not null default false;
