alter table public.book_page_images
add column rounded_corners boolean not null default false;

comment on column public.book_page_images.rounded_corners is
'Whether the photo frame has rounded corners when displayed with page margins.';
