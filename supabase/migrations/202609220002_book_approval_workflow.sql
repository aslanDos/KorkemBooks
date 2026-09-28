create table public.book_approval_requests (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested')),
  feedback text check (char_length(feedback) <= 2000),
  requested_at timestamptz not null default now(),
  decided_at timestamptz
);

create unique index book_approval_one_pending_idx on public.book_approval_requests(book_id) where status = 'pending';
create index book_approval_history_idx on public.book_approval_requests(book_id, requested_at desc);

alter table public.book_approval_requests enable row level security;
revoke all on public.book_approval_requests from anon, authenticated;
grant select, insert, update on public.book_approval_requests to service_role;

-- Keep the exact content submitted for approval unchanged until the book is
-- returned to editing. This applies to service-role admin writes as well.
create function public.guard_book_approval_content()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target_book_id uuid;
  target_status public.book_production_status;
begin
  target_book_id := case when tg_op = 'DELETE' then old.book_id else new.book_id end;
  select production_status into target_status from public.books where id = target_book_id for share;
  if target_status in ('approval', 'printing', 'ready', 'delivery', 'received') then
    raise exception 'Approved book content is locked';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function public.guard_book_approval_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.production_status in ('approval', 'printing', 'ready', 'delivery', 'received')
     and (to_jsonb(new) - 'production_status' - 'updated_at') is distinct from
         (to_jsonb(old) - 'production_status' - 'updated_at') then
    raise exception 'Approved book details are locked';
  end if;
  if old.production_status in ('writing', 'editing', 'approval')
     and new.production_status in ('printing', 'ready', 'delivery', 'received')
     and current_setting('app.book_approval_decision', true) is distinct from 'true' then
    raise exception 'Book requires owner approval before production';
  end if;
  return new;
end;
$$;

create trigger books_guard_approval before update on public.books
for each row execute function public.guard_book_approval_status();

create trigger answers_guard_approval before insert or update or delete on public.answers
for each row execute function public.guard_book_approval_content();
create trigger chapters_guard_approval before insert or update or delete on public.chapters
for each row execute function public.guard_book_approval_content();
create trigger questions_guard_approval before insert or update or delete on public.questions
for each row execute function public.guard_book_approval_content();
create trigger book_covers_guard_approval before insert or update or delete on public.book_covers
for each row execute function public.guard_book_approval_content();
create trigger book_page_images_guard_approval before insert or update or delete on public.book_page_images
for each row execute function public.guard_book_approval_content();
create trigger book_question_pages_guard_approval before insert or update or delete on public.book_question_pages
for each row execute function public.guard_book_approval_content();
create trigger book_photo_texts_guard_approval before insert or update or delete on public.book_photo_texts
for each row execute function public.guard_book_approval_content();

create function public.request_book_approval(target_book_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.books
  where id = target_book_id and deleted_at is null and production_status = 'editing'
  for update;
  if not found then return false; end if;

  insert into public.book_approval_requests(book_id) values (target_book_id);
  update public.books set production_status = 'approval' where id = target_book_id;
  return true;
end;
$$;

create function public.decide_book_approval(
  target_book_id uuid,
  target_owner_id uuid,
  decision text,
  decision_feedback text default null
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  request_id uuid;
  feedback_text text;
begin
  if decision not in ('approved', 'changes_requested') then return false; end if;
  feedback_text := nullif(btrim(decision_feedback), '');
  if char_length(feedback_text) > 2000 or (decision = 'changes_requested' and feedback_text is null) then return false; end if;

  perform 1 from public.books
  where id = target_book_id and owner_id = target_owner_id and deleted_at is null
    and production_status = 'approval' for update;
  if not found then return false; end if;

  select id into request_id from public.book_approval_requests
  where book_id = target_book_id and status = 'pending' for update;
  if request_id is null then return false; end if;

  if decision = 'approved' then
    perform set_config('app.book_approval_decision', 'true', true);
    update public.books set production_status = 'printing' where id = target_book_id;
  else
    update public.books set production_status = 'editing' where id = target_book_id;
  end if;

  update public.book_approval_requests
  set status = decision, feedback = feedback_text, decided_at = now()
  where id = request_id;
  return true;
end;
$$;

revoke all on function public.guard_book_approval_content(), public.guard_book_approval_status() from public, anon, authenticated;
revoke all on function public.request_book_approval(uuid), public.decide_book_approval(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.request_book_approval(uuid), public.decide_book_approval(uuid, uuid, text, text) to service_role;
