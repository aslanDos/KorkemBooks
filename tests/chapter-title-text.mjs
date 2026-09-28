import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/lib/books/chapter-title-text.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { formatChapterTitle } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const languageSource = ts.transpileModule(readFileSync(new URL('../src/lib/books/language.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { getBookContent } = await import('data:text/javascript;base64,' + Buffer.from(languageSource).toString('base64'));

test('prepositions and conjunctions stay attached, including consecutive short words', () => {
  assert.equal(formatChapterTitle('О главном и о будущем'), 'О\u00a0главном и\u00a0о\u00a0будущем');
  assert.equal(formatChapterTitle('Истории из прошлого'), 'Истории из\u00a0прошлого');
});
test('words, non-Russian text and existing nonbreaking spaces are preserved', () => {
  for (const title of ['Наши воспоминания', 'Балалық шақ', 'Our memories', 'О\u00a0будущем', 'Начало', '']) {
    assert.equal(formatChapterTitle(title), title);
  }
});
test('formatting is idempotent and does not bind partial words or paragraph breaks', () => {
  const title = 'Наши воспоминания и о будущем';
  const formatted = formatChapterTitle(title);
  assert.equal(formatChapterTitle(formatted), formatted);
  assert.equal(formatted.replaceAll('\u00a0', ' '), title);
  assert.equal(formatChapterTitle('О\nбудущем'), 'О\nбудущем');
});
test('generated book labels follow the book language, independently from the interface locale', () => {
  assert.deepEqual(
    ['ru', 'kk', 'en'].map(language => {
      const content = getBookContent(language);
      return [content.prefaceTitle, content.contents, content.chapter, content.signature];
    }),
    [
      ['Предисловие', 'Содержание', 'Глава', 'С теплом,'],
      ['Алғысөз', 'Мазмұны', 'Тарау', 'Ізгі тілекпен,'],
      ['Preface', 'Contents', 'Chapter', 'With warmth,'],
    ],
  );

  for (const path of [
    '../src/components/books/book-reader-preview.tsx',
    '../src/components/books/book-preview-gallery.tsx',
    '../src/components/books/print-book-sheet.tsx',
  ]) assert.match(readFileSync(new URL(path, import.meta.url), 'utf8'), /data-no-translate/);
});
