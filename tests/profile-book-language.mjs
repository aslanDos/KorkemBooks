import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(import.meta.dirname, '..');
const userId = '11111111-1111-4111-8111-111111111111';
const newUserId = '22222222-2222-4222-8222-222222222222';
const adminId = '33333333-3333-4333-8333-333333333333';
const managerId = '44444444-4444-4444-8444-444444444444';
const typeId = '55555555-5555-4555-8555-555555555555';
const otherTypeId = '66666666-6666-4666-8666-666666666666';

test('profile language is assigned to user books and cannot be overridden by the user', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create type public.app_role as enum ('admin', 'manager', 'user');
      create type public.book_language as enum ('ru', 'kk', 'en');
      create table public.book_types (id uuid primary key);
      create table public.profiles (
        id uuid primary key,
        role public.app_role not null,
        book_type_id uuid references public.book_types(id)
      );
      create table public.books (
        id uuid primary key default gen_random_uuid(),
        owner_id uuid not null references public.profiles(id),
        type_id uuid not null references public.book_types(id),
        language public.book_language not null default 'ru',
        created_at timestamptz not null default now(),
        deleted_at timestamptz
      );
      insert into public.book_types values ('${typeId}'), ('${otherTypeId}');
      insert into public.profiles values
        ('${userId}', 'user', '${typeId}'),
        ('${newUserId}', 'user', '${typeId}'),
        ('${adminId}', 'admin', null),
        ('${managerId}', 'manager', null);
      insert into public.books(owner_id, type_id, language)
      values ('${userId}', '${typeId}', 'kk');
    `);

    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202609290003_assign_book_language_to_profiles.sql'), 'utf8'));

    assert.equal((await db.query('select book_language from profiles where id=$1', [userId])).rows[0].book_language, 'kk');
    assert.equal((await db.query('select book_language from profiles where id=$1', [newUserId])).rows[0].book_language, 'ru');
    assert.equal((await db.query('select book_language from profiles where id=$1', [managerId])).rows[0].book_language, null);

    await db.query('insert into books(owner_id, type_id, language) values ($1, $2, $3)', [newUserId, typeId, 'ru']);
    await assert.rejects(
      db.query('insert into books(owner_id, type_id, language) values ($1, $2, $3)', [newUserId, otherTypeId, 'ru']),
      /recipient type must match/i,
    );
    await assert.rejects(
      db.query('insert into books(owner_id, type_id, language) values ($1, $2, $3)', [newUserId, typeId, 'kk']),
      /language must match/i,
    );

    await db.query('insert into books(owner_id, type_id, language) values ($1, $2, $3)', [adminId, otherTypeId, 'kk']);
  } finally {
    await db.close();
  }
});
