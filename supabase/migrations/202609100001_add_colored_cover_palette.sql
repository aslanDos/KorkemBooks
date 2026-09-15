alter table public.book_covers
add column if not exists color_key text not null default 'wine'
  check (color_key in ('wine', 'berry', 'terracotta', 'navy', 'umber', 'olive', 'ochre'));
