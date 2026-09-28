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

function loadFinanceCalculations() {
  const source = ts.transpileModule(readFileSync(resolve(root, 'src/lib/admin/finance.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => {
    if (name === 'server-only') return {};
    if (name === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => null };
    return require(name);
  }, loaded, loaded.exports);
  return loaded.exports;
}

test('finance totals ignore voided operations and separate price from received cash', () => {
  const { financeTotals } = loadFinanceCalculations();
  const entry = (kind, amount, voidedAt = null) => ({ kind, amount, voidedAt });
  const result = financeTotals(50000, [
    entry('deposit', 10000), entry('payment', 15000), entry('refund', 2000),
    entry('printing', 5000), entry('delivery', 1000), entry('other_cost', 400),
    entry('payment', 100000, '2026-09-22T00:00:00Z'),
  ]);
  assert.equal(result.price, 50000);
  assert.equal(result.received, 23000);
  assert.equal(result.outstanding, 27000);
  assert.equal(result.costs, 6400);
  assert.equal(result.cashResult, 16600);
  assert.equal(financeTotals(null, []).outstanding, null);
  assert.equal(financeTotals(100, [entry('payment', 150)]).outstanding, 0);
});

test('day, week and month buckets use operation dates and omit voided events', () => {
  const { buildFinanceBuckets } = loadFinanceCalculations();
  const entry = (kind, amount, occurredOn, voidedAt = null) => ({ kind, amount, occurredOn, voidedAt });
  const events = [
    entry('deposit', 1000, '2026-01-01'),
    entry('refund', 100, '2026-01-03'),
    entry('printing', 200, '2026-01-04'),
    entry('payment', 300, '2026-01-05'),
    entry('payment', 999, '2026-01-05', '2026-01-06T00:00:00Z'),
  ];
  const weeks = buildFinanceBuckets(events, 'week', '2026-01-06');
  assert.deepEqual(weeks.slice(-2).map(({ key, received, refunds, costs }) => ({ key, received, refunds, costs })), [
    { key: '2025-12-29', received: 1000, refunds: 100, costs: 200 },
    { key: '2026-01-05', received: 300, refunds: 0, costs: 0 },
  ]);
  const months = buildFinanceBuckets(events, 'month', '2026-01-06');
  assert.deepEqual(months.at(-1) && [months.at(-1).key, months.at(-1).received, months.at(-1).refunds, months.at(-1).costs], ['2026-01-01', 1300, 100, 200]);
  const days = buildFinanceBuckets(events, 'day', '2026-01-06');
  assert.equal(days.length, 30);
  assert.equal(days.find(({ key }) => key === '2026-01-05').received, 300);
});

test('finance migration audits prices and prevents negative balances or ledger rewriting', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table public.books (id uuid primary key);
      insert into public.books values ('${bookId}');`);
    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202609220004_book_finances.sql'), 'utf8'));
    await assert.rejects(db.query('insert into book_finance_entries(book_id, kind, amount_kzt, occurred_on) values ($1, $2, $3, $4)', [bookId, 'deposit', 100, '2026-09-22']), /finance_price_required/);
    await db.query('insert into book_finances(book_id, agreed_price_kzt, updated_by_email) values ($1, $2, $3)', [bookId, 10000, 'admin@example.com']);
    await db.query('update book_finances set agreed_price_kzt=$1 where book_id=$2', [12000, bookId]);
    assert.deepEqual((await db.query('select old_price_kzt, new_price_kzt from book_finance_price_changes order by changed_at, old_price_kzt nulls first')).rows.map(row => [row.old_price_kzt, row.new_price_kzt]), [[null, '10000'], ['10000', '12000']]);
    await assert.rejects(db.query('insert into book_finance_entries(book_id, kind, amount_kzt, occurred_on) values ($1, $2, $3, $4)', [bookId, 'refund', 1, '2026-09-22']), /finance_refund_exceeds_received/);
    const payment = await db.query('insert into book_finance_entries(book_id, kind, amount_kzt, occurred_on) values ($1, $2, $3, $4) returning id', [bookId, 'deposit', 1000, '2026-09-22']);
    const paymentId = payment.rows[0].id;
    await db.query('insert into book_finance_entries(book_id, kind, amount_kzt, occurred_on) values ($1, $2, $3, $4)', [bookId, 'refund', 400, '2026-09-22']);
    await assert.rejects(db.query('update book_finance_entries set amount_kzt=2000 where id=$1', [paymentId]), /finance_entry_immutable/);
    await assert.rejects(db.query('update book_finance_entries set voided_at=now(), voided_by_email=$1 where id=$2', ['admin@example.com', paymentId]), /finance_refund_exceeds_received/);
    await db.query("update book_finance_entries set voided_at=now(), voided_by_email='admin@example.com' where kind='refund'");
    await db.query('update book_finance_entries set voided_at=now(), voided_by_email=$1 where id=$2', ['admin@example.com', paymentId]);
    await assert.rejects(db.query('update book_finance_entries set voided_at=null where id=$1', [paymentId]), /finance_entry_immutable/);
    await db.exec('set role authenticated;');
    await assert.rejects(db.query('select * from book_finance_entries'), /permission denied/);
    await db.exec('reset role; set role anon;');
    await assert.rejects(db.query('select * from book_finances'), /permission denied/);
  } finally { await db.close(); }
});
