create table public.book_type_chapter_templates (
  id uuid primary key default gen_random_uuid(),
  book_type_id uuid not null references public.book_types (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_type_id, position)
);

create table public.book_type_question_templates (
  id uuid primary key default gen_random_uuid(),
  chapter_template_id uuid not null references public.book_type_chapter_templates (id) on delete cascade,
  prompt text not null check (char_length(prompt) between 1 and 1000),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chapter_template_id, position)
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  template_id uuid references public.book_type_chapter_templates (id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  template_id uuid references public.book_type_question_templates (id) on delete set null,
  prompt text not null check (char_length(prompt) between 1 and 1000),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.book_type_chapter_templates is 'Immutable chapter blueprints for each recipient type.';
comment on table public.book_type_question_templates is 'Immutable default question blueprints.';
comment on table public.chapters is 'Editable chapter copies belonging to a specific book.';
comment on table public.questions is 'Editable question copies; template_id is null for user-created questions.';

create trigger chapter_templates_set_updated_at before update on public.book_type_chapter_templates
for each row execute function public.set_updated_at();
create trigger question_templates_set_updated_at before update on public.book_type_question_templates
for each row execute function public.set_updated_at();
create trigger chapters_set_updated_at before update on public.chapters
for each row execute function public.set_updated_at();
create trigger questions_set_updated_at before update on public.questions
for each row execute function public.set_updated_at();

create function public.instantiate_book_template(target_book_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.chapters (book_id, template_id, title, position)
  select books.id, templates.id, templates.title, templates.position
  from public.books as books
  join public.book_type_chapter_templates as templates
    on templates.book_type_id = books.type_id
  where books.id = target_book_id
    and books.deleted_at is null
  on conflict (book_id, template_id) where template_id is not null do nothing;

  insert into public.questions (chapter_id, template_id, prompt, position)
  select chapters.id, templates.id, templates.prompt, templates.position
  from public.chapters as chapters
  join public.book_type_question_templates as templates
    on templates.chapter_template_id = chapters.template_id
  where chapters.book_id = target_book_id
    and chapters.deleted_at is null
  on conflict (chapter_id, template_id) where template_id is not null do nothing;
end;
$$;

create function public.handle_new_book()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.instantiate_book_template(new.id);
  return new;
end;
$$;

create trigger on_book_created
after insert on public.books
for each row execute function public.handle_new_book();

alter table public.book_type_chapter_templates enable row level security;
alter table public.book_type_question_templates enable row level security;
alter table public.chapters enable row level security;
alter table public.questions enable row level security;

create policy "Authenticated users can read chapter templates"
on public.book_type_chapter_templates for select to authenticated using (true);
create policy "Authenticated users can read question templates"
on public.book_type_question_templates for select to authenticated using (true);

create policy "Users can read chapters in their books"
on public.chapters for select to authenticated
using (exists (select 1 from public.books where books.id = chapters.book_id and books.owner_id = (select auth.uid())));
create policy "Users can add chapters to their books"
on public.chapters for insert to authenticated
with check (exists (select 1 from public.books where books.id = chapters.book_id and books.owner_id = (select auth.uid())));
create policy "Users can update chapters in their books"
on public.chapters for update to authenticated
using (exists (select 1 from public.books where books.id = chapters.book_id and books.owner_id = (select auth.uid())))
with check (exists (select 1 from public.books where books.id = chapters.book_id and books.owner_id = (select auth.uid())));

create policy "Users can read questions in their books"
on public.questions for select to authenticated
using (exists (
  select 1 from public.chapters
  join public.books on books.id = chapters.book_id
  where chapters.id = questions.chapter_id and books.owner_id = (select auth.uid())
));
create policy "Users can add questions to their books"
on public.questions for insert to authenticated
with check (exists (
  select 1 from public.chapters
  join public.books on books.id = chapters.book_id
  where chapters.id = questions.chapter_id and books.owner_id = (select auth.uid())
));
create policy "Users can update questions in their books"
on public.questions for update to authenticated
using (exists (
  select 1 from public.chapters
  join public.books on books.id = chapters.book_id
  where chapters.id = questions.chapter_id and books.owner_id = (select auth.uid())
))
with check (exists (
  select 1 from public.chapters
  join public.books on books.id = chapters.book_id
  where chapters.id = questions.chapter_id and books.owner_id = (select auth.uid())
));

revoke all on table public.book_type_chapter_templates, public.book_type_question_templates from anon;
revoke insert, update, delete on table public.book_type_chapter_templates, public.book_type_question_templates from authenticated;
grant select on table public.book_type_chapter_templates, public.book_type_question_templates to authenticated;

revoke all on table public.chapters, public.questions from anon;
revoke delete on table public.chapters, public.questions from authenticated;
grant select, insert, update on table public.chapters, public.questions to authenticated;

revoke all on function public.instantiate_book_template(uuid) from public, anon, authenticated;
revoke all on function public.handle_new_book() from public, anon, authenticated;

create index chapter_templates_type_position_idx on public.book_type_chapter_templates (book_type_id, position);
create index question_templates_chapter_position_idx on public.book_type_question_templates (chapter_template_id, position);
create unique index chapters_book_template_idx on public.chapters (book_id, template_id) where template_id is not null;
create unique index questions_chapter_template_idx on public.questions (chapter_id, template_id) where template_id is not null;
create index chapters_book_position_idx on public.chapters (book_id, position) where deleted_at is null;
create index questions_chapter_position_idx on public.questions (chapter_id, position) where deleted_at is null;
