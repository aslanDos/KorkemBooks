import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(import.meta.dirname, '..');
const bookId = '11111111-1111-4111-8111-111111111111';
const ownerId = '22222222-2222-4222-8222-222222222222';
const questionId = '33333333-3333-4333-8333-333333333333';
const blankQuestionId = '44444444-4444-4444-8444-444444444444';

test('answer revisions preserve the submitted original and only change answers after owner acceptance', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
      create type public.book_production_status as enum ('writing','editing','approval','printing','ready','delivery','received');
      create table public.profiles(id uuid primary key);
      create table public.books(id uuid primary key, owner_id uuid not null references profiles(id), production_status book_production_status not null default 'writing', deleted_at timestamptz);
      create table public.questions(id uuid primary key, book_id uuid not null references books(id), prompt text not null, deleted_at timestamptz);
      create table public.answers(id uuid primary key default gen_random_uuid(), question_id uuid not null unique references questions(id), book_id uuid not null references books(id), answer_text text not null, answer_format jsonb not null default '{"version":1,"marks":[]}', version integer not null default 1, answered_at timestamptz);
      insert into profiles values ('${ownerId}');
      insert into books(id,owner_id) values ('${bookId}','${ownerId}');
      insert into questions values ('${questionId}','${bookId}','Расскажите о детстве',null);
      insert into questions values ('${blankQuestionId}','${bookId}','Вопрос без ответа',null);
      insert into answers(question_id,book_id,answer_text) values ('${questionId}','${bookId}','Я родился в Алматы и жил там до десяти лет.');
      insert into answers(question_id,book_id,answer_text) values ('${blankQuestionId}','${bookId}',E'\n');
    `);
    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202610030003_answer_revision_workflow.sql'), 'utf8'));
    await db.exec(`insert into book_answer_originals(book_id,question_id,original_answer) values ('${bookId}','${blankQuestionId}',E'\n')`);
    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202610030004_ignore_blank_answer_originals.sql'), 'utf8'));
    await db.exec(`update books set production_status='editing' where id='${bookId}'`);
    const original = (await db.query('select original_answer from book_answer_originals where book_id=$1 and question_id=$2', [bookId, questionId])).rows[0];
    assert.equal(original.original_answer, 'Я родился в Алматы и жил там до десяти лет.');
    assert.equal((await db.query('select count(*)::int count from book_answer_originals where book_id=$1', [bookId])).rows[0].count, 1);

    await db.exec('grant select, update on public.answers to service_role; grant select, update on public.books to service_role');
    await db.exec('set role service_role');
    await assert.rejects(db.query("update answers set answer_text='Редактор перезаписал оригинал' where question_id=$1", [questionId]), /only change after owner accepts/);
    const imported = await db.query(`select import_answer_revisions($1, $2::jsonb, $3) count`, [bookId, JSON.stringify([{ question_id: questionId, edited_answer: 'Я родился в Алматы и прожил там до десяти лет.' }]), ownerId]);
    assert.equal(imported.rows[0].count, 1);
    assert.equal((await db.query('select answer_text from answers where question_id=$1', [questionId])).rows[0].answer_text, original.original_answer);
    const revision = (await db.query('select id, original_answer from answer_revisions where status=\'pending\'')).rows[0];
    assert.equal(revision.original_answer, original.original_answer);
    assert.equal((await db.query(`select review_answer_revision($1,$2,'accepted') ok`, [revision.id, ownerId])).rows[0].ok, true);
    assert.equal((await db.query('select answer_text from answers where question_id=$1', [questionId])).rows[0].answer_text, 'Я родился в Алматы и прожил там до десяти лет.');

    const second = JSON.stringify([{ question_id: questionId, edited_answer: 'Совсем новая редакция.' }]);
    await db.query('select import_answer_revisions($1,$2::jsonb,$3)', [bookId, second, ownerId]);
    await assert.rejects(db.query("update books set production_status='approval' where id=$1", [bookId]), /require an owner decision/);
    const pending = (await db.query("select id from answer_revisions where status='pending'")).rows[0];
    assert.equal((await db.query(`select review_answer_revision($1,$2,'rejected') ok`, [pending.id, ownerId])).rows[0].ok, true);
    assert.equal((await db.query('select answer_text from answers where question_id=$1', [questionId])).rows[0].answer_text, 'Я родился в Алматы и прожил там до десяти лет.');
    assert.equal((await db.query('select count(*)::int count from answer_revisions')).rows[0].count, 2);
  } finally {
    await db.close();
  }
});
