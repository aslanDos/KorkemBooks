-- Edit one catalog wording and update only editable books that still use that wording.
-- Answers and per-book question overrides are deliberately left untouched.
create function public.admin_edit_question_catalog(
  target_catalog_id uuid,
  target_language public.book_language,
  expected_prompt text,
  new_prompt text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  previous_prompt text;
  normalized_prompt text := btrim(new_prompt);
begin
  if normalized_prompt is null or char_length(normalized_prompt) not between 1 and 1000 then
    raise exception 'Question wording must be between 1 and 1000 characters';
  end if;

  select case when target_language = 'ru' then catalog.prompt
    else coalesce(translations.prompt, catalog.prompt) end
  into previous_prompt
  from public.question_catalog as catalog
  left join public.question_catalog_translations as translations
    on translations.catalog_id = catalog.id and translations.language = target_language
  where catalog.id = target_catalog_id
  for update of catalog;

  if not found or previous_prompt is distinct from expected_prompt then return false; end if;
  if previous_prompt = normalized_prompt then return true; end if;

  -- Serialize against status transitions so a book entering approval is not changed.
  perform 1 from public.books as books
  where books.type_id = (select book_type_id from public.question_catalog where id = target_catalog_id)
    and books.deleted_at is null
    and books.production_status in ('writing', 'editing')
  order by books.id for update;

  if target_language = 'ru' then
    update public.question_catalog set prompt = normalized_prompt where id = target_catalog_id;
  else
    insert into public.question_catalog_translations(catalog_id, language, prompt)
    values (target_catalog_id, target_language, normalized_prompt)
    on conflict (catalog_id, language) do update set prompt = excluded.prompt;
  end if;

  perform set_config('app.changing_book_language', 'true', true);
  update public.questions as questions
  set prompt = normalized_prompt
  from public.books as books
  where questions.catalog_id = target_catalog_id
    and questions.book_id = books.id
    and questions.deleted_at is null
    and books.deleted_at is null
    and books.production_status in ('writing', 'editing')
    and questions.prompt = previous_prompt
    and not exists (
      select 1 from public.question_prompt_overrides as overrides
      where overrides.question_id = questions.id and overrides.language = books.language
    )
    and (books.language = target_language or (
      target_language = 'ru' and not exists (
        select 1 from public.question_catalog_translations as translations
        where translations.catalog_id = target_catalog_id and translations.language = books.language
      )
    ));

  return true;
end;
$$;

revoke all on function public.admin_edit_question_catalog(uuid, public.book_language, text, text) from public, anon, authenticated;
grant execute on function public.admin_edit_question_catalog(uuid, public.book_language, text, text) to service_role;
