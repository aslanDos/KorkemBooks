create unique index books_one_active_book_per_owner
on public.books (owner_id)
where deleted_at is null;

comment on index public.books_one_active_book_per_owner is
'Temporarily limits each user to one non-deleted book.';
