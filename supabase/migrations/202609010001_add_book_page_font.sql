alter table public.books
add column if not exists page_font text not null default 'cormorant-garamond'
  check (page_font in ('cormorant-garamond'));
