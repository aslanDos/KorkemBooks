import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, '..');
const bookId = '11111111-1111-4111-8111-111111111111';
function load(relative, mocks = {}) {
  const source = ts.transpileModule(readFileSync(resolve(root, relative), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loadedModule = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => name === 'server-only' ? {} : mocks[name] ?? require(name), loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const deliveryModule = load('src/lib/books/delivery.ts');
function fixture(overrides = {}) {
  const calls = [];
  const state = { role: 'admin', book: { id: bookId }, bookError: null, writeError: null, delivery: null, readError: null, configured: true, ...overrides };
  const client = { from(table) {
    const query = {
      select() { return query; },
      eq(field, value) { calls.push(['eq', table, field, value]); return query; },
      is(field, value) { calls.push(['is', table, field, value]); return query; },
      async maybeSingle() { return table === 'books' ? { data: state.book, error: state.bookError } : { data: state.delivery, error: state.readError }; },
      async upsert(value, options) { calls.push(['upsert', value, options]); if (!state.writeError) state.delivery = value; return { error: state.writeError }; },
    };
    return query;
  } };
  const mocks = {
    '@/lib/books/delivery': deliveryModule,
    '@/lib/auth/current-user': { getCurrentUser: async () => state.role ? { role: state.role } : null },
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => state.configured ? client : null },
    'next/cache': { revalidatePath: path => calls.push(['revalidate', path]) },
  };
  return { state, calls, ...load('src/app/admin/books/[bookId]/actions.ts', mocks), ...load('src/lib/admin/book-delivery.ts', mocks) };
}
function form(values = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ bookId, city: ' Алматы ', address: ' Абая, 10 ', ...values })) data.set(key, value);
  return data;
}

