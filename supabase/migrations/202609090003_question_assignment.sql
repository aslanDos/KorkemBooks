-- Match existing exact wording without replacing answers, IDs, chapters or photos.
with matches as (
 select q.id, catalog.id catalog_id,
 row_number() over (partition by q.book_id, catalog.id order by q.created_at, q.id) rank
 from public.questions q
 join public.chapters c on c.id = q.chapter_id and c.deleted_at is null
 join public.books b on b.id = q.book_id
 join public.question_catalog catalog on catalog.book_type_id = b.type_id and catalog.prompt = q.prompt
 where q.deleted_at is null
)
update public.questions q set catalog_id = m.catalog_id from matches m where m.id = q.id and m.rank = 1;

-- Missing catalog questions go into the pool of existing books. Legacy wording stays intact.
insert into public.questions(book_id, catalog_id, chapter_id, prompt, position)
select b.id, catalog.id, null, catalog.prompt, catalog.number
from public.books b join public.question_catalog catalog on catalog.book_type_id = b.type_id
where b.deleted_at is null
on conflict (book_id, catalog_id) where catalog_id is not null do nothing;

create or replace function public.instantiate_book_template(target_book_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare book_type uuid;
begin
 select type_id into book_type from public.books where id = target_book_id and deleted_at is null for update;
 if not found or exists(select 1 from public.chapters where book_id = target_book_id) then return; end if;
 if (select count(*) from public.question_catalog where book_type_id = book_type) <> 100 then
   raise exception 'Recipient catalog must contain 100 questions';
 end if;
 insert into public.chapters(book_id, title, position)
 select target_book_id, title, position from (values
   (1, 'С чего всё началось'), (2, 'Самое дорогое'),
   (3, 'Наши воспоминания'), (4, 'О главном и о будущем')
 ) as initial(position, title);
 insert into public.questions(book_id, chapter_id, catalog_id, prompt, position)
 select target_book_id, c.id, catalog.id, catalog.prompt, (catalog.number - 1) % 25 + 1
 from public.question_catalog catalog join public.chapters c
 on c.book_id = target_book_id and c.position = (catalog.number - 1) / 25 + 1
 where catalog.book_type_id = book_type;
end;
$$;

-- All placements use a single owned book row as the serialization lock.
create function public.assign_book_questions(target_book_id uuid, question_ids uuid[], target_chapter_id uuid default null, only_unassigned boolean default false)
returns boolean language plpgsql security definer set search_path = '' as $$
declare next_position integer; question_count integer;
begin
 perform 1 from public.books where id = target_book_id and owner_id = auth.uid() and deleted_at is null for update;
 if not found then return false; end if;
 question_count := cardinality(question_ids);
 if question_count is null or question_count < 1 or question_count > 100 then return false; end if;
 if target_chapter_id is not null and not exists (
   select 1 from public.chapters where id = target_chapter_id and book_id = target_book_id and deleted_at is null
 ) then return false; end if;
 if (select count(*) from public.questions where id = any(question_ids) and book_id = target_book_id
   and deleted_at is null and (not only_unassigned or chapter_id is null)) <> question_count then return false; end if;
 select coalesce(max(position), 0) into next_position from public.questions where chapter_id = target_chapter_id and deleted_at is null;
 update public.questions q set chapter_id = target_chapter_id, position = next_position + selected.ordinality::integer
 from unnest(question_ids) with ordinality selected(id, ordinality) where q.id = selected.id;
 -- Keep displayed question numbers contiguous after moving out of a chapter.
 update public.questions q set position = ordered.position
 from (select id, row_number() over (partition by chapter_id order by position, id)::integer position
   from public.questions where book_id = target_book_id and chapter_id is not null and deleted_at is null) ordered
 where q.id = ordered.id and q.position <> ordered.position;
 perform public.refresh_book_progress(target_book_id);
 return true;
end;
$$;

create function public.refresh_book_progress(target_book_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare result integer;
begin
 perform 1 from public.books where id = target_book_id and owner_id = auth.uid() and deleted_at is null for update;
 if not found then return null; end if;
 select coalesce(round(100.0 * count(*) filter (where length(trim(a.answer_text)) > 0) / nullif(count(*), 0)), 0)::integer into result
 from public.questions q join public.chapters c on c.id = q.chapter_id and c.deleted_at is null
 left join public.answers a on a.question_id = q.id
 where q.book_id = target_book_id and q.deleted_at is null;
 update public.books set progress = result,
 status = case when status in ('draft','in_progress') then (case when result > 0 then 'in_progress' else 'draft' end)::public.book_status else status end
 where id = target_book_id;
 return result;
end;
$$;

-- Prevent direct API calls from editing the catalog wording or adding custom questions.
revoke insert, update on public.questions from authenticated;
grant update(position) on public.questions to authenticated;
drop policy "Users can read questions in their books" on public.questions;
create policy "Users can read questions in their books" on public.questions for select to authenticated
using (exists(select 1 from public.books b where b.id = questions.book_id and b.owner_id = auth.uid() and b.deleted_at is null));
-- Position-only direct writes still use the existing owner policies. Pool changes require RPC.

create function public.guard_book_question() returns trigger language plpgsql set search_path = '' as $$
begin
 if tg_op = 'UPDATE' and (new.book_id is distinct from old.book_id or new.prompt is distinct from old.prompt or new.catalog_id is distinct from old.catalog_id or new.template_id is distinct from old.template_id) then
   raise exception 'Question identity and wording are immutable';
 end if;
 if new.catalog_id is not null and not exists (
   select 1 from public.question_catalog catalog join public.books b on b.type_id = catalog.book_type_id
   where catalog.id = new.catalog_id and b.id = new.book_id and catalog.prompt = new.prompt
 ) then raise exception 'Question does not belong to recipient catalog'; end if;
 if new.chapter_id is not null and not exists (
   select 1 from public.chapters where id = new.chapter_id and book_id = new.book_id and deleted_at is null
 ) then raise exception 'Invalid destination chapter'; end if;
 return new;
end;
$$;
create trigger questions_guard before insert or update on public.questions for each row execute function public.guard_book_question();

create function public.release_chapter_questions() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.book_id is distinct from old.book_id then raise exception 'Chapter cannot change books'; end if;
 if old.deleted_at is null and new.deleted_at is not null then
   perform 1 from public.books where id = old.book_id for update;
   update public.questions set chapter_id = null where chapter_id = old.id and deleted_at is null;
 end if;
 return new;
end;
$$;
create trigger chapters_release_questions before update on public.chapters for each row execute function public.release_chapter_questions();

create function public.remove_book_chapter(target_book_id uuid, target_chapter_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 perform 1 from public.books where id = target_book_id and owner_id = auth.uid() and deleted_at is null for update;
 if not found then return false; end if;
 update public.chapters set deleted_at = now() where id = target_chapter_id and book_id = target_book_id and deleted_at is null;
 if not found then return false; end if;
 perform public.refresh_book_progress(target_book_id);
 return true;
end;
$$;

revoke all on function public.assign_book_questions(uuid, uuid[], uuid, boolean), public.refresh_book_progress(uuid), public.remove_book_chapter(uuid, uuid) from public, anon;
grant execute on function public.assign_book_questions(uuid, uuid[], uuid, boolean), public.refresh_book_progress(uuid), public.remove_book_chapter(uuid, uuid) to authenticated;
revoke all on function public.guard_book_question(), public.release_chapter_questions() from public, anon, authenticated;
comment on table public.questions is 'Fixed book question identities; nullable chapter_id means unassigned. Legacy questions remain read-only.';

-- Catalog uniqueness is per book, no longer tied to an original template chapter.
drop index public.questions_chapter_template_idx;
create or replace function public.move_question(target_question_id uuid, move_direction text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare current_question public.questions%rowtype; adjacent_question public.questions%rowtype; target_book uuid;
begin
 if move_direction not in ('up', 'down') then return false; end if;
 select book_id into target_book from public.questions where id = target_question_id;
 perform 1 from public.books where id = target_book and owner_id = auth.uid() and deleted_at is null for update;
 if not found then return false; end if;
 select * into current_question from public.questions where id = target_question_id and deleted_at is null and chapter_id is not null;
 if not found then return false; end if;
 if move_direction = 'up' then
  select * into adjacent_question from public.questions where chapter_id = current_question.chapter_id and deleted_at is null and position < current_question.position order by position desc limit 1;
 else
  select * into adjacent_question from public.questions where chapter_id = current_question.chapter_id and deleted_at is null and position > current_question.position order by position limit 1;
 end if;
 if not found then return false; end if;
 update public.questions set position = case when id = current_question.id then adjacent_question.position else current_question.position end
 where id in (current_question.id, adjacent_question.id);
 return true;
end;
$$;
revoke update(position) on public.questions from authenticated;
