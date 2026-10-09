import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(import.meta.dirname, '..');

test('book personalization stores optional genders and bounded back-cover text', async () => {
  const db = new PGlite();
  try {
    await db.exec('create table public.books (id uuid primary key default gen_random_uuid())');
    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202610100001_add_book_personalization.sql'), 'utf8'));

    const inserted = await db.query("insert into public.books(author_gender, recipient_gender, back_cover_text) values ('female', 'male', 'С любовью') returning author_gender, recipient_gender, back_cover_text");
    assert.deepEqual(inserted.rows[0], { author_gender: 'female', recipient_gender: 'male', back_cover_text: 'С любовью' });

    const neutral = await db.query('insert into public.books default values returning author_gender, recipient_gender, back_cover_text');
    assert.deepEqual(neutral.rows[0], { author_gender: null, recipient_gender: null, back_cover_text: '' });

    await assert.rejects(db.query("insert into public.books(author_gender) values ('unknown')"), /books_author_gender_check/);
    await assert.rejects(db.query("insert into public.books(recipient_gender) values ('unknown')"), /books_recipient_gender_check/);
    await assert.rejects(db.query('insert into public.books(back_cover_text) values ($1)', ['x'.repeat(1001)]), /books_back_cover_text_check/);
  } finally {
    await db.close();
  }
});
