create type public.book_production_status as enum ('writing', 'editing', 'printing', 'ready', 'delivery', 'received');

alter table public.books
add column production_status public.book_production_status not null default 'writing';

comment on column public.books.production_status is 'Operational production stage managed from the admin panel.';

create index books_production_status_idx on public.books (production_status, updated_at desc)
where deleted_at is null;
