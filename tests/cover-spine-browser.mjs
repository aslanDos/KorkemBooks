import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const cache = new Map();
function loadTS(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const loadedModule = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => {
    if (name === 'server-only') return {};
    if (name === '@/lib/books/queries') return { getAdminBookWithContent: async id => id === 'admin-fixture' ? adminFixtureBook : printFixtureBook };
    if (name === '@/app/admin/books/actions') return { updateBookProductionStatus: async () => {} };
    if (name === '@/app/admin/books/[bookId]/actions') return { saveAdminAnswerAction: async () => ({ success: true }), saveBookDeliveryAction: async () => ({ success: true }) };
    if (name === '@/lib/admin/book-delivery') return { getAdminBookDelivery: async () => ({ delivery: { pickup: false, city: 'Алматы', address: 'Улица Абая, дом 10, квартира 5' } }) };
    if (name === 'next/navigation') return {
      notFound: () => { throw new Error('Print fixture missing'); },
      useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }),
    };
    if (name === '@/app/dashboard/books/cover-actions') return { selectBookCoverAction: async () => ({ success: true }) };
    if (name.startsWith('@/')) {
      const path = join(root, 'src', name.slice(2));
      return loadTS(path + (existsSync(path + '.ts') ? '.ts' : '.tsx'));
    }
    if (name.startsWith('./')) return loadTS(join(dirname(filename), name + '.ts'));
    return require(name);
  }, loadedModule, loadedModule.exports);
  cache.set(filename, loadedModule.exports);
  return loadedModule.exports;
}
const { BookCoverSpine } = loadTS(join(root, 'src/components/books/book-cover-spine.tsx'));
const { BookCoverDesigner } = loadTS(join(root, 'src/components/books/book-cover-designer.tsx'));
const { BookCoverThumbnail } = loadTS(join(root, 'src/components/books/book-cover-thumbnail.tsx'));
const { BookChapterPage } = loadTS(join(root, 'src/components/books/book-chapter-page.tsx'));
const photoSettings = { enabled: true, content: 'История фотографии', size: 14, placement: 'overlay', position: 'bottom', tone: 'light', darkening: 20, textShadow: 30 };
const printFixtureBook = {
  title: 'Моя история', author_name: 'Аслан', pageFont: 'literata', questionTextSize: 12, answerTextSize: 16,
  titlePageTitleSize: 24, chapterPageStyle: 'vertical', chapterTitleSize: 14, pageBackground: 'terracotta', showFooterAuthor: true, showFooterTitle: true, roundPhotos: true, hidePhotoFooters: false, productionStatus: 'printing', language: 'ru',
  chapters: [{ id: 'print-chapter', title: 'Наши воспоминания', questions: [{
    id: 'print-question', prompt: 'Что вы хотите сохранить?', answer: 'Воспоминания о важных моментах.', answerFormat: { version: 1, marks: [] },
    images: ['full', 'contain'].map((displayMode, index) => ({ id: 'print-photo-' + index, signedUrl: '/covers/turquoise-almond.jpg', displayMode, placement: 'after', position: index + 1, cropX: 2, cropY: -3, cropScale: 1.1, roundedCorners: true, hideFooter: false, collageLayout: index ? 'four_grid' : 'single', collageImages: index ? [2, 3, 4].map(slot => ({ id: 'collage-' + slot, slot, signedUrl: '/covers/turquoise-almond.jpg', cropX: slot, cropY: -slot, cropScale: 1.05 })) : [], photoText: { ...photoSettings, placement: displayMode === 'full' ? 'overlay' : 'below' } })),
    blankPages: [{ id: 'print-blank', pageBackground: 'terracotta', placement: 'after', position: 3 }],
    textPages: [{ id: 'print-quote', content: 'Счастье становится больше, когда им делишься.', attribution: 'KorkemBooks', style: 'quote', fontSize: 28, hideFooter: true, pageBackground: 'terracotta', placement: 'after', position: 4 }],
  }] }],
};
const PrintPage = loadTS(join(root, 'src/app/admin/books/[bookId]/print/page.tsx')).default;
const adminFixtureBook = {
  ...printFixtureBook, id: 'admin-fixture', title: 'Махаббатым', author_name: 'Аслан Досымжан', recipient_name: 'Аружан Базарбаева',
  progress: 5, productionStatus: 'writing', updated_at: '2026-09-15T10:00:00Z',
  cover: { style: 'solid', colorKey: 'burgundy', frameStyle: 'ver2', showFrame: true },
  chapters: [0, 1].map(index => ({ id: 'admin-chapter-' + index, title: index ? 'Наши воспоминания' : 'С чего всё началось', questions: [0, 1].map(question => ({
    id: 'admin-question-' + index + '-' + question, prompt: question ? 'Что вы лучше всего помните о дне вашей первой встречи?' : 'Каким было ваше первое впечатление о ней?', answer: question ? 'Очень тёплые воспоминания.' : '', answerFormat: { version: 1, marks: [] }, images: [], blankPages: [], textPages: [],
  })) })),
};
const AdminBookPage = loadTS(join(root, 'src/app/admin/books/[bookId]/page.tsx')).default;
const adminMarkup = renderToStaticMarkup(await AdminBookPage({ params: Promise.resolve({ bookId: 'admin-fixture' }) }));
const adminFinanceMarkup = renderToStaticMarkup(await AdminBookPage({ params: Promise.resolve({ bookId: 'admin-fixture' }), searchParams: Promise.resolve({ tab: 'finance' }) }));
const adminDeliveryMarkup = renderToStaticMarkup(await AdminBookPage({ params: Promise.resolve({ bookId: 'admin-fixture' }), searchParams: Promise.resolve({ tab: 'delivery' }) }));
const adminContentMarkup = renderToStaticMarkup(await AdminBookPage({ params: Promise.resolve({ bookId: 'admin-fixture' }), searchParams: Promise.resolve({ tab: 'content' }) }));
assert.doesNotMatch(adminMarkup, /Финансы книги|id="book-delivery-heading"|class="admin-chapter"/, 'overview still contains secondary sections');
assert.match(adminFinanceMarkup, /Финансы книги/, 'finance tab is empty');
assert.match(adminDeliveryMarkup, /id="book-delivery-heading"/, 'delivery tab is empty');
assert.match(adminContentMarkup, /class="admin-chapter"/, 'content tab is empty');
assert.match(adminContentMarkup, /\/admin\/books\/admin-fixture\/cover/, 'cover action missing from content tab');
const writingPrintMarkup = renderToStaticMarkup(await PrintPage({ params: Promise.resolve({ bookId: 'admin-fixture' }) }));
assert.match(writingPrintMarkup, /Печать книги/, 'admin cannot print a book that is still being written');
const adminPage = `<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1">${fontSheetsForPrint()}<link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/workspace.css"><style>body{--font-manrope:Manrope}</style></head><body><div class="dashboard-shell admin-shell"><aside class="dashboard-sidebar">Админ-панель</aside><main class="dashboard-main"><header class="workspace-topbar"><nav>Админ-панель → Структура книги</nav></header><div class="workspace-content">${adminMarkup}</div></main></div></body></html>`;
const bleedMarkup = renderToStaticMarkup(await PrintPage({ params: Promise.resolve({ bookId: 'print-fixture' }) }));
const bleedPage = `<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1">${fontSheetsForPrint()}<link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/workspace.css"><style>body{--font-literata:Literata}#result{display:none}</style></head><body><div class="dashboard-shell admin-shell"><aside class="dashboard-sidebar">Sidebar</aside><main class="dashboard-main"><div class="workspace-topbar">Toolbar</div><div class="workspace-content">${bleedMarkup}</div></main></div><pre id="result">pending</pre><script type="module">
import { fitRenderedChapterTitle } from '/chapter-title-layout.js';
document.body.style.setProperty('--font-manrope', 'Manrope');
document.body.style.fontFamily = 'Manrope, sans-serif';
await document.fonts.ready;
for (const page of document.querySelectorAll('.preview-chapter-page')) fitRenderedChapterTitle(page);
const announcer = document.createElement('next-route-announcer');
announcer.style.cssText = 'position:absolute';
const alert = document.createElement('div');
alert.style.cssText = 'position:absolute;border:0;height:1px;margin:-1px;padding:0;width:1px;clip:rect(0 0 0 0);overflow:hidden;white-space:nowrap;word-wrap:normal';
alert.textContent = 'korkembooks';
announcer.attachShadow({mode:'open'}).append(alert);
document.body.append(announcer);
// The menu trigger and open-menu backdrop are siblings of the sidebar, not its children.
for (const className of ['mobile-menu-button', 'sidebar-backdrop']) {
  const button = document.createElement('button');
  button.className = className;
  button.type = 'button';
  button.textContent = className === 'mobile-menu-button' ? '☰' : '';
  document.querySelector('.dashboard-shell').prepend(button);
}
document.querySelector('#result').textContent = 'ready';
</script></body></html>`;
function fontSheetsForPrint() {
  return readdirSync(join(root, '.next/static/chunks')).filter(name => name.endsWith('.css') && readFileSync(join(root, '.next/static/chunks', name), 'utf8').includes('@font-face')).map(name => `<link rel="stylesheet" href="/static/chunks/${name}">`).join('');
}
const printChapterMarkup = ['default', 'numeral', 'vertical'].map(style => `<div class="print-preview-page preview-page preview-page--chapter">${renderToStaticMarkup(React.createElement(BookChapterPage, {
  chapterNumber: 4, title: 'О главном и о будущем', style, titleSize: 10, background: 'terracotta',
}))}</div>`).join('');
const chapterTitles = ['Наши воспоминания', 'О главном и о будущем', 'Ш'.repeat(200), 'Воспоминания нашей семьи '.repeat(30), 'Начало'];
const titleFitMarkup = ['default', 'numeral', 'vertical'].flatMap(style => [6, 8, 10, 12, 14].flatMap(titleSize => chapterTitles.flatMap(title => [false, true].map(print => `<div data-title-fit class="preview-page preview-page--chapter${print ? ' print-preview-page' : ''}" ${print ? '' : 'style="width:400px;height:568px;aspect-ratio:auto"'}>${renderToStaticMarkup(React.createElement(BookChapterPage, {
  chapterNumber: 2, title, style, titleSize, background: 'terracotta',
}))}</div>`)))).join('');
const template = { id: 'test-template', name: 'Тест', backgroundPath: '' };
const designerMarkup = ['', 'Аслан Д.'].map((spineAuthorName, index) => `<div data-designer="${index}">${renderToStaticMarkup(React.createElement(BookCoverDesigner, {
  book: { title: 'Махаббатым', author_name: 'Аслан Досымжан', cover: { spineAuthorName, templateId: template.id } },
  templates: [template],
}))}</div>`).join('');
const backgroundCases = [
  { frameStyle: 'ver1', backgroundInsideFrame: true, frameColor: '#FFFAF3' },
  { frameStyle: 'ver2', backgroundInsideFrame: true, frameColor: '#C5A46D' },
  { frameStyle: 'ver2', backgroundInsideFrame: false },
  { frameStyle: 'ver2', backgroundInsideFrame: true, coloredBack: true },
  { frameStyle: 'ver1', backgroundInsideFrame: true, showFrame: false },
  { frameStyle: 'ver2', backgroundInsideFrame: true, title: 'История нашей семьи и воспоминания, которые мы хотим сохранить для следующих поколений', titleSize: 32, authorSize: 16 },
  { frameStyle: 'ver1', backgroundInsideFrame: true, title: 'Ш'.repeat(200), authorName: 'Ш'.repeat(120), titleSize: 32, authorSize: 16 },
  { frameStyle: 'ver1', backgroundInsideFrame: true, showAuthor: false, titleSize: 16 },
  { frameStyle: 'ver2', backgroundInsideFrame: true, customBackgroundPath: 'test-user/test-book/upload.jpg', customBackgroundUrl: '/covers/turquoise-almond.jpg' },
];
const imageTemplate = { ...template, backgroundPath: '/covers/dark-floral.jpg' };
const backgroundMarkup = backgroundCases.map((settings, index) => {
  const book = { title: settings.title ?? 'Махаббатым', author_name: settings.authorName ?? 'Аслан Досымжан', cover: { style: 'template', templateId: template.id, template: imageTemplate, showFrame: true, ...settings } };
  return `<div data-background-case="${index}">${renderToStaticMarkup(React.createElement(BookCoverDesigner, { book, templates: [imageTemplate] }))}<div style="width:160px;margin:24px">${renderToStaticMarkup(React.createElement(BookCoverThumbnail, { book }))}</div></div>`;
}).join('');
const fontSheets = readdirSync(join(root, '.next/static/chunks')).filter(name => name.endsWith('.css') && readFileSync(join(root, '.next/static/chunks', name), 'utf8').includes('@font-face'));
const cases = [
  { title: 'Махаббатым', authorName: 'Аслан Досымжан', showAuthor: true, letterSpacing: 10 },
  { title: 'Махаббатым', authorName: 'Аслан Досымжан', showAuthor: true, letterSpacing: 50 },
  { title: 'История нашей семьи и воспоминания, которые хочется сохранить навсегда '.repeat(3).slice(0, 200), authorName: 'Анна Мария де ла Крус', showAuthor: true, letterSpacing: 50 },
  { title: 'Оченьдлинноеназваниебезпробелов'.repeat(8).slice(0, 200), authorName: 'Оченьдлинноеимябезпробелов'.repeat(6).slice(0, 120), showAuthor: true, letterSpacing: 50 },
  { title: 'История нашей семьи', authorName: 'Аслан Досымжан', showAuthor: false, letterSpacing: 50 },
  { title: 'История нашей семьи и счастливых воспоминаний', authorName: 'Аслан Досымжан', showAuthor: true, letterSpacing: 50 },
];
const markup = cases.map((props, index) => `<article data-case="${index}" data-tracking="${props.letterSpacing / 100}"><div class="cover-preview-stage"><div class="cover-preview-stage__canvas"><div class="colored-cover-spread colored-cover-spread--frame-${index % 2 === 0 ? 'ver1' : 'ver2'}"><section class="colored-cover-side"><span class="colored-cover-frame"></span></section>${renderToStaticMarkup(React.createElement(BookCoverSpine, { ...props, onOverflowChange: () => {} }))}<section class="colored-cover-side"><span class="colored-cover-frame"></span><h2>${index + 1}</h2></section></div></div></div></article>`).join('');
const page = `<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1">${fontSheets.map(name => `<link rel="stylesheet" href="/static/chunks/${name}">`).join('')}<link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/workspace.css"><style>body{padding:24px;--font-playfair:'Playfair Display';--font-manrope:'Manrope'}article{margin-bottom:24px}.colored-cover-side h2{text-align:center}</style></head><body class="dashboard-shell">${markup}${designerMarkup}${backgroundMarkup}<pre id="result">pending</pre><script type="module">
import { fitRenderedSpine } from '/spine-text-layout.js';
import { fitRenderedCoverTitlePanel } from '/cover-title-layout.js';
await document.fonts.ready;
const results = [];
const check = (value, message) => { if (!value) throw new Error(message); };
const inside = (inner, outer) => inner.left >= outer.left - 1 && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
try {
  for (const designer of document.querySelectorAll('.cover-designer')) {
    const add = designer.querySelector('.cover-style-card--add');
    check(add?.textContent === 'Добавить', 'add background card missing');
    const input = designer.querySelector('input[type="file"]');
    check(input?.hidden && input.accept === 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif', 'upload input types incorrect');
    check(add.getBoundingClientRect().height === designer.querySelector('.cover-style-card').getBoundingClientRect().height, 'add card height differs');
    if (innerWidth >= 768) check(add.getBoundingClientRect().width <= 155, 'style cards are still too wide');
  }
  for (const fixture of document.querySelectorAll('[data-background-case]')) {
    const index = Number(fixture.dataset.backgroundCase);
    const spread = fixture.querySelector('.colored-cover-spread');
    const image = spread.querySelector('.colored-cover-side--front .colored-cover-background');
    const frame = spread.querySelector('.colored-cover-side--front .colored-cover-frame');
    const expectedFrameColor = index === 0 ? 'rgb(255, 250, 243)' : index === 1 ? 'rgb(197, 164, 109)' : 'rgb(66, 31, 37)';
    const frameStyle = getComputedStyle(frame);
    check((spread.classList.contains('colored-cover-spread--frame-ver1') ? frameStyle.borderLeftColor : frameStyle.backgroundColor) === expectedFrameColor, 'incorrect saved frame color');
    check(getComputedStyle(spread).backgroundColor === 'rgb(89, 43, 51)', 'frame color changes cover color');
    check(getComputedStyle(spread.querySelector('.colored-cover-spine')).backgroundColor === 'rgb(89, 43, 51)', 'frame color changes spine color');
    const thumbnailFrame = fixture.querySelector('.book-cover-thumbnail__frame');
    check((fixture.querySelector('.book-cover-thumbnail').classList.contains('book-cover-thumbnail--frame-ver1') ? getComputedStyle(thumbnailFrame).borderLeftColor : getComputedStyle(thumbnailFrame).backgroundColor) === expectedFrameColor, 'thumbnail frame color differs');
    if (index !== 4) {
      const colors = fixture.querySelector('.cover-frame-color-options');
      check(colors.querySelector('[aria-pressed="true"]').getAttribute('aria-label') === (index === 0 ? 'Цвет рамки: Светлый' : index === 1 ? 'Цвет рамки: Золотистый' : 'Автоматический цвет рамки'), 'saved frame color not selected');
    } else check(!fixture.querySelector('.cover-frame-color-options'), 'frame colors shown while frame disabled');
    const panel = spread.querySelector('.colored-cover-title-panel');
    fitRenderedCoverTitlePanel(panel);
    check(inside(panel.getBoundingClientRect(), panel.parentElement.getBoundingClientRect()), 'title panel leaves cover');
    check(inside(panel.querySelector('h2').getBoundingClientRect(), panel.getBoundingClientRect()), 'title leaves panel');
    const author = panel.querySelector('.colored-cover-author');
    if (author) check(inside(author.getBoundingClientRect(), panel.getBoundingClientRect()), 'author leaves panel');
    if (index === 0) {
      const bounds = panel.getBoundingClientRect();
      check(Math.abs(bounds.width / bounds.height - .827) < .03, 'title panel should match portrait reference proportions');
      check(Math.abs(bounds.width / panel.parentElement.getBoundingClientRect().width - .52) < .01, 'title panel should occupy about half the cover width');
      const titleBounds = panel.querySelector('h2').getBoundingClientRect();
      check((titleBounds.top - bounds.top) / bounds.height < .3, 'short title should be near the upper part of the panel');
      check((author.getBoundingClientRect().top - bounds.top) / bounds.height > .7, 'author should be near the lower part of the panel');
    }
    if (index === 5) check(panel.offsetHeight > document.querySelector('[data-background-case="0"] .colored-cover-title-panel').offsetHeight, 'long title panel does not grow');
    if (index === 6) check(Number(panel.style.getPropertyValue('--cover-panel-text-scale')) < 1, 'extreme text should safely shrink');
    const sizes = Array.from(fixture.querySelectorAll('fieldset')).find(field => field.querySelector('legend')?.textContent === 'Размер названия книги');
    check(sizes?.closest('details').querySelector('summary strong').textContent === 'Текст обложки', 'title size selector is outside cover text');
    check(sizes.querySelector('[aria-pressed="true"]').textContent === String(index === 5 || index === 6 ? 32 : index === 7 ? 16 : 24), 'stored title size not selected');
    const clipped = index !== 2 && index !== 4;
    check(spread.classList.contains('colored-cover-spread--background-inside-frame') === clipped, 'incorrect clipping mode');
    check(fixture.querySelector('.book-cover-thumbnail').classList.contains('book-cover-thumbnail--background-inside-frame') === clipped, 'thumbnail clipping differs from preview');
    check(getComputedStyle(image).backgroundImage.includes(index === 8 ? 'turquoise-almond.jpg' : 'dark-floral.jpg'), 'template or custom image missing');
    if (index === 8) {
      const customCard = Array.from(fixture.querySelectorAll('.cover-style-card')).find(card => card.querySelector('strong')?.textContent === 'Свой фон');
      check(customCard?.getAttribute('aria-pressed') === 'true', 'saved custom background not selected');
      check(customCard.querySelector('[aria-label="Сохранено"]'), 'saved custom card marker missing');
      check(fixture.querySelectorAll('.cover-style-card[aria-pressed="true"]').length === 1, 'template and custom background selected together');
      check(getComputedStyle(fixture.querySelector('.book-cover-thumbnail__background')).backgroundImage.includes('turquoise-almond.jpg'), 'thumbnail ignores custom background');
    }
    if (clipped && spread.classList.contains('colored-cover-spread--frame-ver1')) {
      check(getComputedStyle(image).maskImage === 'none', 'rectangle uses decorative clipping');
      check(Math.abs(image.getBoundingClientRect().left - frame.getBoundingClientRect().left - parseFloat(getComputedStyle(frame).borderLeftWidth)) < 1, 'rectangle image crosses border');
    } else if (clipped) check(getComputedStyle(image).maskImage.includes('frame-interior.svg'), 'decorative interior mask missing');
    else check(image.getBoundingClientRect().width === image.parentElement.getBoundingClientRect().width, 'full background does not fill cover');
    check((getComputedStyle(spread.querySelector('.colored-cover-side--back .colored-cover-background')).display === 'none') === (index === 3), 'colored back displays template image');
    check((getComputedStyle(frame).display === 'none') === (index === 4), 'incorrect frame visibility');
    const backgroundToggle = fixture.querySelector('[aria-label="Фон внутри рамки"]');
    if (index === 4) check(!backgroundToggle, 'background inside frame toggle shown while frame disabled');
    else check(backgroundToggle?.getAttribute('aria-checked') === String(clipped), 'toggle does not reflect saved mode');
  }
  for (const designer of document.querySelectorAll('[data-designer]')) {
    const expectedName = designer.dataset.designer === '0' ? 'Аслан Досымжан' : 'Аслан Д.';
    check(designer.querySelector('.colored-cover-spine__author').getAttribute('aria-label') === expectedName, 'incorrect spine author override or fallback');
    check(designer.querySelector('.colored-cover-author').textContent === 'Аслан Досымжан', 'spine author changes front author');
    const field = designer.querySelector('.cover-data-fields--spine input');
    check(field.value === (designer.dataset.designer === '0' ? '' : 'Аслан Д.'), 'saved spine author not loaded into field');
    check(field.placeholder === 'Аслан Досымжан', 'spine author placeholder missing fallback');
  }
  const rectangular = document.querySelector('.colored-cover-spread--frame-ver1');
  const decorative = document.querySelector('.colored-cover-spread--frame-ver2');
  const rectangleFrame = rectangular.querySelector('.colored-cover-frame');
  const decorativeFrame = decorative.querySelector('.colored-cover-frame');
  // The SVG's main vertical stroke is 29.7037 of its 1604-unit width.
  const expectedStroke = decorativeFrame.getBoundingClientRect().width * 29.7037 / 1604;
  check(Math.abs(parseFloat(getComputedStyle(rectangleFrame).borderLeftWidth) - expectedStroke) < 1, 'rectangle stroke differs from decorative stroke');
  check(Math.abs(rectangleFrame.getBoundingClientRect().width - decorativeFrame.getBoundingClientRect().width) < 1, 'frame widths differ');
  for (const fixture of document.querySelectorAll('[data-case]')) {
    const spine = fixture.querySelector('.colored-cover-spine');
    const tracking = Number(fixture.dataset.tracking);
    const overflow = fitRenderedSpine(spine, tracking);
    const titleSlot = spine.querySelector('.colored-cover-spine__title-slot');
    const title = titleSlot.querySelector('strong');
    check(inside(title.getBoundingClientRect(), titleSlot.getBoundingClientRect()), 'title outside slot: ' + fixture.dataset.case);
    const titleBounds = title.getBoundingClientRect();
    const spineBounds = spine.getBoundingClientRect();
    check(Math.abs((titleBounds.top + titleBounds.bottom) / 2 - (spineBounds.top + spineBounds.bottom) / 2) < 1, 'title is not vertically centered on spine: ' + fixture.dataset.case);
    check(Math.abs((titleBounds.left + titleBounds.right) / 2 - (spineBounds.left + spineBounds.right) / 2) < 1, 'title is not horizontally centered on spine: ' + fixture.dataset.case);
    const authorSlot = spine.querySelector('.colored-cover-spine__author-slot');
    if (authorSlot) for (const line of authorSlot.querySelectorAll('.colored-cover-spine__author > span')) check(inside(line.getBoundingClientRect(), authorSlot.getBoundingClientRect()), 'author outside slot: ' + fixture.dataset.case);
    const mark = spine.querySelector('.colored-cover-spine__mark').getBoundingClientRect();
    check(titleSlot.getBoundingClientRect().bottom < mark.top, 'title overlaps logo');
    if (authorSlot) check(authorSlot.getBoundingClientRect().bottom < titleSlot.getBoundingClientRect().top, 'author overlaps title');
    check(spine.closest('.colored-cover-spread').clientWidth > 0, 'cover has zero width');
    results.push({ index: fixture.dataset.case, overflow, fontSize: title.style.fontSize, spacing: title.style.letterSpacing });
  }
  check(results[0].overflow === false, 'short title truncated');
  const authorAtLowTracking = document.querySelector('[data-case="0"] .colored-cover-spine__author');
  const authorAtHighTracking = document.querySelector('[data-case="1"] .colored-cover-spine__author');
  check(parseFloat(authorAtLowTracking.style.letterSpacing) === .05, 'author should have subtle fixed tracking');
  check(getComputedStyle(authorAtLowTracking).letterSpacing === getComputedStyle(authorAtHighTracking).letterSpacing, 'slider changes author tracking');
  check(getComputedStyle(authorAtLowTracking).fontSize === getComputedStyle(authorAtHighTracking).fontSize, 'slider changes author font size');
  check(authorAtLowTracking.offsetHeight === authorAtHighTracking.offsetHeight, 'slider changes author height');
  check(results[0].spacing !== results[1].spacing, 'slider should change title tracking');
  check(results[3].overflow === true, 'extreme text should trigger warning');
  check(results[5].overflow === false, 'moderate text should fit without ellipsis');
  const changed = document.querySelector('[data-case="3"] .colored-cover-spine');
  changed.querySelector('strong').textContent = 'Махаббатым';
  changed.querySelector('.colored-cover-spine__author').innerHTML = '<span>Аслан</span><span>Досымжан</span>';
  check(fitRenderedSpine(changed, .1) === false, 'shortened text did not recover');
  changed.closest('.colored-cover-spread').style.width = '520px';
  check(fitRenderedSpine(changed, .1) === false, 'resized text did not recover');
  document.querySelector('#result').textContent = JSON.stringify({ passed: true, viewport: innerWidth, results });
} catch (error) { document.querySelector('#result').textContent = JSON.stringify({ passed: false, error: error.message, results }); }
</script></body></html>`;
const server = createServer((request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(page); return; }
    if (path === '/print-bleed') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(bleedPage); return; }
    if (path === '/admin-book') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(adminPage); return; }
    if (path.endsWith('.js')) {
      const name = path.slice(1, -3);
      if (!['spine-text-layout', 'spine-text-fit', 'cover-title-layout', 'chapter-title-layout'].includes(name)) throw new Error('Unknown module');
      response.setHeader('Content-Type', 'application/javascript');
      response.end(ts.transpileModule(readFileSync(join(root, 'src/lib/books', name + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replaceAll('"./spine-text-fit"', '"./spine-text-fit.js"'));
      return;
    }
    let filename;
    if (path === '/globals.css' || path === '/workspace.css') filename = join(root, 'src/app', path.slice(1));
    else if (path.startsWith('/styles/') && path.endsWith('.css')) filename = resolve(root, 'src', '.' + path);
    else if (path.startsWith('/static/')) filename = resolve(root, '.next', '.' + path);
    else if (path.startsWith('/brand/') || path.startsWith('/covers/')) filename = resolve(root, 'public', '.' + path);
    if (!filename || !filename.startsWith(root + '/')) throw new Error('Unknown resource');
    response.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : path.endsWith('.woff2') ? 'font/woff2' : path.endsWith('.jpg') ? 'image/jpeg' : 'image/svg+xml');
    response.end(readFileSync(filename));
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const outputDirectory = mkdtempSync(join(tmpdir(), 'korkembooks-spine-check-'));
const child = spawn(process.env.KORKEM_CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless', '--disable-gpu', '--disable-background-networking', '--disable-component-update', '--disable-extensions', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + join(outputDirectory, 'profile'), 'about:blank']);
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome did not start')), 20000);
    child.on('error', reject);
    child.stderr.on('data', chunk => {
      const match = chunk.toString().match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  const pending = new Map();
  const events = new Map();
  let nextId = 0;
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) pending.get(message.id)?.(message);
    else events.get(message.sessionId + ':' + message.method)?.(message);
  });
  const command = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Timed out: ' + method)); }, 10000);
    pending.set(id, response => {
      clearTimeout(timer);
      pending.delete(id);
      if (response.error) reject(new Error(response.error.message));
      else resolve(response.result);
    });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
  for (const width of [390, 768, 1440]) {
    const { targetId } = await command('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
    await command('Page.enable', {}, sessionId);
    await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false }, sessionId);
    const loaded = new Promise((resolve, reject) => {
      const key = sessionId + ':Page.loadEventFired';
      const timer = setTimeout(() => { events.delete(key); reject(new Error('Page did not load')); }, 10000);
      events.set(key, () => { clearTimeout(timer); events.delete(key); resolve(); });
    });
    await command('Page.navigate', { url: 'http://127.0.0.1:' + server.address().port }, sessionId);
    await loaded;
    const evaluated = await command('Runtime.evaluate', { expression: `new Promise(resolve => { const timer = setInterval(() => { const result = document.querySelector('#result')?.textContent; if (result && result !== 'pending') { clearInterval(timer); resolve(result); } }, 50); })`, awaitPromise: true, returnByValue: true }, sessionId);
    const result = JSON.parse(evaluated.result.value);
    assert.equal(result.passed, true, JSON.stringify(result));
    assert.equal(result.viewport, width);
    console.log(JSON.stringify(result));
    const screenshot = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(join(outputDirectory, width + '.png'), Buffer.from(screenshot.data, 'base64'));
    await command('Runtime.evaluate', { expression: `const field = document.querySelector('[data-designer="1"] .cover-data-fields--spine'); field.closest('details').open = true; field.closest('details').scrollIntoView();` }, sessionId);
    const designerScreenshot = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(join(outputDirectory, width + '-designer.png'), Buffer.from(designerScreenshot.data, 'base64'));
    for (const index of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
      await command('Runtime.evaluate', { expression: `document.querySelector('[data-background-case="${index}"] .cover-preview-stage').scrollIntoView();` }, sessionId);
      const backgroundScreenshot = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
      writeFileSync(join(outputDirectory, width + '-background-' + index + '.png'), Buffer.from(backgroundScreenshot.data, 'base64'));
    }
    await command('Runtime.evaluate', { expression: `document.querySelector('[data-background-case="0"] .cover-frame-color-options').scrollIntoView();` }, sessionId);
    const frameColorScreenshot = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(join(outputDirectory, width + '-frame-colors.png'), Buffer.from(frameColorScreenshot.data, 'base64'));
    await command('Runtime.evaluate', { expression: `document.querySelector('[data-background-case="8"] .cover-style-grid').scrollIntoView();` }, sessionId);
    const cardsScreenshot = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(join(outputDirectory, width + '-style-cards.png'), Buffer.from(cardsScreenshot.data, 'base64'));
    await command('Runtime.evaluate', { expression: `const printFixture = document.createElement('div'); printFixture.className = 'print-book'; printFixture.id = 'print-chapter-fixture'; printFixture.innerHTML = ${JSON.stringify(printChapterMarkup)}; document.body.append(printFixture); const titleFixture = document.createElement('div'); titleFixture.id = 'chapter-title-fit-fixture'; titleFixture.style.setProperty('--font-literata', '"Literata", serif'); titleFixture.innerHTML = ${JSON.stringify(titleFitMarkup)}; document.body.append(titleFixture);` }, sessionId);
    for (const media of ['screen', 'print']) {
      await command('Emulation.setEmulatedMedia', { media }, sessionId);
      const chapters = await command('Runtime.evaluate', { expression: `Array.from(document.querySelectorAll('#print-chapter-fixture > div')).map(page => {
        const background = page.querySelector('.preview-chapter-page');
        const outer = page.getBoundingClientRect();
        const inner = background.getBoundingClientRect();
        return {
          padding: getComputedStyle(page).padding,
          fillsPage: ['left', 'right', 'top', 'bottom'].every(edge => Math.abs(outer[edge] - inner[edge]) < 1),
          width: outer.width, height: outer.height,
          textPadding: parseFloat(getComputedStyle(background).paddingLeft),
          colored: getComputedStyle(background).backgroundColor !== 'rgb(255, 255, 255)',
        };
      })`, returnByValue: true }, sessionId);
      for (const chapter of chapters.result.value) {
        assert.equal(chapter.padding, '0px', media + ': chapter has outer margins');
        assert.equal(chapter.fillsPage, true, media + ': background does not fill A5 page');
        assert.ok(Math.abs(chapter.width - 148 * 96 / 25.4) < 1 && Math.abs(chapter.height - 210 * 96 / 25.4) < 1, media + ': page is not A5');
        assert.ok(chapter.textPadding > 0, media + ': internal text padding removed');
        assert.equal(chapter.colored, true, media + ': chapter lost its background color');
      }
      console.log(JSON.stringify({ viewport: width, media, fullPageChapterBackgrounds: chapters.result.value.length }));
      const fitted = await command('Runtime.evaluate', { expression: String.raw`(async () => {
        const { fitRenderedChapterTitle } = await import('/chapter-title-layout.js');
        await document.fonts.ready;
        const check = (value, message) => { if (!value) throw new Error(message); };
        let reduced = 0;
        const pages = document.querySelectorAll('[data-title-fit]');
        for (const outer of pages) {
          const page = outer.querySelector('.preview-chapter-page');
          const title = page.querySelector('h2');
          const original = title.textContent;
          fitRenderedChapterTitle(page);
          const scale = Number(title.style.getPropertyValue('--chapter-title-scale'));
          if (scale < 1) reduced++;
          check(original === title.textContent, 'fitting changed or truncated title');
          check(getComputedStyle(title).overflowWrap === 'normal', 'words can still break');
          check(getComputedStyle(title).hyphens === 'none', 'hyphenation enabled');
          check(getComputedStyle(title).fontFamily.includes('Literata'), 'production chapter font missing');
          const bounds = title.getBoundingClientRect();
          const pageBounds = page.getBoundingClientRect();
          check(bounds.top >= pageBounds.top - 1 && bounds.bottom <= pageBounds.bottom + 1, 'title leaves page vertically');
          let offset = 0;
          for (const unit of original.split(/([\t\n\r\f ]+)/u)) {
            if (unit && !/^[\t\n\r\f ]+$/u.test(unit)) {
              const range = document.createRange();
              range.setStart(title.firstChild, offset);
              range.setEnd(title.firstChild, offset + unit.length);
              const rects = range.getClientRects();
              check(rects.length === 1, 'word or linked phrase split across lines');
              check(rects[0].left >= bounds.left - 1 && rects[0].right <= bounds.right + 1, 'unbroken word overflows title');
            }
            offset += unit.length;
          }
          if (original === 'Начало') check(scale === 1, 'short title shrank unnecessarily');
          title.textContent = 'Начало';
          fitRenderedChapterTitle(page);
          check(title.style.getPropertyValue('--chapter-title-scale') === '1', 'shortened title did not recover');
          title.textContent = original;
          fitRenderedChapterTitle(page);
        }
        check(reduced > 0, 'long titles did not shrink');
        return { passed: true, cases: pages.length, reduced };
      })()`, awaitPromise: true, returnByValue: true }, sessionId);
      assert.equal(fitted.exceptionDetails, undefined, JSON.stringify(fitted.exceptionDetails));
      assert.equal(fitted.result.value.passed, true);
      console.log(JSON.stringify({ viewport: width, media, chapterTitleFit: fitted.result.value }));
    }
    await command('Emulation.setEmulatedMedia', { media: 'screen' }, sessionId);
    await command('Runtime.evaluate', { expression: `document.querySelectorAll('[data-title-fit]')[141].scrollIntoView({ block: 'start' });` }, sessionId);
    const titleScreenshot = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(join(outputDirectory, width + '-chapter-title.png'), Buffer.from(titleScreenshot.data, 'base64'));
    const bleedLoaded = new Promise((resolve, reject) => {
      const key = sessionId + ':Page.loadEventFired';
      const timer = setTimeout(() => { events.delete(key); reject(new Error('Bleed page did not load')); }, 10000);
      events.set(key, () => { clearTimeout(timer); events.delete(key); resolve(); });
    });
    await command('Page.navigate', { url: 'http://127.0.0.1:' + server.address().port + '/print-bleed' }, sessionId);
    await bleedLoaded;
    await command('Runtime.evaluate', { expression: `new Promise(resolve => {const timer=setInterval(()=>{if(document.querySelector('#result').textContent==='ready'){clearInterval(timer);resolve();}},25);})`, awaitPromise: true }, sessionId);
    for (const media of ['screen', 'print']) {
      await command('Emulation.setEmulatedMedia', { media }, sessionId);
      const bleedResult = await command('Runtime.evaluate', { expression: `(() => {
        const mm = value => value * 96 / 25.4;
        const near = (actual, expected) => Math.abs(actual - expected) < 1;
        const check = (value, message) => {if(!value)throw new Error(message);};
        const sheets = document.querySelectorAll('.print-book-sheet');
        check(sheets.length === 9, 'unexpected content page count: '+sheets.length);
        check(document.querySelector('[data-print-count=color]').textContent==='8','print color count wrong');
        check(document.querySelector('[data-print-count=monochrome]').textContent==='1','print monochrome count wrong');
        check(document.querySelector('[data-print-count=total]').textContent===String(sheets.length),'print total differs from actual pages');
        check(document.querySelector('[data-print-ranges=color]').textContent==='1-4, 6-9','color print ranges wrong');
        check(document.querySelector('[data-print-ranges=monochrome]').textContent==='5','monochrome print ranges wrong');
        const quotePage=document.querySelector('.preview-text-page--quote');
        check(quotePage?.style.getPropertyValue('--text-page-size')==='28px','quote font size was not preserved');
        check(!quotePage.closest('.print-book-sheet').querySelector('.preview-page__footer'),'hidden text-page footer was rendered');
        for(const [index,sheet] of [...sheets].entries()){
          check(Number(sheet.dataset.pageNumber)===index+1,'PDF sheet numbers shifted');
          check(sheet.dataset.printMode===(sheet.querySelector('.preview-page__content')?'monochrome':'color'),'sheet mode differs from statistics');
        }
        check(document.querySelector('.print-book-toolbar').textContent.includes('152 × 214'), 'old A5 print instruction remains');
        check(document.querySelectorAll('.book-photo-collage--four_grid .book-photo-collage__slot').length===4,'four-photo collage is incomplete');
        for(const sheet of sheets){
          const outer=sheet.getBoundingClientRect();
          const trim=sheet.querySelector('.print-preview-page').getBoundingClientRect();
          check(near(outer.width,mm(152))&&near(outer.height,mm(214)), 'sheet does not include bleed');
          check(near(trim.width,mm(148))&&near(trim.height,mm(210)), 'trim layout changed size');
          for(const edge of ['left','top'])check(near(trim[edge]-outer[edge],mm(2)), 'bleed offset wrong');
          for(const edge of ['right','bottom'])check(near(outer[edge]-trim[edge],mm(2)), 'bleed size wrong');
          const background=sheet.querySelector('.preview-chapter-page,.preview-photo-page,.preview-blank-page,.preview-text-page');
          if(background)check(getComputedStyle(sheet).backgroundColor===getComputedStyle(background).backgroundColor,'background not continued into bleed');
          const full=sheet.querySelector('.preview-photo-page--full .preview-photo-page__frame');
          if(full){const imageBounds=full.getBoundingClientRect();for(const edge of ['left','top','right','bottom'])check(near(imageBounds[edge],outer[edge]),'full photo does not fill bleed');check(full.querySelector('img').style.transform.includes('scale(1.1)'), 'photo crop lost');}
          const contained=sheet.querySelector('.preview-photo-page--contain .preview-photo-page__frame');
          if(contained){const frame=contained.getBoundingClientRect();check(near(frame.left-trim.left,mm(18))&&near(frame.top-trim.top,mm(18)), 'contained photo margin is not 20 mm including bleed');}
          const footer=sheet.querySelector('.preview-page__footer');
          if(footer){const rect=footer.getBoundingClientRect();check(near(rect.left-trim.left,mm(18))&&near(trim.bottom-rect.bottom,mm(18)), 'footer margin is not 20 mm including bleed');}
          const body=sheet.querySelector('.preview-page__content');
          if(body){const rect=body.getBoundingClientRect();check(near(rect.left-trim.left,mm(18))&&near(rect.top-trim.top,mm(18)), 'answer margin is not 20 mm including bleed');}
        }
        if(matchMedia('print').matches){
          for(const selector of ['.mobile-menu-button','.sidebar-backdrop','.print-book-toolbar','next-route-announcer'])check(getComputedStyle(document.querySelector(selector)).display==='none',selector+' remains visible in print');
          check(getComputedStyle(document.querySelector('.print-book-stage')).padding==='0px','preview stage adds print margins');
        }else{
          const toolbar=document.querySelector('.print-book-toolbar');
          const content=document.querySelector('.workspace-content').getBoundingClientRect();
          const bounds=toolbar.getBoundingClientRect();
          check(Math.abs(bounds.width-content.width)<1 && Math.abs(bounds.left-content.left)<1,'print toolbar is not full workspace width');
          check(!document.querySelector('.print-book').contains(toolbar),'toolbar remains inside the printed book');
          check(document.querySelector('.print-book-stage').getBoundingClientRect().top>=bounds.bottom,'preview overlaps settings');
          check(document.documentElement.scrollWidth<=innerWidth,'print workspace overflows screen');
          check((getComputedStyle(document.querySelector('.mobile-menu-button')).display!=='none')===matchMedia('(max-width: 980px)').matches,'screen menu visibility changed');
          check(getComputedStyle(document.querySelector('.sidebar-backdrop')).display!=='none','screen backdrop was hidden');
        }
        return {passed:true,sheets:sheets.length};
      })()`, returnByValue: true }, sessionId);
      assert.equal(bleedResult.exceptionDetails, undefined, JSON.stringify(bleedResult.exceptionDetails));
      assert.equal(bleedResult.result.value.passed, true);
      console.log(JSON.stringify({ viewport: width, media, bleed: bleedResult.result.value }));
    }
    const pdf = await command('Page.printToPDF', { preferCSSPageSize: true, printBackground: true }, sessionId);
    const pdfBuffer = Buffer.from(pdf.data, 'base64');
    const pdfText = pdfBuffer.toString('latin1');
    assert.equal((pdfText.match(/\/Type\s*\/Page\b/g) ?? []).length, 9, 'extra blank PDF sheet');
    const boxes = [...pdfText.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
    assert.ok(boxes.length > 0, 'PDF page dimensions missing');
    // Chromium rounds PDF paper dimensions to printer pixels (up to ~0.18 mm).
    // DOM checks above separately verify the exact 2 mm bleed and unchanged A5 trim.
    for (const box of boxes) assert.ok(Math.abs(Number(box[1]) - 152 * 72 / 25.4) < .5 && Math.abs(Number(box[2]) - 214 * 72 / 25.4) < .5, 'PDF not 152 × 214 mm: ' + JSON.stringify(box.slice(1)));
    console.log(JSON.stringify({ viewport: width, pdfPages: (pdfText.match(/\/Type\s*\/Page\b/g) ?? []).length, paperMillimeters: boxes[0].slice(1).map(value => Number(value) * 25.4 / 72) }));
    writeFileSync(join(outputDirectory, width + '-bleed.pdf'), pdfBuffer);
    await command('Emulation.setEmulatedMedia', { media: 'screen' }, sessionId);
    await command('Runtime.evaluate', { expression: `document.querySelector('.sidebar-backdrop').remove();` }, sessionId);
    // Let the main area's screen/print margin transition settle before visual capture.
    await command('Runtime.evaluate', { expression: 'new Promise(resolve => setTimeout(resolve, 300))', awaitPromise: true }, sessionId);
    const printSettingsScreenshot = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(join(outputDirectory, width + '-print-settings.png'), Buffer.from(printSettingsScreenshot.data, 'base64'));
    await command('Runtime.evaluate', { expression: `document.querySelector('.print-preview-page.preview-page--photo').closest('.print-book-sheet').scrollIntoView({block:'start'});` }, sessionId);
    const bleedScreenshot = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(join(outputDirectory, width + '-bleed.png'), Buffer.from(bleedScreenshot.data, 'base64'));
    const adminLoaded = new Promise((resolve, reject) => {
      const key = sessionId + ':Page.loadEventFired';
      const timer = setTimeout(() => { events.delete(key); reject(new Error('Admin page did not load')); }, 10000);
      events.set(key, () => { clearTimeout(timer); events.delete(key); resolve(); });
    });
    await command('Page.navigate', { url: 'http://127.0.0.1:' + server.address().port + '/admin-book' }, sessionId);
    await adminLoaded;
    await command('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true }, sessionId);
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }, sessionId);
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }, sessionId);
    const adminResult = await command('Runtime.evaluate', { expression: `(() => {
      const check = (value, message) => {if(!value)throw new Error(message);};
      const root = document.querySelector('.admin-book-workspace');
      const card = root.querySelector('.book-summary-card').getBoundingClientRect();
      const stats = root.querySelector('.book-overview__progress').getBoundingClientRect();
      check(root.querySelector('h1').textContent === 'Махаббатым', 'book identity lost');
      check(!root.querySelector('.book-summary-cover'), 'decorative cover remains in admin summary');
      check(root.querySelector('progress').value === 5, 'progress changed');
      check(root.querySelector('.admin-book-metadata').textContent.includes('2 из 4'), 'answer count lost');
      check(root.querySelector('time').dateTime === '2026-09-15T10:00:00Z', 'update date lost');
      const status = root.querySelector('.book-status-wrapper .book-status-select');
      check(status.options.length === 2 && status.value === 'writing', 'status selector changed');
      const arrow = status.closest('.book-status-control').querySelector('svg');
      check(arrow && getComputedStyle(arrow).pointerEvents==='none', 'status arrow intercepts clicks');
      check(getComputedStyle(status).appearance==='none', 'native status arrow remains');
      const unfocusedBorder = getComputedStyle(status).borderColor;
      status.focus();
      const focus = getComputedStyle(status);
      check(status.matches(':focus-visible'), 'keyboard focus missing');
      check(focus.boxShadow==='none', 'extra status focus ring remains');
      check(focus.outlineWidth==='2px' && focus.outlineOffset==='2px' && focus.outlineStyle==='solid', 'status focus outline incorrect');
      check(focus.borderColor===unfocusedBorder, 'status focus adds another colored border');
      const bounds = status.getBoundingClientRect();
      const arrowBounds = arrow.getBoundingClientRect();
      check(Math.abs(bounds.right-arrowBounds.right-14)<1 && Math.abs((bounds.top+bounds.bottom-arrowBounds.top-arrowBounds.bottom)/2)<1, 'status arrow not aligned');
      const tabs = root.querySelectorAll('.admin-book-section-tabs a');
      check(tabs.length===4 && tabs[0].getAttribute('aria-current')==='page', 'book tabs missing or overview is not active');
      check([...tabs].map(tab => tab.textContent.trim()).join('|')==='Обзор|Финансы|Доставка|Главы и ответы', 'book tab labels changed');
      check(root.querySelector('.print-format-control button')?.textContent.includes('Скачать PDF'), 'download control missing before production');
      check(root.querySelector('[data-print-count=color]').textContent==='5','admin color count wrong');
      check(root.querySelector('[data-print-count=monochrome]').textContent==='2','admin monochrome count wrong');
      check(root.querySelector('[data-print-count=total]').textContent==='7','admin total count wrong');
      const printDetails = root.querySelector('.book-print-stats details');
      printDetails.querySelector('summary').click(); check(printDetails.open, 'print ranges do not open');
      check(root.querySelector('[data-print-ranges=monochrome]').textContent==='5, 7','admin page ranges wrong');
      printDetails.querySelector('summary').click();
      check(!root.querySelector('.book-finance-panel,.book-delivery,.admin-chapter'), 'inactive tab content remains on overview');
      if(innerWidth > 1100)check(Math.abs(card.top - stats.top) < 1 && stats.left >= card.right, 'wide overview is not horizontal');
      else check(stats.top >= card.bottom, 'small overview is not stacked');
      check(document.documentElement.scrollWidth <= innerWidth, 'admin page overflows');
      return {passed:true};
    })()`, returnByValue: true }, sessionId);
    assert.equal(adminResult.exceptionDetails, undefined, JSON.stringify(adminResult.exceptionDetails));
    const adminScreenshot = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(join(outputDirectory, width + '-admin.png'), Buffer.from(adminScreenshot.data, 'base64'));
    const longAdminResult = await command('Runtime.evaluate', { expression: `(() => {
      document.querySelector('.admin-book-workspace h1').textContent = 'Воспоминания нашей семьи '.repeat(12);
      document.querySelector('.book-summary-people dd').textContent = 'ДлинноеИмяАвтора'.repeat(15);
      if(document.documentElement.scrollWidth > innerWidth)throw new Error('Long admin text overflows');
      return {passed:true};
    })()`, returnByValue: true }, sessionId);
    assert.equal(longAdminResult.exceptionDetails, undefined, JSON.stringify(longAdminResult.exceptionDetails));
    console.log(JSON.stringify({ viewport: width, adminLayout: adminResult.result.value, longAdminText: longAdminResult.result.value }));
    await command('Target.closeTarget', { targetId });
  }
  console.log('Screenshots: ' + outputDirectory);
} finally {
  socket?.close();
  child.kill();
  child.stdout.destroy();
  child.stderr.destroy();
  server.closeAllConnections();
  server.close();
}
