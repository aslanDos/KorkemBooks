alter table public.book_photo_texts
drop constraint if exists book_photo_texts_position_check;

update public.book_photo_texts
set position = case
  when position like 'top%' then 'top'
  when position like 'middle%' then 'middle'
  else 'bottom'
end
where position not in ('top', 'middle', 'bottom');

alter table public.book_photo_texts
add constraint book_photo_texts_position_check
check (position in ('top', 'middle', 'bottom'));

alter table public.book_photo_texts
drop column if exists text_style,
drop column if exists show_background;
