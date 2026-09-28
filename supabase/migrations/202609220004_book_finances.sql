-- Operational finance ledger. Amounts are whole KZT; never derive received cash from order prices.
create table public.book_finances (
  book_id uuid primary key references public.books(id) on delete cascade,
  agreed_price_kzt numeric(12, 0) not null check (agreed_price_kzt between 0 and 999999999999),
  priced_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by_email text
);

create table public.book_finance_price_changes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  old_price_kzt numeric(12, 0),
  new_price_kzt numeric(12, 0) not null,
  changed_at timestamptz not null default now(),
  changed_by_email text
);

create function public.log_book_finance_price_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.agreed_price_kzt is distinct from old.agreed_price_kzt then
    insert into public.book_finance_price_changes(book_id, old_price_kzt, new_price_kzt, changed_by_email)
    values (new.book_id, case when tg_op = 'INSERT' then null else old.agreed_price_kzt end,
      new.agreed_price_kzt, new.updated_by_email);
  end if;
  return new;
end;
$$;

create trigger book_finance_price_audit
after insert or update of agreed_price_kzt on public.book_finances
for each row execute function public.log_book_finance_price_change();

create type public.book_finance_entry_kind as enum
  ('deposit', 'payment', 'refund', 'printing', 'delivery', 'other_cost');

create table public.book_finance_entries (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  kind public.book_finance_entry_kind not null,
  amount_kzt numeric(12, 0) not null check (amount_kzt between 1 and 999999999999),
  occurred_on date not null,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  recorded_by_email text,
  voided_at timestamptz,
  voided_by_email text,
  constraint finance_void_actor_check check (voided_at is null or voided_by_email is not null)
);

-- Only a reversal is allowed after recording an operation. Serialize balance changes
-- per book so two concurrent refunds cannot jointly exceed the money received.
create function public.guard_book_finance_entry()
returns trigger language plpgsql set search_path = '' as $$
declare
  current_balance numeric;
  entry_effect numeric;
begin
  if tg_op = 'INSERT' and (new.voided_at is not null or new.voided_by_email is not null) then
    raise exception 'finance_entry_must_start_active';
  end if;
  if tg_op = 'UPDATE' then
    if old.voided_at is not null
      or new.id is distinct from old.id
      or new.book_id is distinct from old.book_id
      or new.kind is distinct from old.kind
      or new.amount_kzt is distinct from old.amount_kzt
      or new.occurred_on is distinct from old.occurred_on
      or new.note is distinct from old.note
      or new.created_at is distinct from old.created_at
      or new.recorded_by_email is distinct from old.recorded_by_email
      or new.voided_at is null
      or new.voided_by_email is null then
      raise exception 'finance_entry_immutable';
    end if;
  end if;

  perform 1 from public.book_finances where book_id = new.book_id for update;
  if not found then
    raise exception 'finance_price_required';
  end if;

  if new.kind not in ('deposit', 'payment', 'refund') then
    return new;
  end if;

  select coalesce(sum(case
    when kind in ('deposit', 'payment') then amount_kzt
    when kind = 'refund' then -amount_kzt
    else 0 end), 0)
  into current_balance
  from public.book_finance_entries
  where book_id = new.book_id and voided_at is null;

  entry_effect := case when new.kind = 'refund' then -new.amount_kzt else new.amount_kzt end;
  if tg_op = 'INSERT' then
    current_balance := current_balance + entry_effect;
  else
    current_balance := current_balance - entry_effect;
  end if;
  if current_balance < 0 then
    raise exception 'finance_refund_exceeds_received';
  end if;
  return new;
end;
$$;

create trigger book_finance_entry_guard
before insert or update on public.book_finance_entries
for each row execute function public.guard_book_finance_entry();

create index book_finance_entries_book_date_idx
on public.book_finance_entries(book_id, occurred_on desc, created_at desc);
create index book_finance_entries_active_date_idx
on public.book_finance_entries(occurred_on, kind) where voided_at is null;

alter table public.book_finances enable row level security;
alter table public.book_finance_price_changes enable row level security;
alter table public.book_finance_entries enable row level security;
revoke all on public.book_finances, public.book_finance_price_changes, public.book_finance_entries from anon, authenticated;
grant select, insert, update on public.book_finances, public.book_finance_entries to service_role;
grant select, insert on public.book_finance_price_changes to service_role;
