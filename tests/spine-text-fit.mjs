import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/lib/books/spine-text-fit.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { fitSpineText, splitSpineAuthor } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

const measure = (scale, spacing) => ({ width: 20 * scale, height: (100 + 200 * spacing) * scale });

test('short text keeps its font size and requested tracking', () => {
  assert.deepEqual(fitSpineText({ width: 40, height: 200 }, .1, measure), { scale: 1, spacing: .1, truncated: false });
});
test('longer text shrinks without changing tracking when it fits', () => {
  const result = fitSpineText({ width: 40, height: 90 }, .1, measure);
  assert.ok(result.scale >= .6 && result.scale < 1);
  assert.equal(result.spacing, .1);
  assert.equal(result.truncated, false);
  assert.ok(measure(result.scale, result.spacing).height <= 90);
});
test('tracking is reduced only when minimum font size is insufficient', () => {
  const result = fitSpineText({ width: 40, height: 65 }, .2, measure);
  assert.equal(result.scale, .6);
  assert.ok(result.spacing < .2);
  assert.equal(result.truncated, false);
  assert.ok(measure(result.scale, result.spacing).height <= 65);
});
test('extreme text uses ellipsis instead of shrinking below minimum', () => {
  assert.deepEqual(fitSpineText({ width: 40, height: 300 }, .5, scale => ({ width: 20 * scale, height: 1000 * scale })), {
    scale: .6, spacing: 0, truncated: true,
  });
});
test('fit respects spine width as well as length', () => {
  const result = fitSpineText({ width: 15, height: 300 }, .1, measure);
  assert.ok(measure(result.scale, result.spacing).width <= 15);
});
test('maximum tracking is capped and reducing content restores original settings', () => {
  assert.equal(fitSpineText({ width: 40, height: 300 }, 1, measure).spacing, .5);
  assert.deepEqual(fitSpineText({ width: 40, height: 300 }, .1, measure), { scale: 1, spacing: .1, truncated: false });
});
test('multi-part names are balanced into at most two columns without losing words', () => {
  for (const name of ['Аслан Досымжан', 'Аслан', 'Анна Мария де ла Крус', 'Оченьдлинноеимябезпробелов']) {
    const columns = splitSpineAuthor(name);
    assert.ok(columns.length <= 2);
    assert.equal(columns.join(' '), name);
  }
});
