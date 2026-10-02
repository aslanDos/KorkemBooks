-- Updating owner-edit markers after a production status change made the legacy
-- content lock reject the writing -> editing transition. Markers only need to
-- be refreshed when the book language changes.
drop trigger if exists books_mark_owner_question_edits on public.books;

create trigger books_mark_owner_question_edits
after update of language on public.books
for each row execute function public.refresh_owner_question_edit_markers();
