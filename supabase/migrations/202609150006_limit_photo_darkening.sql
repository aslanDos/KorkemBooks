update public.book_photo_texts
set image_darkening = 50
where image_darkening > 50;

alter table public.book_photo_texts
drop constraint if exists book_photo_texts_image_darkening_check;

alter table public.book_photo_texts
add constraint book_photo_texts_image_darkening_check
check (image_darkening between 0 and 50);
