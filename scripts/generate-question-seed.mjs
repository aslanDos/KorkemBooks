import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve("content/question-templates/girlfriend.md");
const outputPath = resolve("supabase/migrations/202608290004_seed_girlfriend_questions.sql");
const source = await readFile(sourcePath, "utf8");

const chapters = [];
let currentChapter;

for (const line of source.split(/\r?\n/)) {
  const chapterMatch = line.match(/^##\s+\d+\.\s+(.+)$/);
  if (chapterMatch) {
    currentChapter = { title: chapterMatch[1], questions: [] };
    chapters.push(currentChapter);
    continue;
  }

  const questionMatch = line.match(/^\d+\.\s+(.+)$/);
  if (questionMatch && currentChapter) currentChapter.questions.push(questionMatch[1]);
}

if (chapters.length !== 12 || chapters.some((chapter) => chapter.questions.length !== 10)) {
  throw new Error("Expected 12 chapters with 10 questions each");
}

const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const chapterValues = chapters.map((chapter, index) => `    (${index + 1}, ${quote(chapter.title)})`).join(",\n");
const questionValues = chapters.flatMap((chapter, chapterIndex) =>
  chapter.questions.map((question, questionIndex) => `    (${chapterIndex + 1}, ${questionIndex + 1}, ${quote(question)})`),
).join(",\n");

const sql = `-- Generated from content/question-templates/girlfriend.md.
-- Edit the Markdown source and run: node scripts/generate-question-seed.mjs

with target_type as (
  select id from public.book_types where slug = 'girlfriend'
), chapter_data (position, title) as (
  values
${chapterValues}
)
insert into public.book_type_chapter_templates (book_type_id, title, position)
select target_type.id, chapter_data.title, chapter_data.position
from target_type cross join chapter_data
on conflict (book_type_id, position) do update set title = excluded.title;

with target_type as (
  select id from public.book_types where slug = 'girlfriend'
), question_data (chapter_position, position, prompt) as (
  values
${questionValues}
)
insert into public.book_type_question_templates (chapter_template_id, prompt, position)
select chapters.id, question_data.prompt, question_data.position
from question_data
join target_type on true
join public.book_type_chapter_templates as chapters
  on chapters.book_type_id = target_type.id
 and chapters.position = question_data.chapter_position
on conflict (chapter_template_id, position) do update set prompt = excluded.prompt;

-- Populate books created before this template was installed. The function is idempotent.
select public.instantiate_book_template(books.id)
from public.books as books
join public.book_types as types on types.id = books.type_id
where types.slug = 'girlfriend' and books.deleted_at is null;
`;

await writeFile(outputPath, sql);
console.log(`Generated ${outputPath}: ${chapters.length} chapters, ${chapters.reduce((sum, chapter) => sum + chapter.questions.length, 0)} questions`);
