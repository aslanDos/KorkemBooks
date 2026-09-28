import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(import.meta.dirname, '..');

test('removed recipient types and all of their database records are deleted', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table public.book_types (id uuid primary key default gen_random_uuid(), slug text not null unique);
      create table public.profiles (id uuid primary key default gen_random_uuid(), book_type_id uuid references public.book_types(id) on delete restrict);
      create table public.books (id uuid primary key default gen_random_uuid(), type_id uuid not null references public.book_types(id));
      create table public.question_catalog (id uuid primary key default gen_random_uuid(), book_type_id uuid not null references public.book_types(id));
      create table public.questions (id uuid primary key default gen_random_uuid(), book_id uuid not null references public.books(id) on delete cascade, catalog_id uuid references public.question_catalog(id));
      create table public.orders (id uuid primary key default gen_random_uuid(), book_id uuid not null references public.books(id) on delete cascade);

      insert into public.book_types(slug) values ('son'), ('daughter'), ('friend');
      insert into public.profiles(book_type_id) select id from public.book_types where slug='son';
      insert into public.books(type_id) select id from public.book_types where slug in ('son', 'daughter', 'friend');
      insert into public.question_catalog(book_type_id) select id from public.book_types;
      insert into public.questions(book_id, catalog_id)
      select books.id, catalog.id from public.books as books
      join public.question_catalog as catalog on catalog.book_type_id=books.type_id;
      insert into public.orders(book_id) select id from public.books;
    `);

    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202609290004_remove_son_and_daughter_book_types.sql'), 'utf8'));

    assert.deepEqual((await db.query('select slug from book_types order by slug')).rows, [{ slug: 'friend' }]);
    assert.equal((await db.query('select book_type_id from profiles')).rows[0].book_type_id, null);
    assert.equal((await db.query('select count(*)::int count from books')).rows[0].count, 1);
    assert.equal((await db.query('select count(*)::int count from question_catalog')).rows[0].count, 1);
    assert.equal((await db.query('select count(*)::int count from questions')).rows[0].count, 1);
    assert.equal((await db.query('select count(*)::int count from orders')).rows[0].count, 1);
  } finally {
    await db.close();
  }
});
