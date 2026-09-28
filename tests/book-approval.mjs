import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(import.meta.dirname, '..');
const bookId = '11111111-1111-4111-8111-111111111111';
const ownerId = '22222222-2222-4222-8222-222222222222';

test('book approval locks the reviewed content and only owner approval unlocks printing', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create type public.book_production_status as enum ('writing', 'editing', 'printing', 'ready', 'delivery', 'received');
      create table public.profiles (id uuid primary key);
      insert into public.profiles values ('${ownerId}');
      create table public.books (
        id uuid primary key,
        owner_id uuid not null references public.profiles(id),
        title text not null default 'Book',
        production_status public.book_production_status not null default 'editing',
        updated_at timestamptz not null default now(),
        deleted_at timestamptz
      );
      insert into public.books(id, owner_id) values ('${bookId}', '${ownerId}');
    `);
    for (const table of ['answers', 'chapters', 'questions', 'book_covers', 'book_page_images', 'book_question_pages', 'book_photo_texts']) {
      await db.exec(`create table public.${table} (id uuid primary key default gen_random_uuid(), book_id uuid not null references public.books(id), content text default 'draft');`);
    }
    await db.exec('grant select, update on public.books to service_role; grant select, insert, update, delete on public.answers to service_role;');
    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202609220001_add_book_approval_status.sql'), 'utf8'));
    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202609220002_book_approval_workflow.sql'), 'utf8'));

    await db.exec('set role service_role;');
    await assert.rejects(db.query("update books set production_status='ready' where id=$1", [bookId]), /requires owner approval/);
    assert.equal((await db.query('select request_book_approval($1) ok', [bookId])).rows[0].ok, true);
    assert.equal((await db.query('select production_status from books where id=$1', [bookId])).rows[0].production_status, 'approval');
    await assert.rejects(db.query("insert into answers(book_id,content) values($1,'changed')", [bookId]), /locked/);
    await assert.rejects(db.query("update books set production_status='printing' where id=$1", [bookId]), /requires owner approval/);
    assert.equal((await db.query("select decide_book_approval($1,$2,'changes_requested','') ok", [bookId, ownerId])).rows[0].ok, false);
    assert.equal((await db.query("select decide_book_approval($1,$2,'changes_requested','Fix the cover') ok", [bookId, ownerId])).rows[0].ok, true);
    assert.equal((await db.query('select production_status from books where id=$1', [bookId])).rows[0].production_status, 'editing');
    await db.query("insert into answers(book_id,content) values($1,'corrected')", [bookId]);
    assert.equal((await db.query("select feedback from book_approval_requests where status='changes_requested'")).rows[0].feedback, 'Fix the cover');

    assert.equal((await db.query('select request_book_approval($1) ok', [bookId])).rows[0].ok, true);
    assert.equal((await db.query("select decide_book_approval($1,$2,'approved',null) ok", [bookId, '33333333-3333-4333-8333-333333333333'])).rows[0].ok, false);
    assert.equal((await db.query("select decide_book_approval($1,$2,'approved',null) ok", [bookId, ownerId])).rows[0].ok, true);
    assert.equal((await db.query('select production_status from books where id=$1', [bookId])).rows[0].production_status, 'printing');
    await assert.rejects(db.query("update books set title='Unapproved change' where id=$1", [bookId]), /locked/);
    await assert.rejects(db.query("update answers set content='Unapproved change' where book_id=$1", [bookId]), /locked/);
    await db.query("update books set production_status='ready' where id=$1", [bookId]);
    assert.equal((await db.query('select production_status from books where id=$1', [bookId])).rows[0].production_status, 'ready');
  } finally {
    await db.close();
  }
});
