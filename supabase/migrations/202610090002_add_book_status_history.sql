create table public.book_status_history (
  id bigint generated always as identity primary key,
  book_id uuid not null references public.books (id) on delete cascade,
  from_status public.book_production_status,
  to_status public.book_production_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index book_status_history_book_timeline_idx
on public.book_status_history (book_id, changed_at desc, id desc);

comment on table public.book_status_history is
'Immutable audit timeline for book production status changes.';

create function public.record_book_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.production_status is distinct from new.production_status then
    insert into public.book_status_history (book_id, from_status, to_status, changed_by)
    values (new.id, old.production_status, new.production_status, (select auth.uid()));
  end if;
  return new;
end;
$$;

insert into public.book_status_history (book_id, from_status, to_status, changed_at)
select id, null, production_status, created_at
from public.books
where deleted_at is null;

create trigger books_record_status_change
after update of production_status on public.books
for each row execute function public.record_book_status_change();

alter table public.book_status_history enable row level security;
revoke all on table public.book_status_history from anon, authenticated;
grant select, update on table public.book_status_history to service_role;
revoke all on function public.record_book_status_change() from public, anon, authenticated;
