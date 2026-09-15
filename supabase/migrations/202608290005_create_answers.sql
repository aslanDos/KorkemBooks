create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.questions (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  answer_text text not null default '' check (char_length(answer_text) <= 50000),
  version integer not null default 1 check (version > 0),
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.answers is 'Original user answers. AI-generated prose must be stored separately.';

create trigger answers_set_updated_at
before update on public.answers
for each row execute function public.set_updated_at();

alter table public.answers enable row level security;

create policy "Users can read their own answers"
on public.answers for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can create their own answers"
on public.answers for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.questions
    join public.chapters on chapters.id = questions.chapter_id
    join public.books on books.id = chapters.book_id
    where questions.id = answers.question_id
      and books.id = answers.book_id
      and books.owner_id = (select auth.uid())
  )
);

create policy "Users can update their own answers"
on public.answers for update to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.questions
    join public.chapters on chapters.id = questions.chapter_id
    join public.books on books.id = chapters.book_id
    where questions.id = answers.question_id
      and books.id = answers.book_id
      and books.owner_id = (select auth.uid())
  )
);

revoke all on table public.answers from anon;
revoke delete on table public.answers from authenticated;
grant select, insert, update on table public.answers to authenticated;

create index answers_book_owner_idx on public.answers (book_id, owner_id);
