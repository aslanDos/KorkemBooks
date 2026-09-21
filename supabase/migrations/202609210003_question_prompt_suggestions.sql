create table public.question_prompt_suggestions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  language public.book_language not null,
  original_prompt text not null check (char_length(original_prompt) between 1 and 1000),
  suggested_prompt text not null check (char_length(suggested_prompt) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint suggestion_is_a_change check (suggested_prompt <> original_prompt)
);

create unique index question_prompt_suggestions_one_pending_idx
on public.question_prompt_suggestions(question_id, language) where status = 'pending';
create index question_prompt_suggestions_queue_idx
on public.question_prompt_suggestions(status, created_at desc);

alter table public.question_prompt_suggestions enable row level security;
revoke all on public.question_prompt_suggestions from anon, authenticated;
grant select, insert, update, delete on public.question_prompt_suggestions to service_role;

create table public.question_prompt_overrides (
  question_id uuid not null references public.questions(id) on delete cascade,
  language public.book_language not null,
  prompt text not null check (char_length(prompt) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (question_id, language)
);

alter table public.question_prompt_overrides enable row level security;
revoke all on public.question_prompt_overrides from anon, authenticated;
grant select, insert, update, delete on public.question_prompt_overrides to service_role;

create function public.resolve_question_prompt_suggestion(
  target_suggestion_id uuid,
  target_status text,
  final_prompt text default null
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  suggestion public.question_prompt_suggestions%rowtype;
  current_language public.book_language;
  current_prompt text;
  approved_prompt text;
begin
  if target_status not in ('approved', 'rejected') then return false; end if;

  select * into suggestion from public.question_prompt_suggestions
  where id = target_suggestion_id and status = 'pending' for update;
  if not found then return false; end if;

  if target_status = 'rejected' then
    update public.question_prompt_suggestions
    set status = 'rejected', reviewed_at = now()
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
  set status = target_status, reviewed_at = now()
  where id = target_suggestion_id;
  return true;
end;
$$;

revoke all on function public.resolve_question_prompt_suggestion(uuid, text, text) from public, anon, authenticated;
grant execute on function public.resolve_question_prompt_suggestion(uuid, text, text) to service_role;

create or replace function public.set_book_language(target_book_id uuid, target_language public.book_language)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.books where id = target_book_id and deleted_at is null for update;
  if not found then return false; end if;

  perform set_config('app.changing_book_language', 'true', true);
  update public.books set language = target_language where id = target_book_id;

  update public.questions as questions
  set prompt = coalesce(
    (select overrides.prompt from public.question_prompt_overrides as overrides
      where overrides.question_id = questions.id and overrides.language = target_language),
    (select translations.prompt from public.question_catalog_translations as translations
      where translations.catalog_id = questions.catalog_id and translations.language = target_language),
    (select catalog.prompt from public.question_catalog as catalog where catalog.id = questions.catalog_id)
  )
  where questions.book_id = target_book_id
    and questions.catalog_id is not null
    and questions.deleted_at is null;

  with labels(position, ru, kk, en) as (values
    (1, 'С чего всё началось', 'Бәрі неден басталды', 'How It All Began'),
    (2, 'Самое дорогое', 'Ең қымбат нәрселер', 'What Matters Most'),
    (3, 'Наши воспоминания', 'Біздің естеліктеріміз', 'Our Memories'),
    (4, 'О главном и о будущем', 'Ең маңыздысы және болашақ туралы', 'What Matters and What Lies Ahead')
  )
  update public.chapters as chapters
  set title = case target_language when 'kk' then labels.kk when 'en' then labels.en else labels.ru end
  from labels
  where chapters.book_id = target_book_id
    and chapters.position = labels.position
    and chapters.deleted_at is null
    and chapters.title in (labels.ru, labels.kk, labels.en);

  return true;
end;
$$;
