drop trigger if exists books_capture_answer_originals on public.books;
drop trigger if exists answers_guard_submitted_original on public.answers;
drop trigger if exists books_guard_pending_answer_revisions on public.books;

drop function if exists public.capture_originals_on_editing();
drop function if exists public.guard_submitted_answers();
drop function if exists public.guard_pending_answer_revisions();
drop function if exists public.capture_book_answer_originals(uuid);
drop function if exists public.import_answer_revisions(uuid, jsonb, uuid);
drop function if exists public.review_answer_revision(uuid, uuid, text);
drop function if exists public.review_all_answer_revisions(uuid, uuid, text);

drop table if exists public.answer_revisions;
drop table if exists public.book_answer_originals;
