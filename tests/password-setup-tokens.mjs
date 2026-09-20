import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(import.meta.dirname, '..');
const userId = '11111111-1111-4111-8111-111111111111';

test('password setup tokens store only hashes and are inaccessible to app roles', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key);
      insert into auth.users values ('${userId}');
    `);
    await db.exec(readFileSync(resolve(root, 'supabase/migrations/202609200001_create_password_setup_tokens.sql'), 'utf8'));

    const tokenHash = 'a'.repeat(64);
    await db.query(
      `insert into password_setup_tokens (user_id, token_hash, purpose, expires_at)
       values ($1, $2, 'invite', now() + interval '7 days')`,
      [userId, tokenHash],
    );
    const stored = await db.query('select token_hash, purpose, used_at from password_setup_tokens');
    assert.deepEqual(stored.rows, [{ token_hash: tokenHash, purpose: 'invite', used_at: null }]);

    await assert.rejects(
      db.query(
        `insert into password_setup_tokens (user_id, token_hash, purpose, expires_at)
         values ($1, $2, 'unknown', now() + interval '1 day')`,
        [userId, 'b'.repeat(64)],
      ),
      /check constraint/,
    );
    await assert.rejects(
      db.query(
        `insert into password_setup_tokens (user_id, token_hash, purpose, expires_at)
         values ($1, 'raw-token', 'reset', now() + interval '1 day')`,
        [userId],
      ),
      /check constraint/,
    );

    await db.exec('set role anon;');
    await assert.rejects(db.query('select * from password_setup_tokens'), /permission denied/);
    await db.exec('reset role; set role authenticated;');
    await assert.rejects(db.query('select * from password_setup_tokens'), /permission denied/);
    await db.exec('reset role; set role service_role;');
    assert.equal((await db.query('select * from password_setup_tokens')).rows.length, 1);
  } finally {
    await db.close();
  }
});
