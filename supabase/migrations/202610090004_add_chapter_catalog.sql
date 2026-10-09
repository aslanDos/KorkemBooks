create table public.chapter_catalog (
  id uuid primary key default gen_random_uuid(),
  book_type_id uuid not null references public.book_types(id) on delete cascade,
  language public.book_language not null,
  position integer not null check (position between 1 and 20),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  unique (book_type_id, language, position)
);

with source(slug, ru_titles, kk_titles) as (values
  ('girlfriend', array['С чего всё началось','Я люблю тебя такой','Наш маленький мир','Незабываемые моменты','Впереди ещё столько глав'], array['Бәрі неден басталды','Мен сені осындайың үшін жақсы көремін','Біздің кішкентай әлеміміз','Ұмытылмайтын сәттер','Әлі талай тарау алда']),
  ('boyfriend', array['С чего всё началось','Я люблю тебя таким','То, что понятно только нам','Дни, которые мы не забудем','С тобой — вперёд'], array['Бәрі неден басталды','Мен сені осындайың үшін жақсы көремін','Тек екеуімізге түсінікті','Біз ұмытпайтын күндер','Сенімен бірге — алға']),
  ('wife', array['С чего всё началось','Когда «я» и «ты» стали «мы»','День, когда мы стали семьёй','Наш маленький семейный мир','Всё, что мы пережили вместе','Через всё — вместе'], array['Бәрі неден басталды','«Мен» мен «сен» — «бізге» айналғанда','Отбасы болған күніміз','Біздің кішкентай отбасылық әлеміміз','Бірге бастан өткерген сәттер','Қандай жағдай болса да — бірге']),
  ('husband', array['С чего всё началось','Когда он стал тем самым','День, когда мы стали семьёй','Наш маленький семейный мир','Муж, которого вижу я','Через всё — вместе'], array['Бәрі неден басталды','Оның «дәл сол адам» екенін түсінгенде','Отбасы болған күніміз','Біздің кішкентай отбасылық әлеміміз','Менің көзімдегі сен','Қандай жағдай болса да — бірге']),
  ('mother', array['Там, где всё начиналось','Детство глазами взрослого','Мама, которую знаю только я','Не только мама','Мы выросли вместе','Всё, что я хочу тебе сказать'], array['Бәрі басталған кез','Балалық шаққа ересек адамның көзімен','Мен білетін ана','Тек ана ғана емес','Біз бірге есейдік','Сізге айтқым келетін сөздер']),
  ('father', array['Там, где всё начиналось','Всё, чему он меня научил','Папа, которого знаю только я','До того, как он стал папой','Мы менялись вместе','То, что я хочу успеть тебе сказать'], array['Бәрі басталған кез','Әкем үйреткен өмір сабақтары','Мен білетін әке','Әке атанғанға дейін','Біз бірге өзгердік','Сізге айтқым келетін сөздер']),
  ('parents', array['Дом, в котором всё начиналось','Всё, чему меня научила наша семья','Мама и папа, которых знаю я','До того, как появилась наша семья','Всё, что мы прошли вместе','То, что хочется успеть сказать'], array['Бәрі басталған үй','Отбасымнан үйренгенім','Мен білетін анам мен әкем','Біздің отбасы құрылғанға дейін','Біз бірге өткерген жол','Айтылып қалуы керек сөздер']),
  ('sister', array['Мы росли вместе','Ссоры, секреты и союз против всего мира','Сестра, которую знаю только я','От сестёр к близким друзьям','Только наши воспоминания','Сколько бы лет ни прошло'], array['Біз бірге өстік','Ұрыстар, құпиялар және екеуіңіз бір команда болған кездер','Мен ғана жақсы білетін жан','Туысқаннан жақын досқа дейін','Тек екеуіңізге тиесілі естеліктер','Қанша жыл өтсе де']),
  ('brother', array['Мы росли вместе','Шалости, соревнования и один секрет на двоих','Брат, которого знаю я','От детских ссор к настоящему доверию','Только наши воспоминания','Сколько бы лет ни прошло'], array['Біз бірге өстік','Тентектік, жарыс және екеуіңізге ортақ бір құпия','Мен білетін бауырым','Балалық ұрыстардан шынайы сенімге дейін','Тек екеуіңізге тиесілі естеліктер','Қанша жыл өтсе де']),
  ('friend', array['С чего всё началось','Истории, которые лучше не забывать','Только мы это понимаем','Друг, которого знаю я','Когда дружба становится чем-то большим','Ещё много историй впереди'], array['Бәрі неден басталды','Ұмытылмайтын оқиғалар','Мұны тек біз түсінеміз','Мен білетін досым','Достық жай ғана достықтан да маңызды болғанда','Алда әлі талай оқиға бар']),
  ('female-friend', array['С чего всё началось','Те самые истории','Это поймём только мы','Подруга, которую знаю я','Когда подруга становится родным человеком','Ещё столько всего впереди'], array['Бәрі неден басталды','Ұмытылмайтын оқиғалар','Мұны тек екеуіміз түсінеміз','Мен білетін құрбым','Құрбың туған адамыңдай жақын болғанда','Алда әлі талай қызық бар'])
), localized as (
  select slug, 'ru'::public.book_language as language, ru_titles as titles from source
  union all
  select slug, 'kk'::public.book_language, kk_titles from source
)
insert into public.chapter_catalog(book_type_id, language, position, title)
select types.id, localized.language, titles.position, titles.title
from localized
join public.book_types as types on types.slug = localized.slug
cross join lateral unnest(localized.titles) with ordinality as titles(title, position);

