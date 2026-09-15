alter table public.books
  add column if not exists question_text_size smallint not null default 12,
  add column if not exists answer_text_size smallint not null default 18;

alter table public.books
  drop constraint if exists books_question_text_size_check;

alter table public.books
  add constraint books_question_text_size_check
  check (question_text_size in (8, 10, 12, 14, 16));

alter table public.books
  drop constraint if exists books_answer_text_size_check;

alter table public.books
  add constraint books_answer_text_size_check
  check (answer_text_size in (14, 16, 18, 20, 22));
