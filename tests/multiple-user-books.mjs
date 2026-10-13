import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(import.meta.dirname, '..');
const ownerWithBook = '11111111-1111-4111-8111-111111111111';
const ownerWithoutBook = '22222222-2222-4222-8222-222222222222';
const adminId = '33333333-3333-4333-8333-333333333333';
const typeId = '44444444-4444-4444-8444-444444444444';

test('book entitlements preserve existing books and allow independent additional books', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      create type public.app_role as enum ('admin', 'manager', 'user');
      create type public.book_language as enum ('ru', 'kk', 'en');
      create table public.profiles (
        id uuid primary key,
        role public.app_role not null,
        book_type_id uuid,
        book_language public.book_language
      );
      create table public.book_types (
        id uuid primary key,
        slug text not null,
        name text not null,
        is_active boolean not null default true
      );
      alter table public.profiles add constraint profiles_type_fk foreign key (book_type_id) references public.book_types(id);
      create table public.books (
        id uuid primary key default gen_random_uuid(),
        owner_id uuid not null references public.profiles(id),
        type_id uuid not null references public.book_types(id),
        language public.book_language not null,
        title text not null,
        author_name text not null,
        recipient_name text not null,
        recipient_gender text,
        author_gender text,
        back_cover_text text not null default '',
        writing_style text not null default 'warm_story',
        created_at timestamptz not null default now(),
        deleted_at timestamptz
      );
      alter table public.books enable row level security;
      grant select, insert, update on public.books to authenticated;
      create policy "Users can read their own books" on public.books for select to authenticated
        using (auth.uid() = owner_id);
      create policy "Users can create their own books" on public.books for insert to authenticated
        with check (auth.uid() = owner_id);
      create function public.guard_regular_book_limit() returns trigger language plpgsql as $$ begin return new; end $$;
      create trigger books_regular_owner_limit before insert on public.books for each row execute function public.guard_regular_book_limit();
      create function public.guard_admin_role_demotion_with_books() returns trigger language plpgsql as $$ begin return new; end $$;
      create trigger profiles_guard_admin_book_limit before update on public.profiles for each row execute function public.guard_admin_role_demotion_with_books();
      create function public.guard_user_book_assignment() returns trigger language plpgsql as $$ begin return new; end $$;
      create trigger books_guard_user_assignment before insert on public.books for each row execute function public.guard_user_book_assignment();
      insert into public.book_types(id, slug, name) values ('${typeId}', 'mother', 'Маме');
      insert into public.profiles(id, role, book_type_id, book_language) values
        ('${ownerWithBook}', 'user', '${typeId}', 'ru'),
        ('${ownerWithoutBook}', 'user', '${typeId}', 'kk'),
        ('${adminId}', 'admin', null, null);
      insert into public.books(owner_id, type_id, language, title, author_name, recipient_name)
        values ('${ownerWithBook}', '${typeId}', 'ru', 'Первая', 'Автор', 'Мама');
    `);

    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202610130001_support_multiple_user_books.sql'), 'utf8'));

    const migrated = await db.query('select owner_id, book_id, language from book_entitlements order by owner_id');
    assert.equal(migrated.rows.length, 2);
    assert.ok(migrated.rows.find(row => row.owner_id === ownerWithBook)?.book_id);
    assert.equal(migrated.rows.find(row => row.owner_id === ownerWithoutBook)?.book_id, null);

    await db.exec(`insert into book_entitlements(owner_id, type_id, language, granted_by)
      values ('${ownerWithBook}', '${typeId}', 'kk', '${adminId}')`);
    const entitlement = (await db.query('select id from book_entitlements where owner_id=$1 and book_id is null', [ownerWithBook])).rows[0];

    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${ownerWithBook}', false);`);
    const created = await db.query(
      `select create_book_from_entitlement($1, 'Ещё одна история', 'Автор', 'Мама', null, null, '', 'warm_story') as id`,
      [entitlement.id],
    );
    assert.ok(created.rows[0].id);
    assert.equal((await db.query('select count(*) as count from books where owner_id=$1', [ownerWithBook])).rows[0].count, 2);
    await assert.rejects(
      db.query(`select create_book_from_entitlement($1, 'Дубликат', 'Автор', 'Мама', null, null, '', 'warm_story')`, [entitlement.id]),
      /not available/,
    );
    await assert.rejects(
      db.query(`insert into books(owner_id, type_id, language, title, author_name, recipient_name) values ($1, $2, 'ru', 'В обход', 'Автор', 'Мама')`, [ownerWithBook, typeId]),
      /row-level security|permission denied/,
    );
  } finally {
    await db.close();
  }
});