alter table public.chapter_catalog enable row level security;
revoke all on table public.chapter_catalog from anon, authenticated;
grant select, insert, update, delete on table public.chapter_catalog to service_role;

create or replace function public.instantiate_book_template(target_book_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  book_type uuid;
  selected_language public.book_language;
  question_count integer;
  chapter_count integer;
  questions_per_chapter integer;
begin
  select books.type_id, books.language into book_type, selected_language
  from public.books as books
  where books.id = target_book_id and books.deleted_at is null
  for update of books;
  if not found or exists(select 1 from public.chapters where book_id = target_book_id) then return; end if;

  select count(*) into question_count from public.question_catalog where book_type_id = book_type;
  select count(*) into chapter_count from public.chapter_catalog where book_type_id = book_type and language = selected_language;
  if question_count = 0 or chapter_count = 0 or question_count % chapter_count <> 0 then
    raise exception 'Book catalog is incomplete';
  end if;
  questions_per_chapter := question_count / chapter_count;

  insert into public.chapters(book_id, title, position)
  select target_book_id, title, position from public.chapter_catalog
  where book_type_id = book_type and language = selected_language order by position;

  insert into public.questions(book_id, chapter_id, catalog_id, prompt, position)
  select target_book_id, chapters.id, catalog.id, coalesce(translations.prompt, catalog.prompt),
    (catalog.number - 1) % questions_per_chapter + 1
  from public.question_catalog as catalog
  join public.chapters as chapters on chapters.book_id = target_book_id
    and chapters.position = (catalog.number - 1) / questions_per_chapter + 1
  left join public.question_catalog_translations as translations
    on translations.catalog_id = catalog.id and translations.language = selected_language
  where catalog.book_type_id = book_type;
end;
$$;

create or replace function public.set_book_language(target_book_id uuid, target_language public.book_language)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  book_type uuid;
begin
  select books.type_id into book_type from public.books as books
  where books.id = target_book_id and books.deleted_at is null for update;
  if not found then return false; end if;

  perform set_config('app.changing_book_language', 'true', true);
  update public.books set language = target_language where id = target_book_id;
  update public.questions as questions set prompt = coalesce(
    (select overrides.prompt from public.question_prompt_overrides as overrides where overrides.question_id = questions.id and overrides.language = target_language),
    (select translations.prompt from public.question_catalog_translations as translations where translations.catalog_id = questions.catalog_id and translations.language = target_language),
    (select catalog.prompt from public.question_catalog as catalog where catalog.id = questions.catalog_id)
  ) where questions.book_id = target_book_id and questions.catalog_id is not null and questions.deleted_at is null;

  update public.chapters as chapters set title = target.title
  from public.chapter_catalog as target
  where chapters.book_id = target_book_id and chapters.deleted_at is null
    and target.book_type_id = book_type and target.language = target_language and target.position = chapters.position
    and exists (select 1 from public.chapter_catalog as system_title where system_title.book_type_id = book_type
      and system_title.position = chapters.position and system_title.title = chapters.title);
  return true;
end;
$$;

create function public.admin_edit_chapter_catalog(
  target_catalog_id uuid,
  target_language public.book_language,
  expected_title text,
  new_title text
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  catalog_row public.chapter_catalog%rowtype;
  normalized_title text := btrim(new_title);
begin
  if normalized_title is null or char_length(normalized_title) not between 1 and 160 then
    raise exception 'Chapter title must be between 1 and 160 characters';
  end if;
  select * into catalog_row from public.chapter_catalog where id = target_catalog_id and language = target_language for update;
  if not found or catalog_row.title is distinct from expected_title then return false; end if;
  if catalog_row.title = normalized_title then return true; end if;

  perform 1 from public.books where type_id = catalog_row.book_type_id and language = target_language
    and deleted_at is null and production_status in ('writing', 'editing') order by id for update;
  update public.chapter_catalog set title = normalized_title where id = target_catalog_id;
  perform set_config('app.changing_book_language', 'true', true);
  update public.chapters as chapters set title = normalized_title
  from public.books as books
  where chapters.book_id = books.id and chapters.position = catalog_row.position
    and chapters.deleted_at is null and chapters.title = catalog_row.title
    and books.type_id = catalog_row.book_type_id and books.language = target_language
    and books.deleted_at is null and books.production_status in ('writing', 'editing');
  return true;
end;
$$;

revoke all on function public.admin_edit_chapter_catalog(uuid, public.book_language, text, text) from public, anon, authenticated;
grant execute on function public.admin_edit_chapter_catalog(uuid, public.book_language, text, text) to service_role;
