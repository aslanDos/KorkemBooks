create table public.book_answer_originals (
  book_id uuid not null references public.books(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  original_answer text not null check (char_length(original_answer) <= 50000),
  original_format jsonb not null default '{"version":1,"marks":[]}'::jsonb,
  submitted_at timestamptz not null default now(),
  primary key (book_id, question_id)
);

create table public.answer_revisions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  original_answer text not null check (char_length(original_answer) <= 50000),
  edited_answer text not null check (char_length(edited_answer) <= 50000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (original_answer is distinct from edited_answer),
  check ((status = 'pending' and reviewed_at is null) or (status <> 'pending' and reviewed_at is not null))
);

create unique index answer_revisions_one_pending_idx
on public.answer_revisions(book_id, question_id) where status = 'pending';
create index answer_revisions_book_history_idx
on public.answer_revisions(book_id, created_at desc);

comment on table public.book_answer_originals is 'Immutable owner answer snapshots captured when a book is submitted for editing.';
comment on table public.answer_revisions is 'Editor proposals. Only an accepted proposal is copied to answers.';

alter table public.book_answer_originals enable row level security;
alter table public.answer_revisions enable row level security;

create policy "Owners can read submitted answer originals"
on public.book_answer_originals for select to authenticated
using (exists (
  select 1 from public.books
  where books.id = book_answer_originals.book_id
    and books.owner_id = (select auth.uid())
    and books.deleted_at is null
));

create policy "Owners can read answer revisions"
on public.answer_revisions for select to authenticated
using (exists (
  select 1 from public.books
  where books.id = answer_revisions.book_id
    and books.owner_id = (select auth.uid())
    and books.deleted_at is null
));

revoke all on public.book_answer_originals, public.answer_revisions from anon, authenticated;
grant select on public.book_answer_originals, public.answer_revisions to authenticated;
grant select, insert on public.book_answer_originals to service_role;
grant select, insert, update on public.answer_revisions to service_role;

create function public.capture_book_answer_originals(target_book_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare inserted_count integer;
begin
  insert into public.book_answer_originals(book_id, question_id, original_answer, original_format)
  select a.book_id, a.question_id, a.answer_text, a.answer_format
  from public.answers a
  join public.questions q on q.id = a.question_id and q.book_id = a.book_id
  where a.book_id = target_book_id and q.deleted_at is null and a.answer_text ~ '[^[:space:]]'
  on conflict (book_id, question_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create function public.capture_originals_on_editing()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.production_status = 'writing' and new.production_status = 'editing' then
    perform public.capture_book_answer_originals(new.id);
  end if;
  return new;
end;
$$;

create trigger books_capture_answer_originals
after update of production_status on public.books
for each row execute function public.capture_originals_on_editing();

create function public.guard_submitted_answers()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_book_id uuid;
declare target_status public.book_production_status;
begin
  target_book_id := case when tg_op = 'DELETE' then old.book_id else new.book_id end;
  select production_status into target_status from public.books where id = target_book_id for share;
  if target_status <> 'writing'
    and current_setting('app.answer_revision_decision', true) is distinct from 'true' then
    raise exception 'Submitted answers can only change after owner accepts a revision';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger answers_guard_submitted_original
before insert or update or delete on public.answers
for each row execute function public.guard_submitted_answers();

create function public.import_answer_revisions(target_book_id uuid, revision_rows jsonb, actor_id uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  import_batch_id uuid := gen_random_uuid();
  imported_count integer;
begin
  if jsonb_typeof(revision_rows) <> 'array' or jsonb_array_length(revision_rows) = 0 then
    raise exception 'Revision import must be a non-empty JSON array';
  end if;
  perform 1 from public.books
  where id = target_book_id and deleted_at is null and production_status = 'editing'
  for update;
  if not found then raise exception 'Book is not available for revision import'; end if;

  if exists (
    select 1 from jsonb_to_recordset(revision_rows) as r(question_id uuid, edited_answer text)
    group by r.question_id having count(*) > 1
  ) then raise exception 'Duplicate questionId'; end if;

  if exists (
    select 1 from jsonb_to_recordset(revision_rows) as r(question_id uuid, edited_answer text)
    left join public.book_answer_originals o
      on o.book_id = target_book_id and o.question_id = r.question_id
    where r.question_id is null or o.question_id is null or r.edited_answer is null
      or char_length(r.edited_answer) > 50000
  ) then raise exception 'Unknown questionId or invalid answer'; end if;

  if exists (
    select 1 from public.answer_revisions ar
    join jsonb_to_recordset(revision_rows) as r(question_id uuid) on r.question_id = ar.question_id
    where ar.book_id = target_book_id and ar.status = 'pending'
  ) then raise exception 'Some questions already have pending revisions'; end if;

  insert into public.answer_revisions(batch_id, book_id, question_id, original_answer, edited_answer, created_by)
  select import_batch_id, target_book_id, r.question_id, o.original_answer, r.edited_answer, actor_id
  from jsonb_to_recordset(revision_rows) as r(question_id uuid, edited_answer text)
  join public.book_answer_originals o on o.book_id = target_book_id and o.question_id = r.question_id
  where o.original_answer is distinct from r.edited_answer;
  get diagnostics imported_count = row_count;
  return imported_count;
end;
$$;

create function public.guard_pending_answer_revisions()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.production_status = 'editing' and new.production_status <> 'editing'
    and exists (select 1 from public.answer_revisions where book_id = new.id and status = 'pending') then
    raise exception 'Pending answer revisions require an owner decision';
  end if;
  return new;
end;
$$;

create trigger books_guard_pending_answer_revisions
before update of production_status on public.books
for each row execute function public.guard_pending_answer_revisions();

create function public.review_answer_revision(target_revision_id uuid, target_owner_id uuid, decision text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare revision public.answer_revisions%rowtype;
begin
  if decision not in ('accepted', 'rejected') then return false; end if;
  select ar.* into revision from public.answer_revisions ar
  join public.books b on b.id = ar.book_id
  where ar.id = target_revision_id and ar.status = 'pending'
    and b.owner_id = target_owner_id and b.production_status = 'editing' and b.deleted_at is null
  for update of ar;
  if revision.id is null then return false; end if;

  if decision = 'accepted' then
    perform set_config('app.answer_revision_decision', 'true', true);
    update public.answers set answer_text = revision.edited_answer,
      answer_format = '{"version":1,"marks":[]}'::jsonb,
      answered_at = case when revision.edited_answer ~ '[^[:space:]]' then now() else null end,
      version = version + 1
    where book_id = revision.book_id and question_id = revision.question_id;
  end if;
  update public.answer_revisions set status = decision, reviewed_at = now() where id = revision.id;
  return true;
end;
$$;

create function public.review_all_answer_revisions(target_book_id uuid, target_owner_id uuid, decision text)
returns integer language plpgsql security definer set search_path = '' as $$
declare reviewed_count integer;
begin
  if decision not in ('accepted', 'rejected') then return 0; end if;
  perform 1 from public.books where id = target_book_id and owner_id = target_owner_id
    and production_status = 'editing' and deleted_at is null for update;
  if not found then return 0; end if;

  if decision = 'accepted' then
    perform set_config('app.answer_revision_decision', 'true', true);
    update public.answers a set answer_text = ar.edited_answer,
      answer_format = '{"version":1,"marks":[]}'::jsonb,
      answered_at = case when ar.edited_answer ~ '[^[:space:]]' then now() else null end,
      version = a.version + 1
    from public.answer_revisions ar
    where ar.book_id = target_book_id and ar.status = 'pending'
      and a.book_id = ar.book_id and a.question_id = ar.question_id;
  end if;
  update public.answer_revisions set status = decision, reviewed_at = now()
  where book_id = target_book_id and status = 'pending';
  get diagnostics reviewed_count = row_count;
  return reviewed_count;
end;
$$;

revoke all on function public.capture_book_answer_originals(uuid), public.capture_originals_on_editing(), public.guard_submitted_answers(), public.guard_pending_answer_revisions(),
  public.import_answer_revisions(uuid, jsonb, uuid), public.review_answer_revision(uuid, uuid, text),
  public.review_all_answer_revisions(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.capture_book_answer_originals(uuid), public.import_answer_revisions(uuid, jsonb, uuid),
  public.review_answer_revision(uuid, uuid, text), public.review_all_answer_revisions(uuid, uuid, text) to service_role;
