import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

const cache = new Map();
function loadTS(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => loadTS(resolve(dirname(filename), name + '.ts')), loaded, loaded.exports);
  cache.set(filename, loaded.exports);
  return loaded.exports;
}
const root = resolve(import.meta.dirname, '..');
const { getBookPrintLayout, formatPrintPageRanges } = loadTS(resolve(root, 'src/lib/books/print-layout.ts'));
const { getBookPageProgress } = loadTS(resolve(root, 'src/lib/books/progress.ts'));
const { paginateBookAnswer } = loadTS(resolve(root, 'src/lib/books/pagination.ts'));
const question = (overrides = {}) => ({ id: 'q', prompt: 'Вопрос', answer: '', answerFormat: { version: 1, marks: [] }, images: [], blankPages: [], ...overrides });
const book = (questions = [], overrides = {}) => ({ chapters: [{ id: 'c', title: 'Глава', questions }], questionTextSize: 12, answerTextSize: 16, ...overrides });
function checkPartition(layout) {
  assert.equal(layout.colorPages.length + layout.monochromePages.length, layout.totalPages);
  assert.deepEqual([...layout.colorPages, ...layout.monochromePages].sort((a, b) => a - b), Array.from({ length: layout.totalPages }, (_, index) => index + 1));
}

test('front matter and chapters are color; only printed answers are monochrome', () => {
  const layout = getBookPrintLayout(book([question(), question({ id: 'answered', answer: 'Мой ответ' })]));
  assert.deepEqual(layout.colorPages, [1, 2, 3, 4, 5]);
  assert.deepEqual(layout.monochromePages, [6]);
  assert.equal(layout.totalPages, 6);
  checkPartition(layout);
});
test('long answers count every continuation and respond to font sizes', () => {
  const q = question({ answer: 'Воспоминания нашей семьи. '.repeat(600) });
  const small = getBookPrintLayout(book([q], { answerTextSize: 14 }));
  const large = getBookPrintLayout(book([q], { answerTextSize: 22 }));
  assert.equal(small.monochromePages.length, paginateBookAnswer(q.prompt, q.answer, { question: 12, answer: 14 }).length);
  assert.equal(large.monochromePages.length, paginateBookAnswer(q.prompt, q.answer, { question: 12, answer: 22 }).length);
  assert.ok(large.monochromePages.length > small.monochromePages.length);
  for (const layout of [small, large]) checkPartition(layout);
});
test('attachments retain their exact before/after order without creating an empty answer page', () => {
  const layout = getBookPrintLayout(book([
    question({ id: 'photo-only', answer: '  ', images: [{ id: 'only-photo', placement: 'before', position: 1 }] }),
    question({ id: 'mixed', answer: 'Ответ', images: [{ id: 'after', placement: 'after', position: 2 }], blankPages: [{ id: 'before', placement: 'before', position: 1 }, { id: 'last', placement: 'after', position: 3 }] }),
  ]));
  assert.deepEqual(layout.storyPages.map(page => page.key), ['chapter-c', 'photo-only-photo', 'blank-before', 'question-mixed', 'photo-after', 'blank-last']);
  assert.deepEqual(layout.monochromePages, [8]);
  assert.deepEqual(layout.colorPages, [1, 2, 3, 4, 5, 6, 7, 9, 10]);
  checkPartition(layout);
});
test('classification is a printing policy, not inferred from background color', () => {
  const layout = getBookPrintLayout(book([question({ answer: 'Ответ' })], { pageBackground: 'white' }));
  assert.deepEqual(layout.colorPages, [1, 2, 3, 4, 5]);
  assert.deepEqual(layout.monochromePages, [6]);
  checkPartition(layout);
});
test('empty books still contain the four existing front pages', () => {
  const layout = getBookPrintLayout(book([], { chapters: [] }));
  assert.equal(layout.totalPages, 4);
  assert.deepEqual(layout.monochromePages, []);
  checkPartition(layout);
});
test('book progress is based on printed pages with 100 pages as the target', () => {
  const pages = count => Array.from({ length: count }, (_, index) => ({ id: `blank-${index}`, placement: 'after', position: index + 1 }));
  const fiftyPageBook = book([question({ blankPages: pages(45) })]);
  assert.equal(getBookPrintLayout(fiftyPageBook).totalPages, 50);
  assert.deepEqual(getBookPageProgress(fiftyPageBook), { progress: 50, totalPages: 50 });

  const overTargetBook = book([question({ blankPages: pages(120) })]);
  assert.equal(getBookPageProgress(overTargetBook).progress, 100);
});
test('page ranges are valid for the browser print dialog without mutating inputs', () => {
  const pages = [9, 2, 1, 3, 7, 8, 9];
  assert.equal(formatPrintPageRanges(pages), '1-3, 7-9');
  assert.deepEqual(pages, [9, 2, 1, 3, 7, 8, 9]);
  assert.equal(formatPrintPageRanges([]), '');
  assert.equal(formatPrintPageRanges([6]), '6');
});
