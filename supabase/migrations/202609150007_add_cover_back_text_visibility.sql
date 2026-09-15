alter table public.book_covers
add column if not exists show_back_text boolean not null default true;
