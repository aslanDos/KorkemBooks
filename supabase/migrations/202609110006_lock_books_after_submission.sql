create or replace function public.guard_locked_book_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' and old.production_status <> 'writing' then
    raise exception 'Book is locked for editing';
  end if;
  return new;
end;
$$;

create or replace function public.guard_locked_book_content()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_book_id uuid;
declare target_status public.book_production_status;
begin
  target_book_id := case when tg_op = 'DELETE' then old.book_id else new.book_id end;
  select production_status into target_status from public.books where id = target_book_id;
  if auth.role() <> 'service_role' and target_status <> 'writing' then
    raise exception 'Book is locked for editing';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists books_guard_after_submission on public.books;
create trigger books_guard_after_submission before update on public.books
for each row execute function public.guard_locked_book_update();

drop trigger if exists answers_guard_after_submission on public.answers;
create trigger answers_guard_after_submission before insert or update or delete on public.answers
for each row execute function public.guard_locked_book_content();

drop trigger if exists chapters_guard_after_submission on public.chapters;
create trigger chapters_guard_after_submission before insert or update or delete on public.chapters
for each row execute function public.guard_locked_book_content();

drop trigger if exists questions_guard_after_submission on public.questions;
create trigger questions_guard_after_submission before insert or update or delete on public.questions
for each row execute function public.guard_locked_book_content();

drop trigger if exists book_covers_guard_after_submission on public.book_covers;
create trigger book_covers_guard_after_submission before insert or update or delete on public.book_covers
for each row execute function public.guard_locked_book_content();

drop trigger if exists book_page_images_guard_after_submission on public.book_page_images;
create trigger book_page_images_guard_after_submission before insert or update or delete on public.book_page_images
for each row execute function public.guard_locked_book_content();

revoke all on function public.guard_locked_book_update(), public.guard_locked_book_content() from public, anon, authenticated;
