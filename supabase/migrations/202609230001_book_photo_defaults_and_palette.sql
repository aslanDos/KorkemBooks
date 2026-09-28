alter table public.book_covers
  drop constraint if exists book_covers_color_key_check;

update public.book_covers
set color_key = case color_key
  when 'wine' then 'burgundy'
  when 'berry' then 'burgundy'
  when 'umber' then 'black'
  when 'ochre' then 'olive'
  else color_key
end;

alter table public.book_covers
  alter column color_key set default 'burgundy',
  add constraint book_covers_color_key_check
  check (color_key in ('black', 'gray', 'burgundy', 'olive', 'navy', 'terracotta'));

alter table public.books
  drop constraint if exists books_page_background_style_check;

update public.books
set page_background_style = case page_background_style
  when 'wine' then 'burgundy'
  when 'berry' then 'burgundy'
  when 'umber' then 'black'
  when 'primary' then 'olive'
  when 'ochre' then 'olive'
  when 'white' then 'burgundy'
  else page_background_style
end;

alter table public.books
  alter column page_background_style set default 'burgundy',
  add constraint books_page_background_style_check
  check (page_background_style in ('black', 'gray', 'burgundy', 'olive', 'navy', 'terracotta')),
  add column if not exists round_photos boolean not null default false,
  add column if not exists hide_photo_footers boolean not null default false;

update public.books as book
set
  round_photos = exists (
    select 1 from public.book_page_images as image
    where image.book_id = book.id and image.rounded_corners
  ),
  hide_photo_footers = exists (
    select 1 from public.book_page_images as image where image.book_id = book.id
  ) and not exists (
    select 1 from public.book_page_images as image
    where image.book_id = book.id and not image.hide_footer
  );

update public.book_page_images as image
set rounded_corners = book.round_photos
from public.books as book
where book.id = image.book_id
  and image.rounded_corners is distinct from book.round_photos;

comment on column public.books.round_photos is
'Book-wide rounded photo setting inherited by newly added photos.';

comment on column public.books.hide_photo_footers is
'Whether newly added photos inherit hidden page footers.';

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
  book_round_photos boolean;
  book_hide_photo_footers boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_question_id::text, 0));

  select round_photos, hide_photo_footers
  into book_round_photos, book_hide_photo_footers
  from public.books
  where id = target_book_id;

  select coalesce(max(position), 0) + 1 into next_position
  from public.book_page_images
  where question_id = target_question_id;

  insert into public.book_page_images (
    book_id, question_id, owner_id, storage_path, mime_type, size_bytes, position,
    rounded_corners, hide_footer
  ) values (
    target_book_id, target_question_id, target_owner_id, target_storage_path,
    target_mime_type, target_size_bytes, next_position,
    coalesce(book_round_photos, false), coalesce(book_hide_photo_footers, false)
  )
  returning * into created_image;

  return created_image;
end;
$$;

create or replace function public.set_book_photo_defaults(
  target_book_id uuid,
  target_round_photos boolean default null,
  target_hide_photo_footers boolean default null,
  target_apply_to_existing boolean default true
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_book_id uuid;
begin
  if target_round_photos is null and target_hide_photo_footers is null then
    return false;
  end if;

  update public.books
  set
    round_photos = coalesce(target_round_photos, round_photos),
    hide_photo_footers = coalesce(target_hide_photo_footers, hide_photo_footers)
  where id = target_book_id
    and owner_id = auth.uid()
    and production_status = 'writing'
    and deleted_at is null
  returning id into updated_book_id;

  if updated_book_id is null then return false; end if;

  if target_apply_to_existing then
    update public.book_page_images
    set
      rounded_corners = coalesce(target_round_photos, rounded_corners),
      hide_footer = coalesce(target_hide_photo_footers, hide_footer)
    where book_id = target_book_id;
  end if;

  return true;
end;
$$;

revoke all on function public.set_book_photo_defaults(uuid, boolean, boolean, boolean) from public, anon;
grant execute on function public.set_book_photo_defaults(uuid, boolean, boolean, boolean) to authenticated;
