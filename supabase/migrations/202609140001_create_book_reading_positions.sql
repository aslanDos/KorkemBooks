create table public.book_reading_positions (
  book_id uuid not null references public.books (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (book_id, owner_id)
);

comment on table public.book_reading_positions is 'The last question viewed by a book owner in the editor.';

create trigger book_reading_positions_set_updated_at
before update on public.book_reading_positions
for each row execute function public.set_updated_at();

alter table public.book_reading_positions enable row level security;

create policy "Users can read their own book position"
on public.book_reading_positions for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can create their own book position"
on public.book_reading_positions for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.questions
    join public.books on books.id = questions.book_id
    where questions.id = book_reading_positions.question_id
      and questions.book_id = book_reading_positions.book_id
      and books.owner_id = (select auth.uid())
      and books.deleted_at is null
  )
);

create policy "Users can update their own book position"
on public.book_reading_positions for update to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.questions
    join public.books on books.id = questions.book_id
    where questions.id = book_reading_positions.question_id
      and questions.book_id = book_reading_positions.book_id
      and books.owner_id = (select auth.uid())
      and books.deleted_at is null
  )
);

revoke all on table public.book_reading_positions from anon;
revoke delete on table public.book_reading_positions from authenticated;
grant select, insert, update on table public.book_reading_positions to authenticated;
