create table public.book_deliveries (
  book_id uuid primary key references public.books (id) on delete cascade,
  pickup boolean not null default false,
  city text not null default '' check (char_length(city) <= 120),
  address text not null default '' check (char_length(address) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint book_deliveries_address_required check (pickup or (char_length(trim(city)) > 0 and char_length(trim(address)) > 0))
);

create trigger book_deliveries_set_updated_at before update on public.book_deliveries
for each row execute function public.set_updated_at();

alter table public.book_deliveries enable row level security;
create policy "Admins can manage book delivery" on public.book_deliveries for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'));

revoke all on table public.book_deliveries from anon, authenticated;
grant select, insert, update on table public.book_deliveries to authenticated;
grant all on table public.book_deliveries to service_role;
