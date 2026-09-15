alter table public.book_covers
add column if not exists frame_style text not null default 'ver2'
check (frame_style in ('ver1', 'ver2'));
