alter table public.book_page_images
add column if not exists placement text not null default 'after';

alter table public.book_page_images
drop constraint if exists book_page_images_placement_check;

alter table public.book_page_images
add constraint book_page_images_placement_check
check (placement in ('before', 'after'));

comment on column public.book_page_images.placement is
'Places the independent photo page before or after its anchor question page.';
