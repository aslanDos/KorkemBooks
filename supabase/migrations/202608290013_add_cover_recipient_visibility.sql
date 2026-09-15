alter table public.book_covers
add column if not exists show_recipient boolean not null default true;
