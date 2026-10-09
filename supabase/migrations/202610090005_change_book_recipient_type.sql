-- Administrators can change a book's recipient type without discarding work
-- already entered against the previous catalog.
create or replace function public.guard_book_question()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (
    new.book_id is distinct from old.book_id
    or (
      new.catalog_id is distinct from old.catalog_id
      and coalesce(current_setting('app.changing_book_type', true), '') <> 'true'
    )
    or new.template_id is distinct from old.template_id
    or (
      new.prompt is distinct from old.prompt
      and coalesce(current_setting('app.changing_book_language', true), '') <> 'true'
      and coalesce(current_setting('app.owner_editing_question', true), '') <> 'true'
      and coalesce(current_setting('app.changing_book_type', true), '') <> 'true'
    )
  ) then
    raise exception 'Question identity and wording are immutable';
  end if;
  if new.catalog_id is not null and not exists (
    select 1 from public.question_catalog catalog
    join public.books books on books.type_id = catalog.book_type_id
    where catalog.id = new.catalog_id and books.id = new.book_id
  ) then raise exception 'Question does not belong to recipient catalog'; end if;
  if new.chapter_id is not null and not exists (
    select 1 from public.chapters where id = new.chapter_id and book_id = new.book_id and deleted_at is null
  ) then raise exception 'Invalid destination chapter'; end if;
  return new;
end;
$$;

create function public.set_book_recipient_type(target_book_id uuid, target_type_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  selected_book public.books%rowtype;
  owner_role public.app_role;
  selected_language public.book_language;
  question_count integer;
  chapter_count integer;
  questions_per_chapter integer;
  active_chapter_count integer;
  next_chapter_position integer;
begin
  select * into selected_book from public.books
  where id = target_book_id and deleted_at is null for update;
  if not found then return false; end if;
  if selected_book.type_id = target_type_id then return true; end if;
  if selected_book.production_status not in ('writing', 'editing') then return false; end if;

  select count(*) into question_count from public.question_catalog
  where book_type_id = target_type_id;
  select count(*) into chapter_count from public.chapter_catalog
  where book_type_id = target_type_id and language = selected_book.language;
  if not exists(select 1 from public.book_types where id = target_type_id and is_active)
    or question_count = 0 or chapter_count = 0 or question_count % chapter_count <> 0
  then return false; end if;
  questions_per_chapter := question_count / chapter_count;
  selected_language := selected_book.language;

  -- Keep any question that carries user-created content. It becomes a legacy
  -- book question, so its answer and all FK-linked page data retain their IDs.
  perform set_config('app.changing_book_type', 'true', true);
  update public.questions as questions set catalog_id = null
  where questions.book_id = target_book_id
    and questions.deleted_at is null
    and questions.catalog_id is not null
    and (
      questions.prompt_edited_by_owner
      or exists(select 1 from public.answers where question_id = questions.id)
      or exists(select 1 from public.book_page_images where question_id = questions.id)
      or exists(select 1 from public.book_question_pages where question_id = questions.id)
    );

  -- Empty catalog questions can be replaced safely. Soft deletion also keeps
  -- the operation reversible at the data level.
  update public.questions set deleted_at = now()
  where book_id = target_book_id and deleted_at is null and catalog_id is not null;

  select role into owner_role from public.profiles where id = selected_book.owner_id for update;
  if owner_role = 'user' then
    update public.profiles set book_type_id = target_type_id where id = selected_book.owner_id;
  end if;
  update public.books set type_id = target_type_id where id = target_book_id;

  select count(*), coalesce(max(position), 0)
  into active_chapter_count, next_chapter_position
  from public.chapters where book_id = target_book_id and deleted_at is null;

  if active_chapter_count < chapter_count then
    insert into public.chapters(book_id, title, position)
    select target_book_id, catalog.title,
      next_chapter_position + row_number() over (order by catalog.position)
    from public.chapter_catalog as catalog
    where catalog.book_type_id = target_type_id
      and catalog.language = selected_language
      and catalog.position > active_chapter_count
    order by catalog.position;
  end if;

  with destination_chapters as (
    select chapters.id, row_number() over (order by chapters.position, chapters.id) as chapter_number
    from public.chapters as chapters
    where chapters.book_id = target_book_id and chapters.deleted_at is null
    order by chapters.position, chapters.id
    limit chapter_count
  ), base_positions as (
    select destination.id, destination.chapter_number,
      coalesce(max(existing.position), 0) as base_position
    from destination_chapters as destination
    left join public.questions as existing
      on existing.chapter_id = destination.id and existing.deleted_at is null
    group by destination.id, destination.chapter_number
  )
  insert into public.questions(book_id, chapter_id, catalog_id, prompt, position)
  select target_book_id, destination.id, catalog.id,
    coalesce(translations.prompt, catalog.prompt),
    destination.base_position + (catalog.number - 1) % questions_per_chapter + 1
  from public.question_catalog as catalog
  join base_positions as destination
    on destination.chapter_number = (catalog.number - 1) / questions_per_chapter + 1
  left join public.question_catalog_translations as translations
    on translations.catalog_id = catalog.id and translations.language = selected_language
  where catalog.book_type_id = target_type_id
  on conflict (book_id, catalog_id) where catalog_id is not null do update
  set chapter_id = excluded.chapter_id,
      prompt = excluded.prompt,
      position = excluded.position,
      deleted_at = null;

  update public.books set progress = (
    select coalesce(round(100.0 * count(*) filter (where length(btrim(answers.answer_text)) > 0)
      / nullif(count(*), 0)), 0)::integer
    from public.questions as questions
    join public.chapters as chapters on chapters.id = questions.chapter_id and chapters.deleted_at is null
    left join public.answers as answers on answers.question_id = questions.id
    where questions.book_id = target_book_id and questions.deleted_at is null
  ) where id = target_book_id;

  return true;
end;
$$;

revoke all on function public.set_book_recipient_type(uuid, uuid) from public, anon, authenticated;
grant execute on function public.set_book_recipient_type(uuid, uuid) to service_role;

comment on function public.set_book_recipient_type(uuid, uuid) is
'Changes the recipient catalog while retaining every question that contains user-created content.';
