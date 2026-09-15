alter table public.book_page_images
add column if not exists crop_x numeric(6, 3) not null default 0,
add column if not exists crop_y numeric(6, 3) not null default 0,
add column if not exists crop_scale numeric(5, 3) not null default 1;

alter table public.book_page_images
drop constraint if exists book_page_images_crop_x_check,
drop constraint if exists book_page_images_crop_y_check,
drop constraint if exists book_page_images_crop_scale_check;

alter table public.book_page_images
add constraint book_page_images_crop_x_check check (crop_x between -50 and 50),
add constraint book_page_images_crop_y_check check (crop_y between -50 and 50),
add constraint book_page_images_crop_scale_check check (crop_scale between 1 and 3);

comment on column public.book_page_images.crop_x is 'Horizontal photo offset as a percentage of the page image area.';
comment on column public.book_page_images.crop_y is 'Vertical photo offset as a percentage of the page image area.';
comment on column public.book_page_images.crop_scale is 'Manual scale applied after contain or cover fitting.';
