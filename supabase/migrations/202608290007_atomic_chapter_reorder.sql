create function public.move_chapter(target_chapter_id uuid, move_direction text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_chapter public.chapters%rowtype;
  adjacent_chapter public.chapters%rowtype;
begin
  if move_direction not in ('up', 'down') then
    raise exception 'Invalid move direction';
  end if;

  select * into current_chapter
  from public.chapters
  where id = target_chapter_id and deleted_at is null;

  if not found then return false; end if;

  if move_direction = 'up' then
    select * into adjacent_chapter
    from public.chapters
    where book_id = current_chapter.book_id
      and deleted_at is null
      and position < current_chapter.position
    order by position desc
    limit 1;
  else
    select * into adjacent_chapter
    from public.chapters
    where book_id = current_chapter.book_id
      and deleted_at is null
      and position > current_chapter.position
    order by position asc
    limit 1;
  end if;

  if not found then return false; end if;

  update public.chapters
  set position = case
    when id = current_chapter.id then adjacent_chapter.position
    when id = adjacent_chapter.id then current_chapter.position
  end
  where id in (current_chapter.id, adjacent_chapter.id);

  return true;
end;
$$;

revoke all on function public.move_chapter(uuid, text) from public, anon;
grant execute on function public.move_chapter(uuid, text) to authenticated;
