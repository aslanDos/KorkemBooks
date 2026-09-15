create function public.move_question(target_question_id uuid, move_direction text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_question public.questions%rowtype;
  adjacent_question public.questions%rowtype;
begin
  if move_direction not in ('up', 'down') then
    raise exception 'Invalid move direction';
  end if;

  select * into current_question
  from public.questions
  where id = target_question_id and deleted_at is null;

  if not found then return false; end if;

  if move_direction = 'up' then
    select * into adjacent_question
    from public.questions
    where chapter_id = current_question.chapter_id
      and deleted_at is null
      and position < current_question.position
    order by position desc
    limit 1;
  else
    select * into adjacent_question
    from public.questions
    where chapter_id = current_question.chapter_id
      and deleted_at is null
      and position > current_question.position
    order by position asc
    limit 1;
  end if;

  if not found then return false; end if;

  update public.questions
  set position = case
    when id = current_question.id then adjacent_question.position
    when id = adjacent_question.id then current_question.position
  end
  where id in (current_question.id, adjacent_question.id);

  return true;
end;
$$;

revoke all on function public.move_question(uuid, text) from public, anon;
grant execute on function public.move_question(uuid, text) to authenticated;
