-- A book is an aggregate root. Admin hard deletion removes its order and all
-- other book-owned rows (questions, answers, pages, covers, delivery, finance).
alter table public.orders drop constraint if exists orders_book_id_fkey;
alter table public.orders
  add constraint orders_book_id_fkey
  foreign key (book_id) references public.books(id) on delete cascade;
