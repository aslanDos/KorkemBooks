import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(import.meta.dirname, '..');

test('books default to the recommended writing style and reject unknown values', async () => {
  const db = new PGlite();
  try {
    await db.exec('create table public.books (id uuid primary key default gen_random_uuid())');
    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202610080002_add_book_writing_style.sql'), 'utf8'));
    const inserted = await db.query('insert into public.books default values returning writing_style');
    assert.equal(inserted.rows[0].writing_style, 'warm_story');
    await db.query("insert into public.books(writing_style) values ('live_story'), ('literary_story')");
    await assert.rejects(db.query("insert into public.books(writing_style) values ('unknown')"), /books_writing_style_check/);
  } finally {
    await db.close();
  }
});
