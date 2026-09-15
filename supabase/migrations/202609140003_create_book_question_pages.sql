create table public.book_question_pages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('photo', 'blank')),
  image_id uuid unique references public.book_page_images (id) on delete cascade,
  placement text not null default 'after' check (placement in ('before', 'after')),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint book_question_pages_kind_image_check check (
    (kind = 'photo' and image_id is not null) or (kind = 'blank' and image_id is null)
  ),
  constraint book_question_pages_position_key
    unique (question_id, placement, position) deferrable initially deferred
);

comment on table public.book_question_pages is
'Ordered photo and blank pages attached to a question. The answer text remains the question''s central page.';

create trigger book_question_pages_set_updated_at
before update on public.book_question_pages
for each row execute function public.set_updated_at();

create trigger book_question_pages_guard_after_submission
before insert or update or delete on public.book_question_pages
for each row execute function public.guard_locked_book_content();

alter table public.book_question_pages enable row level security;

create policy "Users can read pages in their books"
on public.book_question_pages for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can add pages to their books"
on public.book_question_pages for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.questions
    join public.chapters on chapters.id = questions.chapter_id
    join public.books on books.id = chapters.book_id
    where questions.id = book_question_pages.question_id
      and books.id = book_question_pages.book_id
      and books.owner_id = (select auth.uid())
      and books.deleted_at is null
      and chapters.deleted_at is null
      and questions.deleted_at is null
  )
);

create policy "Users can update pages in their books"
on public.book_question_pages for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Users can delete pages in their books"
on public.book_question_pages for delete to authenticated
using ((select auth.uid()) = owner_id);

revoke all on table public.book_question_pages from anon;
grant select, insert, update, delete on table public.book_question_pages to authenticated;

create index book_question_pages_book_idx on public.book_question_pages (book_id);
create index book_question_pages_question_idx on public.book_question_pages (question_id, placement, position);

-- Preserve every existing photo page and its current side/order.
insert into public.book_question_pages (
  book_id, question_id, owner_id, kind, image_id, placement, position, created_at, updated_at
)
select
  book_id, question_id, owner_id, 'photo', id, placement, position, created_at, updated_at
from public.book_page_images;

create or replace function public.place_book_question_photo(
  target_image_id uuid,
  target_placement text,
  target_position integer default null
)
returns public.book_question_pages
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_image public.book_page_images%rowtype;
  existing_page public.book_question_pages%rowtype;
  next_position integer;
  page_count integer;
  created_page public.book_question_pages;
begin
  if target_placement not in ('before', 'after') then
    raise exception 'Invalid page placement';
  end if;

  select * into target_image from public.book_page_images where id = target_image_id;
  if not found then raise exception 'Image not found'; end if;

  select * into existing_page from public.book_question_pages where image_id = target_image_id;
  if found then return existing_page; end if;

  perform pg_advisory_xact_lock(hashtextextended(target_image.question_id::text, 1));
  select count(*) into page_count
  from public.book_question_pages
  where question_id = target_image.question_id and placement = target_placement;

  next_position := greatest(1, least(coalesce(target_position, page_count + 1), page_count + 1));
  update public.book_question_pages
  set position = position + 1
  where question_id = target_image.question_id
    and placement = target_placement
    and position >= next_position;

  insert into public.book_question_pages (
    book_id, question_id, owner_id, kind, image_id, placement, position
  ) values (
    target_image.book_id, target_image.question_id, target_image.owner_id,
    'photo', target_image.id, target_placement, next_position
  ) returning * into created_page;

  update public.book_page_images set placement = target_placement where id = target_image.id;
  return created_page;
end;
$$;

create or replace function public.append_book_question_blank(
  target_book_id uuid,
  target_question_id uuid,
  target_placement text default 'after',
  target_position integer default null
)
returns public.book_question_pages
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_position integer;
  page_count integer;
  created_page public.book_question_pages;
