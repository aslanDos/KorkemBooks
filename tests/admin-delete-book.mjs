import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(import.meta.dirname, '..');

test('hard deleting a book cascades through its questions and order', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table public.books (id uuid primary key default gen_random_uuid());
      create table public.questions (
        id uuid primary key default gen_random_uuid(),
        book_id uuid not null references public.books(id) on delete cascade
      );
      create table public.orders (
        id uuid primary key default gen_random_uuid(),
        book_id uuid not null references public.books(id) on delete restrict
      );
      insert into public.books default values;
      insert into public.questions(book_id) select id from public.books;
      insert into public.orders(book_id) select id from public.books;
    `);
    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202609290002_cascade_orders_on_book_delete.sql'), 'utf8'));
    await db.exec('delete from public.books;');
    assert.equal((await db.query('select count(*)::int count from public.questions')).rows[0].count, 0);
    assert.equal((await db.query('select count(*)::int count from public.orders')).rows[0].count, 0);
  } finally {
    await db.close();
  }
});
