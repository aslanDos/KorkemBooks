alter table public.book_covers
add column if not exists show_frame boolean not null default true;
