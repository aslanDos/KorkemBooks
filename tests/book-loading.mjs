import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = ts.transpileModule(readFileSync(new URL('../src/lib/books/queries.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const bookTypes = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(
  readFileSync(new URL('../src/lib/books/types.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText)(require, bookTypes, bookTypes.exports);
const palettes = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(
  readFileSync(new URL('../src/lib/books/cover-palettes.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText)(name => name === './types' ? bookTypes.exports : require(name), palettes, palettes.exports);

function fixture({ missing = false } = {}) {
  const calls = [];
  const rows = {
    books: missing ? null : { id: 'book', title: 'Book', round_photos: true, hide_photo_footers: true, page_background_style: 'burgundy', book_types: { name: 'Memoir' } },
    chapters: [{ id: 'chapter', title: 'Childhood', position: 1 }],
    questions: [{ id: 'question', chapter_id: 'chapter', catalog_id: 'catalog', prompt: 'Home?', position: 1 }],
    answers: [{ question_id: 'question', answer_text: 'My home' }],
    book_page_images: [
      { id: 'image1', question_id: 'question', storage_path: 'photo', position: 1, rounded_corners: true, collage_layout: 'two_columns', collage_images: [{ id: 'collage2', slot: 2, storagePath: 'collage-photo', mimeType: 'image/jpeg', sizeBytes: 1200, cropX: 4, cropY: -2, cropScale: 1.2 }] },
      { id: 'image2', question_id: 'question', storage_path: 'photo', position: 2 },
    ],
    book_question_pages: [
      { id: 'page1', question_id: 'question', image_id: 'image1', kind: 'photo', placement: 'after', position: 1, background_style: 'burgundy' },
      { id: 'blank1', question_id: 'question', image_id: null, kind: 'blank', placement: 'after', position: 2, background_style: 'olive' },
      { id: 'text1', question_id: 'question', image_id: null, kind: 'text', placement: 'after', position: 3, background_style: 'navy', text_content: 'A meaningful quote', text_attribution: 'Author', text_style: 'quote', text_size: 28, hide_footer: true },
      { id: 'page2', question_id: 'question', image_id: 'image2', kind: 'photo', placement: 'after', position: 4 },
    ],
    book_covers: { template_id: 'template', cover_templates: { id: 'template' } },
  };
  const client = {
    from(table) {
      calls.push(table);
      const query = { then(resolve) { return Promise.resolve({ data: rows[table] }).then(resolve); } };
      for (const method of ['select', 'update', 'eq', 'neq', 'is', 'in', 'order', 'maybeSingle']) query[method] = () => query;
      return query;
    },
    storage: { from: () => ({
      async createSignedUrls(paths) { calls.push(paths); return { data: paths.map(path => ({ path, signedUrl: `signed:${path}` })) }; },
    }) },
  };
  const loadedModule = { exports: {} };
  const mockedRequire = name => name.includes('supabase/server') ? { createSupabaseServerClient: async () => client }
    : name.includes('supabase/admin') ? { createSupabaseAdminClient: () => client }
    : name === './types' ? bookTypes.exports
    : name === './language' ? { isBookLanguage: value => ['ru', 'kk', 'en'].includes(value) }
    : name === './answer-format' ? { normalizeAnswerFormat: value => value ?? { version: 1, marks: [] } }
    : name === './progress' ? { getBookPageProgress: book => ({ progress: book.progress ?? 0 }) }
    : name === './catalog' ? { getExpectedChapterCount: slug => slug === 'boyfriend' ? 5 : 4 }
    : name === './cover-palettes' ? {
      normalizePageBackground: value => ['black', 'gray', 'burgundy', 'olive', 'navy', 'terracotta'].includes(value) ? value : 'burgundy',
      normalizeCoverColor: value => ['black', 'gray', 'burgundy', 'olive', 'navy', 'terracotta'].includes(value) ? value : 'burgundy',
    }
    : require(name);
  new Function('require', 'module', 'exports', source)(mockedRequire, loadedModule, loadedModule.exports);
  return { load: loadedModule.exports.getBookWithContent, calls };
}

test('inaccessible book does not load child data', async () => {
  const { load, calls } = fixture({ missing: true });
  assert.equal(await load('book'), null);
  assert.deepEqual(calls, ['books']);
});
test('structure retains questions without fetching private image and page payloads', async () => {
  const { load, calls } = fixture();
  const book = await load('book', 'structure');
  assert.equal(book.chapters[0].questions[0].catalogId, 'catalog');
  for (const table of ['book_page_images', 'book_question_pages']) assert.ok(!calls.includes(table));
});
test('cover is available without loading chapter content', async () => {
  const { load, calls } = fixture();
  const book = await load('book', 'cover');
  assert.equal(book.cover.templateId, 'template');
  assert.deepEqual(book.chapters, []);
  assert.deepEqual([...new Set(calls)], ['books', 'book_covers']);
});
test('editor preserves answers and ordered images with duplicate storage paths', async () => {
  const { load, calls } = fixture();
  const book = await load('book');
  const question = book.chapters[0].questions[0];
  assert.equal(question.answer, 'My home');
  assert.deepEqual(question.images.map(image => [image.id, image.pageId, image.position, image.signedUrl, image.pageBackground, image.roundedCorners]), [['image1', 'page1', 1, 'signed:photo', 'burgundy', true], ['image2', 'page2', 4, 'signed:photo', 'burgundy', false]]);
  assert.equal(book.roundPhotos, true);
  assert.equal(book.hidePhotoFooters, true);
  assert.equal(question.images[0].collageLayout, 'two_columns');
  assert.deepEqual(question.images[0].collageImages.map(image => [image.id, image.slot, image.signedUrl, image.cropX, image.cropY, image.cropScale]), [['collage2', 2, 'signed:collage-photo', 4, -2, 1.2]]);
  assert.deepEqual(question.blankPages, [{ id: 'blank1', pageBackground: 'olive', placement: 'after', position: 2 }]);
  assert.deepEqual(question.textPages, [{ id: 'text1', content: 'A meaningful quote', attribution: 'Author', style: 'quote', fontSize: 28, hideFooter: true, pageBackground: 'navy', placement: 'after', position: 3 }]);
  assert.deepEqual(calls.filter(Array.isArray), [['photo', 'collage-photo']]);
});

test('summary loads page counts without signing every book image', async () => {
  const { load, calls } = fixture();
  const book = await load('book', 'summary');
  assert.equal(book.chapters[0].questions[0].images.length, 2);
  assert.equal(book.chapters[0].questions[0].images[0].signedUrl, '');
  assert.ok(calls.includes('book_page_images'));
  assert.ok(calls.includes('book_question_pages'));
  assert.deepEqual(calls.filter(Array.isArray), []);
  assert.equal(calls.filter(call => call === 'books').length, 1);
});

test('book colors are limited to the six production palettes', () => {
  assert.deepEqual(palettes.exports.COVER_PALETTES.map(({ key, background, detail }) => [key, background, detail]), [
    ['black', '#2F2F2F', '#1C1C1C'],
    ['gray', '#8A8A8A', '#686868'],
    ['burgundy', '#592B33', '#421F25'],
    ['olive', '#49452C', '#34311F'],
    ['navy', '#303F4D', '#222D38'],
    ['terracotta', '#613A2D', '#492A20'],
  ]);
  assert.equal(palettes.exports.normalizePageBackground('wine'), 'burgundy');
  assert.equal(palettes.exports.normalizePageBackground('white'), 'burgundy');
});

test('photo defaults migration persists settings and applies them to new photos', () => {
  const migration = readFileSync(new URL('../supabase/migrations/202609230001_book_photo_defaults_and_palette.sql', import.meta.url), 'utf8');
  assert.match(migration, /add column if not exists round_photos boolean not null default false/);
  assert.match(migration, /add column if not exists hide_photo_footers boolean not null default false/);
  assert.match(migration, /rounded_corners, hide_footer/);
  assert.match(migration, /coalesce\(book_round_photos, false\), coalesce\(book_hide_photo_footers, false\)/);
  assert.match(migration, /create or replace function public\.set_book_photo_defaults/);
});

test('photo collage migration keeps one printable page with up to four image slots', () => {
  const migration = readFileSync(new URL('../supabase/migrations/202609300001_add_photo_collages.sql', import.meta.url), 'utf8');
  assert.match(migration, /collage_layout text not null default 'single'/);
  assert.match(migration, /'two_columns', 'two_rows', 'four_grid'/);
  assert.match(migration, /jsonb_array_length\(collage_images\) <= 3/);
});

test('text page typography migration stores per-page size and footer visibility', () => {
  const migration = readFileSync(new URL('../supabase/migrations/202610030001_add_text_page_typography.sql', import.meta.url), 'utf8');
  assert.match(migration, /text_size integer not null default 24/);
  assert.match(migration, /hide_footer boolean not null default false/);
  assert.match(migration, /text_size in \(14, 16, 18, 20, 22, 24, 28, 32\)/);
  assert.match(migration, /case when target_text_style = 'text' then 18 else 24 end/);
});

test('question editing migration replaces the suggestion queue with direct owner edits', () => {
  const migration = readFileSync(new URL('../supabase/migrations/202609290005_allow_owner_question_edits.sql', import.meta.url), 'utf8');
  const transitionFix = readFileSync(new URL('../supabase/migrations/202609290006_fix_book_editing_transition.sql', import.meta.url), 'utf8');
  assert.match(migration, /add column prompt_edited_by_owner boolean not null default false/);
  assert.match(migration, /create function public\.update_own_book_question_prompt/);
  assert.match(migration, /drop table if exists public\.question_prompt_suggestions/);
  assert.match(transitionFix, /after update of language on public\.books/);
  assert.doesNotMatch(transitionFix, /after update of language, production_status/);
});
