alter table public.book_page_images
add column if not exists position integer not null default 1;

alter table public.book_page_images
drop constraint if exists book_page_images_question_id_key;

alter table public.book_page_images
drop constraint if exists book_page_images_question_position_key;

alter table public.book_page_images
add constraint book_page_images_question_position_key
unique (question_id, position) deferrable initially deferred;

alter table public.book_page_images
add constraint book_page_images_position_positive check (position > 0);

create or replace function public.append_book_page_image(
  target_book_id uuid,
  target_question_id uuid,
  target_owner_id uuid,
  target_storage_path text,
  target_mime_type text,
  target_size_bytes bigint
)
returns public.book_page_images
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_position integer;
  created_image public.book_page_images;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_question_id::text, 0));

  select coalesce(max(position), 0) + 1 into next_position
  from public.book_page_images
  where question_id = target_question_id;

  insert into public.book_page_images (
    book_id, question_id, owner_id, storage_path, mime_type, size_bytes, position
  ) values (
    target_book_id, target_question_id, target_owner_id, target_storage_path,
    target_mime_type, target_size_bytes, next_position
  )
  returning * into created_image;

  return created_image;
end;
$$;

create or replace function public.reorder_book_page_image(target_image_id uuid, target_position integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_image public.book_page_images%rowtype;
  image_count integer;
  next_position integer;
begin
  select * into current_image
  from public.book_page_images
  where id = target_image_id;

  if not found then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(current_image.question_id::text, 0));

  select count(*) into image_count
  from public.book_page_images
  where question_id = current_image.question_id;

  next_position := greatest(1, least(target_position, image_count));
  if next_position = current_image.position then return true; end if;

  if next_position < current_image.position then
    update public.book_page_images
    set position = case
      when id = current_image.id then next_position
      else position + 1
    end
    where question_id = current_image.question_id
      and (id = current_image.id or position between next_position and current_image.position - 1);
  else
    update public.book_page_images
    set position = case
      when id = current_image.id then next_position
      else position - 1
    end
    where question_id = current_image.question_id
      and (id = current_image.id or position between current_image.position + 1 and next_position);
  end if;

  return true;
end;
$$;

create or replace function public.delete_book_page_image(target_image_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_image public.book_page_images%rowtype;
begin
  select * into current_image
  from public.book_page_images
  where id = target_image_id;

  if not found then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended(current_image.question_id::text, 0));

  delete from public.book_page_images where id = current_image.id;
  update public.book_page_images
  set position = position - 1
  where question_id = current_image.question_id
    and position > current_image.position;

  return current_image.storage_path;
end;
$$;

revoke all on function public.append_book_page_image(uuid, uuid, uuid, text, text, bigint) from public, anon;
revoke all on function public.reorder_book_page_image(uuid, integer) from public, anon;
revoke all on function public.delete_book_page_image(uuid) from public, anon;
grant execute on function public.append_book_page_image(uuid, uuid, uuid, text, text, bigint) to authenticated;
grant execute on function public.reorder_book_page_image(uuid, integer) to authenticated;
grant execute on function public.delete_book_page_image(uuid) to authenticated;
