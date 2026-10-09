import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(import.meta.dirname, '..');

test('answer revision tables, functions and write guards are removed', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table public.books (id uuid primary key default gen_random_uuid(), production_status text not null default 'writing');
      create table public.questions (id uuid primary key default gen_random_uuid(), book_id uuid references public.books(id));
      create table public.answers (book_id uuid references public.books(id), question_id uuid references public.questions(id), answer_text text);
      create table public.book_answer_originals (book_id uuid, question_id uuid, original_answer text);
      create table public.answer_revisions (id uuid primary key default gen_random_uuid(), book_id uuid, question_id uuid);

      create function public.capture_originals_on_editing() returns trigger language plpgsql as $$ begin return new; end $$;
      create function public.guard_submitted_answers() returns trigger language plpgsql as $$ begin return new; end $$;
      create function public.guard_pending_answer_revisions() returns trigger language plpgsql as $$ begin return new; end $$;
      create function public.capture_book_answer_originals(uuid) returns integer language sql as $$ select 0 $$;
      create function public.import_answer_revisions(uuid, jsonb, uuid) returns integer language sql as $$ select 0 $$;
      create function public.review_answer_revision(uuid, uuid, text) returns boolean language sql as $$ select false $$;
      create function public.review_all_answer_revisions(uuid, uuid, text) returns integer language sql as $$ select 0 $$;

      create trigger books_capture_answer_originals after update on public.books for each row execute function public.capture_originals_on_editing();
      create trigger answers_guard_submitted_original before update on public.answers for each row execute function public.guard_submitted_answers();
      create trigger books_guard_pending_answer_revisions before update on public.books for each row execute function public.guard_pending_answer_revisions();
    `);

    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202610080001_remove_answer_revision_workflow.sql'), 'utf8'));

    const relations = await db.query("select to_regclass('public.answer_revisions') revisions, to_regclass('public.book_answer_originals') originals");
    assert.equal(relations.rows[0].revisions, null);
    assert.equal(relations.rows[0].originals, null);
    const functions = await db.query(`select count(*)::int count from pg_proc where proname in (
      'capture_originals_on_editing', 'guard_submitted_answers', 'guard_pending_answer_revisions',
      'capture_book_answer_originals', 'import_answer_revisions', 'review_answer_revision', 'review_all_answer_revisions'
    )`);
    assert.equal(functions.rows[0].count, 0);
  } finally {
    await db.close();
  }
});
