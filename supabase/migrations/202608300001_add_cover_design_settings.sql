alter table public.book_covers
add column if not exists layout_style text not null default 'classic'
  check (layout_style in ('classic', 'minimal', 'romantic')),
add column if not exists title_position text not null default 'center'
  check (title_position in ('top', 'center', 'bottom')),
add column if not exists font_style text not null default 'playfair'
  check (font_style in ('playfair', 'forum', 'manrope')),
add column if not exists text_tone text not null default 'dark'
  check (text_tone in ('dark', 'light')),
add column if not exists overlay_strength numeric(3, 2) not null default 0
  check (overlay_strength between 0 and 0.6);
