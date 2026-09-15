create type public.order_status as enum ('new', 'editing', 'printing', 'ready', 'shipped', 'cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('KB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  book_id uuid not null references public.books (id) on delete restrict,
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 120),
  customer_email text not null,
  status public.order_status not null default 'new',
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
alter table public.orders enable row level security;

create policy "Admins can manage orders" on public.orders for all to authenticated
using (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'))
with check (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'admin'));

create policy "Managers can read and update orders" on public.orders for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role in ('admin', 'manager')));

revoke all on table public.orders from anon;
grant select, insert, update on table public.orders to authenticated;
