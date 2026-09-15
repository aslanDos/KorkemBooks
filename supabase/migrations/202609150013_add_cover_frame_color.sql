alter table public.book_covers
add column if not exists frame_color text
check (frame_color is null or frame_color ~ '^#[0-9a-fA-F]{6}$');

comment on column public.book_covers.frame_color is
'Optional frame-only hex color. NULL follows the selected cover palette detail color.';
