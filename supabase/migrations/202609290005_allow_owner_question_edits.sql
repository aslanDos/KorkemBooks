alter table public.questions
add column prompt_edited_by_owner boolean not null default false;

-- Existing approved per-book wordings become ordinary owner edits.
update public.questions as questions
set prompt_edited_by_owner = true
from public.books as books
where books.id = questions.book_id
  and books.production_status in ('writing', 'editing')
  and exists (
    select 1
    from public.question_prompt_overrides as overrides
    where overrides.question_id = questions.id
      and overrides.language = books.language
  );

create or replace function public.guard_book_question()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (
    new.book_id is distinct from old.book_id
    or new.catalog_id is distinct from old.catalog_id
    or new.template_id is distinct from old.template_id
    or (
      new.prompt is distinct from old.prompt
      and coalesce(current_setting('app.changing_book_language', true), '') <> 'true'
      and coalesce(current_setting('app.owner_editing_question', true), '') <> 'true'
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

create function public.update_own_book_question_prompt(
  target_book_id uuid,
  target_question_id uuid,
  new_prompt text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  selected_language public.book_language;
  catalog_prompt text;
  normalized_prompt text := btrim(new_prompt);
begin
  if auth.uid() is null or normalized_prompt is null
    or char_length(normalized_prompt) not between 1 and 1000
  then return false; end if;

  select books.language into selected_language
  from public.books as books
  where books.id = target_book_id
    and books.owner_id = auth.uid()
    and books.deleted_at is null
    and books.production_status in ('writing', 'editing')
  for update;
  if not found then return false; end if;

  select coalesce(translations.prompt, catalog.prompt)
  into catalog_prompt
  from public.questions as questions
  left join public.question_catalog as catalog on catalog.id = questions.catalog_id
  left join public.question_catalog_translations as translations
    on translations.catalog_id = catalog.id and translations.language = selected_language
  where questions.id = target_question_id
    and questions.book_id = target_book_id
    and questions.deleted_at is null
  for update of questions;
  if not found then return false; end if;

  if normalized_prompt is not distinct from catalog_prompt then
    delete from public.question_prompt_overrides
    where question_id = target_question_id and language = selected_language;
  else
    insert into public.question_prompt_overrides(question_id, language, prompt)
    values (target_question_id, selected_language, normalized_prompt)
    on conflict (question_id, language) do update
      set prompt = excluded.prompt, updated_at = now();
  end if;

  perform set_config('app.owner_editing_question', 'true', true);
  update public.questions
  set prompt = normalized_prompt,
      prompt_edited_by_owner = normalized_prompt is distinct from catalog_prompt
  where id = target_question_id and book_id = target_book_id;
  return true;
end;
$$;

revoke all on function public.update_own_book_question_prompt(uuid, uuid, text) from public, anon;
grant execute on function public.update_own_book_question_prompt(uuid, uuid, text) to authenticated;

create function public.refresh_owner_question_edit_markers()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.language is distinct from old.language then
    update public.questions as questions
    set prompt_edited_by_owner = exists (
      select 1 from public.question_prompt_overrides as overrides
      where overrides.question_id = questions.id and overrides.language = new.language
    )
    where questions.book_id = new.id and questions.deleted_at is null;
  end if;
  return new;
end;
$$;

create trigger books_mark_owner_question_edits
after update of language on public.books
for each row execute function public.refresh_owner_question_edit_markers();

drop function if exists public.resolve_question_prompt_suggestion(uuid, text, text);
drop function if exists public.resolve_question_prompt_suggestion(uuid, text, text, text);
drop table if exists public.question_prompt_suggestions;
