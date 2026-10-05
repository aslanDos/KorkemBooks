-- btrim(text) removes ordinary spaces only. Rich-text editors may persist an
-- otherwise empty value as a newline, so use the POSIX whitespace class.
delete from public.book_answer_originals
where original_answer !~ '[^[:space:]]';

create or replace function public.capture_book_answer_originals(target_book_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare inserted_count integer;
begin
  insert into public.book_answer_originals(book_id, question_id, original_answer, original_format)
  select a.book_id, a.question_id, a.answer_text, a.answer_format
  from public.answers a
  join public.questions q on q.id = a.question_id and q.book_id = a.book_id
  where a.book_id = target_book_id
    and q.deleted_at is null
    and a.answer_text ~ '[^[:space:]]'
  on conflict (book_id, question_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.capture_book_answer_originals(uuid) from public, anon, authenticated;
grant execute on function public.capture_book_answer_originals(uuid) to service_role;
