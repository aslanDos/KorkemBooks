import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(import.meta.dirname, '..');
const userId = '11111111-1111-4111-8111-111111111111';
const newUserId = '22222222-2222-4222-8222-222222222222';
const bookTypeId = '33333333-3333-4333-8333-333333333333';

test('profile migration assigns existing book type and removes account names', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create schema auth;
      create table auth.users (
        id uuid primary key,
        raw_user_meta_data jsonb
      );
      create table public.book_types (id uuid primary key);
      create table public.profiles (
        id uuid primary key references auth.users (id),
        role text not null default 'user',
        display_name text,
        phone_e164 text
      );
      create table public.books (
        id uuid primary key,
        owner_id uuid references public.profiles (id),
        type_id uuid references public.book_types (id),
        deleted_at timestamptz
      );
      create function public.handle_new_auth_user()
      returns trigger language plpgsql security definer set search_path = '' as $$
      begin
        insert into public.profiles (id, display_name)
        values (new.id, new.raw_user_meta_data ->> 'display_name');
        return new;
      end;
      $$;
      create trigger on_auth_user_created after insert on auth.users
      for each row execute function public.handle_new_auth_user();
      insert into public.book_types values ('${bookTypeId}');
      insert into auth.users values (
        '${userId}',
        '{"display_name":"Старое имя","phone_e164":"+77011234567"}'
      );
      insert into public.books values (
        '44444444-4444-4444-8444-444444444444',
        '${userId}',
        '${bookTypeId}',
        null
      );
    `);

    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202609210001_assign_book_type_to_profiles.sql'), 'utf8'));

    const profile = await db.query('select id, phone_e164, book_type_id from profiles where id=$1', [userId]);
    assert.deepEqual(profile.rows, [{ id: userId, phone_e164: null, book_type_id: bookTypeId }]);
    const columns = await db.query("select column_name from information_schema.columns where table_schema='public' and table_name='profiles'");
    assert.equal(columns.rows.some(column => column.column_name === 'display_name'), false);
    const metadata = await db.query('select raw_user_meta_data from auth.users where id=$1', [userId]);
    assert.deepEqual(metadata.rows[0].raw_user_meta_data, { phone_e164: '+77011234567' });

    await db.query(
      'insert into auth.users values ($1, $2)',
      [newUserId, { display_name: 'Не сохранять', phone_e164: '+77022345678' }],
    );
    const newProfile = await db.query('select phone_e164, book_type_id from profiles where id=$1', [newUserId]);
    assert.deepEqual(newProfile.rows, [{ phone_e164: '+77022345678', book_type_id: null }]);
  } finally {
    await db.close();
  }
});