begin
  if target_placement not in ('before', 'after') then
    raise exception 'Invalid page placement';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_question_id::text, 1));
  select count(*) into page_count
  from public.book_question_pages
  where question_id = target_question_id and placement = target_placement;

  next_position := greatest(1, least(coalesce(target_position, page_count + 1), page_count + 1));
  update public.book_question_pages
  set position = position + 1
  where question_id = target_question_id
    and placement = target_placement
    and position >= next_position;

  insert into public.book_question_pages (book_id, question_id, owner_id, kind, placement, position)
  values (target_book_id, target_question_id, (select auth.uid()), 'blank', target_placement, next_position)
  returning * into created_page;
  return created_page;
end;
$$;

create or replace function public.reorder_book_question_page(target_page_id uuid, target_position integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_page public.book_question_pages%rowtype;
  page_count integer;
  next_position integer;
begin
  select * into current_page from public.book_question_pages where id = target_page_id;
  if not found then return false; end if;

  perform pg_advisory_xact_lock(hashtextextended(current_page.question_id::text, 1));
  select count(*) into page_count
  from public.book_question_pages
  where question_id = current_page.question_id and placement = current_page.placement;
  next_position := greatest(1, least(target_position, page_count));
  if next_position = current_page.position then return true; end if;

  if next_position < current_page.position then
    update public.book_question_pages
    set position = case when id = current_page.id then next_position else position + 1 end
    where question_id = current_page.question_id
      and placement = current_page.placement
      and (id = current_page.id or position between next_position and current_page.position - 1);
  else
    update public.book_question_pages
    set position = case when id = current_page.id then next_position else position - 1 end
    where question_id = current_page.question_id
      and placement = current_page.placement
      and (id = current_page.id or position between current_page.position + 1 and next_position);
  end if;
  return true;
end;
$$;

create or replace function public.delete_book_question_blank(target_page_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_page public.book_question_pages%rowtype;
begin
  select * into current_page
  from public.book_question_pages
  where id = target_page_id and kind = 'blank';
  if not found then return false; end if;

  perform pg_advisory_xact_lock(hashtextextended(current_page.question_id::text, 1));
  delete from public.book_question_pages where id = current_page.id;
  update public.book_question_pages
  set position = position - 1
  where question_id = current_page.question_id
    and placement = current_page.placement
    and position > current_page.position;
  return true;
end;
$$;

-- Keep the generic page sequence compact when a photo and its cascaded page are removed.
create or replace function public.delete_book_page_image(target_image_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_image public.book_page_images%rowtype;
  current_page public.book_question_pages%rowtype;
begin
  select * into current_image from public.book_page_images where id = target_image_id;
  if not found then return null; end if;
  select * into current_page from public.book_question_pages where image_id = current_image.id;

  perform pg_advisory_xact_lock(hashtextextended(current_image.question_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(current_image.question_id::text, 1));
  delete from public.book_page_images where id = current_image.id;

  update public.book_page_images
  set position = position - 1
  where question_id = current_image.question_id and position > current_image.position;

  if current_page.id is not null then
    update public.book_question_pages
    set position = position - 1
    where question_id = current_page.question_id
      and placement = current_page.placement
      and position > current_page.position;
  end if;
  return current_image.storage_path;
end;
$$;

revoke all on function public.place_book_question_photo(uuid, text, integer) from public, anon;
revoke all on function public.append_book_question_blank(uuid, uuid, text, integer) from public, anon;
revoke all on function public.reorder_book_question_page(uuid, integer) from public, anon;
revoke all on function public.delete_book_question_blank(uuid) from public, anon;
grant execute on function public.place_book_question_photo(uuid, text, integer) to authenticated;
grant execute on function public.append_book_question_blank(uuid, uuid, text, integer) to authenticated;
grant execute on function public.reorder_book_question_page(uuid, integer) to authenticated;
grant execute on function public.delete_book_question_blank(uuid) to authenticated;
