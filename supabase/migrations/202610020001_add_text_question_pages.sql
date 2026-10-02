alter table public.book_question_pages
  add column text_content text not null default '',
  add column text_attribution text not null default '',
  add column text_style text not null default 'quote';

alter table public.book_question_pages
  drop constraint if exists book_question_pages_kind_check,
  drop constraint if exists book_question_pages_kind_image_check;

alter table public.book_question_pages
  add constraint book_question_pages_kind_check
    check (kind in ('photo', 'blank', 'text')),
  add constraint book_question_pages_kind_image_check check (
    (kind = 'photo' and image_id is not null)
    or (kind in ('blank', 'text') and image_id is null)
  ),
  add constraint book_question_pages_text_style_check
    check (text_style in ('text', 'quote')),
  add constraint book_question_pages_text_length_check
    check (char_length(text_content) <= 1200 and char_length(text_attribution) <= 160);

comment on column public.book_question_pages.text_content is
'User-authored content for text and quote pages.';
comment on column public.book_question_pages.text_attribution is
'Optional quote author or source.';
comment on column public.book_question_pages.text_style is
'Visual treatment for a text page: text or quote.';

create or replace function public.append_book_question_text(
  target_book_id uuid,
  target_question_id uuid,
  target_placement text default 'after',
  target_position integer default null,
  target_text_style text default 'quote'
)
returns public.book_question_pages
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_position integer;
  page_count integer;
  created_page public.book_question_pages;
begin
  if target_placement not in ('before', 'after') then
    raise exception 'Invalid page placement';
  end if;
  if target_text_style not in ('text', 'quote') then
    raise exception 'Invalid text page style';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_question_id::text, 1));
  select count(*) into page_count
  from public.book_question_pages
  where question_id = target_question_id and placement = target_placement;

  next_position := greatest(1, least(coalesce(target_position, page_count + 1), page_count + 1));
  update public.book_question_pages
  set position = position + 1
  where question_id = target_question_id
    and placement = target_placement
    and position >= next_position;

  insert into public.book_question_pages (
    book_id, question_id, owner_id, kind, placement, position, text_style
  ) values (
    target_book_id, target_question_id, (select auth.uid()), 'text', target_placement, next_position, target_text_style
  ) returning * into created_page;
  return created_page;
end;
$$;

create or replace function public.delete_book_question_text(target_page_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_page public.book_question_pages%rowtype;
begin
  select * into current_page
  from public.book_question_pages
  where id = target_page_id and kind = 'text';
  if not found then return false; end if;

  perform pg_advisory_xact_lock(hashtextextended(current_page.question_id::text, 1));
  delete from public.book_question_pages where id = current_page.id;
  update public.book_question_pages
  set position = position - 1
  where question_id = current_page.question_id
    and placement = current_page.placement
    and position > current_page.position;
  return true;
end;
$$;

revoke all on function public.append_book_question_text(uuid, uuid, text, integer, text) from public, anon;
revoke all on function public.delete_book_question_text(uuid) from public, anon;
grant execute on function public.append_book_question_text(uuid, uuid, text, integer, text) to authenticated;
grant execute on function public.delete_book_question_text(uuid) to authenticated;
