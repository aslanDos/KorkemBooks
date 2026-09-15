alter table public.book_photo_texts
add column if not exists image_darkening smallint not null default 0,
add column if not exists text_shadow smallint not null default 40;

alter table public.book_photo_texts
drop constraint if exists book_photo_texts_image_darkening_check,
drop constraint if exists book_photo_texts_text_shadow_check;

alter table public.book_photo_texts
add constraint book_photo_texts_image_darkening_check
check (image_darkening between 0 and 70),
add constraint book_photo_texts_text_shadow_check
check (text_shadow between 0 and 100);
