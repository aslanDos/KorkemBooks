alter table public.book_covers
add column if not exists cover_style text not null default 'solid'
check (cover_style in ('solid', 'template'));
