alter table public.books
  add column if not exists show_footer_author boolean not null default true,
  add column if not exists show_footer_title boolean not null default true;
