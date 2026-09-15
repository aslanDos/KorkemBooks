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

function fixture({ missing = false } = {}) {
  const calls = [];
  const rows = {
    books: missing ? null : { id: 'book', title: 'Book', book_types: { name: 'Memoir' } },
    chapters: [{ id: 'chapter', title: 'Childhood', position: 1 }],
    questions: [{ id: 'question', chapter_id: 'chapter', catalog_id: 'catalog', prompt: 'Home?', position: 1 }],
    answers: [{ question_id: 'question', answer_text: 'My home' }],
    book_page_images: [
      { id: 'image1', question_id: 'question', storage_path: 'photo', position: 1, rounded_corners: true },
      { id: 'image2', question_id: 'question', storage_path: 'photo', position: 2 },
    ],
    book_question_pages: [
      { id: 'page1', question_id: 'question', image_id: 'image1', kind: 'photo', placement: 'after', position: 1, background_style: 'wine' },
      { id: 'blank1', question_id: 'question', image_id: null, kind: 'blank', placement: 'after', position: 2, background_style: 'olive' },
      { id: 'page2', question_id: 'question', image_id: 'image2', kind: 'photo', placement: 'after', position: 3 },
    ],
    book_covers: { template_id: 'template', cover_templates: { id: 'template' } },
  };
  const client = {
    from(table) {
      calls.push(table);
      const query = { then(resolve) { return Promise.resolve({ data: rows[table] }).then(resolve); } };
      for (const method of ['select', 'eq', 'is', 'in', 'order', 'maybeSingle']) query[method] = () => query;
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
    : name === './answer-format' ? { normalizeAnswerFormat: value => value ?? { version: 1, marks: [] } }
    : name === './cover-palettes' ? { normalizePageBackground: value => ['white', 'primary', 'wine', 'berry', 'terracotta', 'navy', 'umber', 'olive', 'ochre'].includes(value) ? value : 'white' }
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
  assert.deepEqual(question.images.map(image => [image.id, image.pageId, image.position, image.signedUrl, image.pageBackground, image.roundedCorners]), [['image1', 'page1', 1, 'signed:photo', 'wine', true], ['image2', 'page2', 3, 'signed:photo', 'white', false]]);
  assert.deepEqual(question.blankPages, [{ id: 'blank1', pageBackground: 'olive', placement: 'after', position: 2 }]);
  assert.deepEqual(calls.filter(Array.isArray), [['photo']]);
});
