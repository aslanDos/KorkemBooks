alter table public.book_question_pages
  add column if not exists text_size integer not null default 24,
  add column if not exists hide_footer boolean not null default false;

alter table public.book_question_pages
  drop constraint if exists book_question_pages_text_size_check;

alter table public.book_question_pages
  add constraint book_question_pages_text_size_check
    check (text_size in (14, 16, 18, 20, 22, 24, 28, 32));

update public.book_question_pages
set text_size = 18
where kind = 'text' and text_style = 'text' and text_size = 24;

comment on column public.book_question_pages.text_size is
'Per-page font size for text and quote pages.';
comment on column public.book_question_pages.hide_footer is
'Whether the footer and page number are hidden on this page.';

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
    book_id, question_id, owner_id, kind, placement, position, text_style, text_size
  ) values (
    target_book_id,
    target_question_id,
    (select auth.uid()),
    'text',
    target_placement,
    next_position,
    target_text_style,
    case when target_text_style = 'text' then 18 else 24 end
  ) returning * into created_page;
  return created_page;
end;
$$;

revoke all on function public.append_book_question_text(uuid, uuid, text, integer, text) from public, anon;
grant execute on function public.append_book_question_text(uuid, uuid, text, integer, text) to authenticated;
