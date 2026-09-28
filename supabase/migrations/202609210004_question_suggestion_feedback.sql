alter table public.question_prompt_suggestions
  add column review_comment text check (char_length(review_comment) <= 1000),
  add column resolved_prompt text check (char_length(resolved_prompt) between 1 and 1000);

drop function public.resolve_question_prompt_suggestion(uuid, text, text);

create function public.resolve_question_prompt_suggestion(
  target_suggestion_id uuid,
  target_status text,
  final_prompt text,
  reviewer_comment text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  suggestion public.question_prompt_suggestions%rowtype;
  current_language public.book_language;
  current_prompt text;
  approved_prompt text;
  comment_text text;
begin
  if target_status not in ('approved', 'rejected') then return false; end if;
  comment_text := nullif(btrim(reviewer_comment), '');
  if char_length(comment_text) > 1000 then return false; end if;

  select * into suggestion from public.question_prompt_suggestions
  where id = target_suggestion_id and status = 'pending' for update;
  if not found then return false; end if;

  if target_status = 'rejected' then
    update public.question_prompt_suggestions
    set status = 'rejected', reviewed_at = now(), review_comment = comment_text
    where id = target_suggestion_id;
    return true;
  end if;

  select language into current_language from public.books
  where id = suggestion.book_id and deleted_at is null for update;
  if not found then return false; end if;

  select prompt into current_prompt from public.questions
  where id = suggestion.question_id and book_id = suggestion.book_id and deleted_at is null for update;
  if not found then return false; end if;

  approved_prompt := btrim(final_prompt);
  if approved_prompt is null or char_length(approved_prompt) not between 1 and 1000 then
    raise exception 'Question wording must be between 1 and 1000 characters';
  end if;
  if current_language = suggestion.language and current_prompt <> suggestion.original_prompt then
    return false;
  end if;

  insert into public.question_prompt_overrides(question_id, language, prompt)
  values (suggestion.question_id, suggestion.language, approved_prompt)
  on conflict (question_id, language) do update
    set prompt = excluded.prompt, updated_at = now();

  if current_language = suggestion.language then
    perform set_config('app.changing_book_language', 'true', true);
    update public.questions set prompt = approved_prompt where id = suggestion.question_id;
  end if;

  update public.question_prompt_suggestions
  set status = 'approved', reviewed_at = now(), review_comment = comment_text, resolved_prompt = approved_prompt
  where id = target_suggestion_id;
  return true;
end;
$$;

revoke all on function public.resolve_question_prompt_suggestion(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.resolve_question_prompt_suggestion(uuid, text, text, text) to service_role;
