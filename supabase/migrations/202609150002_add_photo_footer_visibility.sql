alter table public.book_page_images
add column if not exists hide_footer boolean not null default false;

comment on column public.book_page_images.hide_footer is
'Whether the book footer and page number are hidden on this photo page.';
