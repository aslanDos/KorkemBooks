-- These recipient categories are no longer offered. Their books are removed as
-- complete aggregates; dependent questions, answers, orders and production data
-- are deleted by their existing cascading foreign keys.
update public.profiles
set book_type_id = null
where book_type_id in (
  select id from public.book_types where slug in ('son', 'daughter')
);

delete from public.books
where type_id in (
  select id from public.book_types where slug in ('son', 'daughter')
);

delete from public.question_catalog
where book_type_id in (
  select id from public.book_types where slug in ('son', 'daughter')
);

delete from public.book_types
where slug in ('son', 'daughter');