test('delivery saves trimmed city/address and reloads them for the same book', async () => {
  const f = fixture();
  assert.deepEqual(await f.saveBookDeliveryAction({}, form()), { success: true });
  assert.deepEqual(f.calls.find(call => call[0] === 'upsert'), ['upsert', { book_id: bookId, pickup: false, city: 'Алматы', address: 'Абая, 10' }, { onConflict: 'book_id' }]);
  assert.ok(f.calls.some(call => call[0] === 'is' && call[2] === 'deleted_at' && call[3] === null));
  assert.ok(f.calls.some(call => call[0] === 'revalidate' && call[1] === `/admin/books/${bookId}`));
  assert.deepEqual(await f.getAdminBookDelivery(bookId), { delivery: { pickup: false, city: 'Алматы', address: 'Абая, 10' } });
});
test('pickup needs no address and clears obsolete delivery details', async () => {
  const f = fixture();
  assert.deepEqual(await f.saveBookDeliveryAction({}, form({ pickup: 'on', city: '', address: '' })), { success: true });
  assert.deepEqual(f.state.delivery, { book_id: bookId, pickup: true, city: '', address: '' });
  assert.deepEqual(await f.saveBookDeliveryAction({}, form({ pickup: 'on' })), { success: true });
  assert.equal(f.state.delivery.address, '');
});
test('missing, whitespace-only and oversized delivery fields are rejected without writes', async () => {
  for (const values of [{ city: '' }, { address: '   ' }, { city: 'x'.repeat(121) }, { address: 'x'.repeat(501) }, { bookId: 'invalid' }]) {
    const f = fixture();
    assert.ok((await f.saveBookDeliveryAction({}, form(values))).error);
    assert.equal(f.calls.length, 0);
  }
});
test('only admins can read or save delivery information', async () => {
  for (const role of [null, 'user', 'manager']) {
    const f = fixture({ role });
    assert.deepEqual(await f.saveBookDeliveryAction({}, form()), { error: 'Недостаточно прав' });
    assert.deepEqual(await f.getAdminBookDelivery(bookId), { delivery: null, error: 'Недостаточно прав' });
    assert.equal(f.calls.length, 0);
  }
});
test('missing books and database failures do not report success', async () => {
  for (const state of [{ book: null }, { bookError: { code: 'x' } }, { configured: false }, { writeError: { code: 'x' } }]) {
    const f = fixture(state);
    assert.ok((await f.saveBookDeliveryAction({}, form())).error);
    assert.ok(!f.calls.some(call => call[0] === 'revalidate'));
  }
  const missing = fixture({ writeError: { code: 'PGRST205' }, readError: { code: '42P01' } });
  assert.equal((await missing.saveBookDeliveryAction({}, form())).error, deliveryModule.DELIVERY_MIGRATION_ERROR);
  assert.equal((await missing.getAdminBookDelivery(bookId)).error, deliveryModule.DELIVERY_MIGRATION_ERROR);
  assert.deepEqual(await fixture().getAdminBookDelivery(bookId), { delivery: null });
});
test('migration enforces valid delivery data and restricts access through RLS', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid', true), '')::uuid$$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
      create table public.books (id uuid primary key);
      create table public.profiles (id uuid primary key, role text);
      grant select on public.profiles to authenticated;
      create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now(); return new; end;$$;
      insert into public.books values ('${bookId}');
      insert into public.profiles values ('${bookId}', 'admin'), ('22222222-2222-4222-8222-222222222222', 'user');`);
    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202609150015_add_book_deliveries.sql'), 'utf8'));
    await assert.rejects(db.query('insert into book_deliveries (book_id) values ($1)', [bookId]), /book_deliveries_address_required/);
    await db.query('insert into book_deliveries (book_id, pickup) values ($1, true)', [bookId]);
    await assert.rejects(db.query('update book_deliveries set city=$1', ['x'.repeat(121)]), /check constraint/);
    await db.exec(`set role authenticated; set test.uid='22222222-2222-4222-8222-222222222222';`);
    assert.equal((await db.query('select * from book_deliveries')).rows.length, 0);
    assert.equal((await db.query("update book_deliveries set city='Other' returning *")).rows.length, 0);
    await db.exec(`set test.uid='${bookId}';`);
    assert.equal((await db.query('select * from book_deliveries')).rows.length, 1);
    await db.query('update book_deliveries set pickup=false, city=$1, address=$2', ['Алматы', 'Абая, 10']);
    assert.equal((await db.query('select address from book_deliveries')).rows[0].address, 'Абая, 10');
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select * from book_deliveries'), /permission denied/);
  } finally { await db.close(); }
});

test('pickup hides and disables address fields; toggling back retains typed text', () => {
  const values = [];
  let cursor = 0;
  let actionState = {};
  let pending = false;
  const { BookDeliveryForm } = load('src/components/admin/book-delivery-form.tsx', {
    react: {
      useState(initial) { const index = cursor++; if (!(index in values)) values[index] = initial; return [values[index], next => { values[index] = next; }]; },
      useActionState: () => [actionState, () => {}, pending],
    },
    '@/app/admin/books/[bookId]/actions': { saveBookDeliveryAction: () => {} },
  });
  const render = (props = {}) => { cursor = 0; return BookDeliveryForm({ bookId, delivery: null, ...props }); };
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) return node.map(item => find(item, predicate)).find(Boolean);
    if (predicate(node)) return node;
    return find(node.props?.children, predicate);
  }
  const named = (tree, name) => find(tree, node => node.props?.name === name);
  const fields = tree => find(tree, node => node.props?.className === 'book-delivery-fields');
  let tree = render();
  named(tree, 'city').props.onChange({ target: { value: 'Алматы' } });
  named(tree, 'address').props.onChange({ target: { value: 'Абая, 10' } });
  named(tree, 'pickup').props.onChange({ target: { checked: true } });
  tree = render();
  assert.equal(fields(tree).props.hidden, true);
  assert.equal(fields(tree).props.disabled, true);
  assert.equal(named(tree, 'city').props.required, false);
  named(tree, 'pickup').props.onChange({ target: { checked: false } });
  tree = render();
  assert.equal(fields(tree).props.hidden, false);
  assert.equal(named(tree, 'city').props.value, 'Алматы');
  assert.equal(named(tree, 'address').props.value, 'Абая, 10');
  assert.equal(named(tree, 'address').props.required, true);
  actionState = { error: 'Ошибка сохранения' };
  tree = render();
  assert.equal(named(tree, 'address').props.value, 'Абая, 10');
  assert.equal(find(tree, node => node.props?.role === 'status').props.children, actionState.error);
  pending = true;
  assert.equal(find(render(), node => node.type === 'button').props.disabled, true);
  pending = false;
  const unavailable = render({ loadError: 'Примените миграцию' });
  assert.equal(find(unavailable, node => node.type === 'fieldset').props.disabled, true);
  assert.equal(find(unavailable, node => node.type === 'button').props.disabled, true);
});
