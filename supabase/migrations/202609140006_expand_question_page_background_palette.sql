alter table public.book_question_pages
drop constraint book_question_pages_background_style_check;

alter table public.book_question_pages
add constraint book_question_pages_background_style_check
check (background_style in (
  'white', 'primary', 'wine', 'berry', 'terracotta', 'navy', 'umber', 'olive', 'ochre'
));
