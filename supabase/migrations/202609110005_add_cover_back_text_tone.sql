alter table public.book_covers
add column if not exists back_text_tone text not null default 'dark'
check (back_text_tone in ('dark', 'light'));
