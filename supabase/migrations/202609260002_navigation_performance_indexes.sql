-- Match the editor's book-wide ordered question lookup.
create index if not exists questions_book_position_idx
on public.questions (book_id, position)
where deleted_at is null;

-- Match the user's suggestion history lookup in the writing screen.
create index if not exists question_prompt_suggestions_book_owner_language_created_idx
on public.question_prompt_suggestions (book_id, owner_id, language, created_at desc);
