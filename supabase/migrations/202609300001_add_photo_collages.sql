alter table public.book_page_images
  add column if not exists collage_layout text not null default 'single',
  add column if not exists collage_images jsonb not null default '[]'::jsonb;

alter table public.book_page_images
  drop constraint if exists book_page_images_collage_layout_check,
  drop constraint if exists book_page_images_collage_images_check,
  drop constraint if exists book_page_images_collage_shape_check;

alter table public.book_page_images
  add constraint book_page_images_collage_layout_check
    check (collage_layout in ('single', 'two_columns', 'two_rows', 'four_grid')),
  add constraint book_page_images_collage_images_check
    check (jsonb_typeof(collage_images) = 'array' and jsonb_array_length(collage_images) <= 3),
  add constraint book_page_images_collage_shape_check
    check (
      (collage_layout = 'single' and jsonb_array_length(collage_images) = 0)
      or (collage_layout in ('two_columns', 'two_rows') and jsonb_array_length(collage_images) = 1)
      or (collage_layout = 'four_grid' and jsonb_array_length(collage_images) = 3)
    );

comment on column public.book_page_images.collage_layout is
'Printable photo-page layout. The main image is slot 1; collage_images contains slots 2-4.';

comment on column public.book_page_images.collage_images is
'Additional private photo metadata for collage slots, including storage path and crop settings.';
