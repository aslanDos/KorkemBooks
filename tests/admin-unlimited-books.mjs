import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const adminId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const managerId = '33333333-3333-4333-8333-333333333333';
const typeId = '44444444-4444-4444-8444-444444444444';
const otherTypeId = '55555555-5555-4555-8555-555555555555';

function bookActionFixture(role, existingBook = false) {
  let inserted = null;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: role === 'admin' ? adminId : userId } } }) },
    from(table) {
      let selectedId = null;
      const query = {
        select() { return query; },
        eq(field, value) { if (field === 'id') selectedId = value; return query; },
        is() { return query; },
        limit() { return query; },
        async maybeSingle() {
          if (table === 'profiles') return { data: { role, book_type_id: otherTypeId, book_language: 'kk' } };
          if (table === 'books') return { data: existingBook ? { id: 'existing' } : null };
          return { data: { id: selectedId } };
        },
        insert(value) { inserted = value; return query; },
        async single() { return { data: { id: '66666666-6666-4666-8666-666666666666' }, error: null }; },
      };
      return query;
    },
  };
  const source = ts.transpileModule(readFileSync(resolve(root, 'src/app/dashboard/books/actions.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  const mocks = {
    'next/navigation': { redirect: path => { throw new Error(`redirect:${path}`); } },
    'next/cache': { revalidatePath() {} },
    '@/lib/supabase/server': { createSupabaseServerClient: async () => client },
    '@/lib/books/queries': { refreshBookPageProgress: async () => 0 },
    '@/lib/books/language': {
      isAvailableBookLanguage: value => value === 'ru' || value === 'kk',
      isBookLanguage: value => ['ru', 'kk', 'en'].includes(value),
    },
    '@/lib/books/catalog': { isRemovedBookTypeSlug: value => value === 'son' || value === 'daughter' },
    '@/lib/books/validation': {
      createBookSchema: { safeParse: input => ({ success: true, data: { title: input.title, authorName: input.authorName, recipientName: input.recipientName } }) },
    },
  };
  new Function('require', 'module', 'exports', source)(name => mocks[name] ?? require(name), loaded, loaded.exports);
  return { action: loaded.exports.createBookAction, getInserted: () => inserted };
}

function createForm(selectedType = typeId) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ title: 'Новая книга', authorName: 'Автор', recipientName: '', language: 'ru', typeId: selectedType })) form.set(key, value);
  return form;
}

test('admin book creation ignores the one-book guard and selects a type per book', async () => {
  const admin = bookActionFixture('admin', true);
  await assert.rejects(admin.action({}, createForm()), /redirect:\/dashboard\/books\//);
  assert.equal(admin.getInserted().type_id, typeId);
  assert.equal((await admin.action({}, createForm('invalid'))).error, 'Выберите тип получателя');

  const user = bookActionFixture('user', true);
  assert.match((await user.action({}, createForm())).error, /только одну книгу/);
  const newUser = bookActionFixture('user', false);
  await assert.rejects(newUser.action({}, createForm()), /redirect:\/dashboard\/books\//);
  assert.equal(newUser.getInserted().type_id, otherTypeId);
  assert.equal(newUser.getInserted().language, 'kk');
});

test('admins can create multiple active books while other roles remain limited to one', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create type public.app_role as enum ('admin', 'manager', 'user');
      create table public.profiles (id uuid primary key, role public.app_role not null);
      create table public.books (id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id), deleted_at timestamptz);
      create unique index books_one_active_book_per_owner on public.books(owner_id) where deleted_at is null;
      insert into public.profiles values
        ('${adminId}', 'admin'), ('${userId}', 'user'), ('${managerId}', 'manager');
      insert into public.books(owner_id) values ('${adminId}'), ('${userId}'), ('${managerId}');`);
    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202609220005_allow_unlimited_admin_books.sql'), 'utf8'));

    await db.query('insert into books(owner_id) values ($1), ($1), ($1)', [adminId]);
    assert.equal((await db.query('select count(*) as count from books where owner_id=$1 and deleted_at is null', [adminId])).rows[0].count, 4);
    for (const id of [userId, managerId]) {
      await assert.rejects(db.query('insert into books(owner_id) values ($1)', [id]), /books_one_active_book_per_owner/);
    }

    const firstUserBook = (await db.query('select id from books where owner_id=$1', [userId])).rows[0].id;
    await db.query('update books set deleted_at=now() where id=$1', [firstUserBook]);
    await db.query('insert into books(owner_id) values ($1)', [userId]);
    await assert.rejects(db.query('update books set deleted_at=null where id=$1', [firstUserBook]), /books_one_active_book_per_owner/);
    await assert.rejects(db.query("update profiles set role='user' where id=$1", [adminId]), /admin_has_multiple_active_books/);
  } finally { await db.close(); }
});
