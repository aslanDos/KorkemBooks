-- Reduce the girlfriend template to 8 chapters and 80 questions.
-- Existing instantiated books keep their chapters, questions and answers.

create temporary table girlfriend_question_snapshot on commit drop as
with target_type as (
  select id from public.book_types where slug = 'girlfriend'
), question_mapping (new_chapter, new_position, old_chapter, old_position) as (
  values
    (1, 1, 1, 1), (1, 2, 1, 2), (1, 3, 1, 3), (1, 4, 1, 4), (1, 5, 1, 5),
    (1, 6, 1, 6), (1, 7, 1, 7), (1, 8, 1, 8), (1, 9, 1, 9), (1, 10, 1, 10),

    (2, 1, 3, 1), (2, 2, 3, 2), (2, 3, 3, 3), (2, 4, 3, 4), (2, 5, 3, 5),
    (2, 6, 3, 6), (2, 7, 3, 7), (2, 8, 3, 8), (2, 9, 3, 9), (2, 10, 3, 10),

    (3, 1, 4, 1), (3, 2, 4, 2), (3, 3, 4, 3), (3, 4, 4, 4), (3, 5, 4, 5),
    (3, 6, 4, 6), (3, 7, 4, 7), (3, 8, 4, 8), (3, 9, 4, 9), (3, 10, 4, 10),

    (4, 1, 5, 1), (4, 2, 5, 3), (4, 3, 5, 5), (4, 4, 5, 7), (4, 5, 5, 8),
    (4, 6, 6, 1), (4, 7, 6, 4), (4, 8, 6, 5), (4, 9, 6, 6), (4, 10, 6, 10),

    (5, 1, 7, 1), (5, 2, 7, 2), (5, 3, 7, 3), (5, 4, 7, 4), (5, 5, 7, 5),
    (5, 6, 7, 6), (5, 7, 7, 7), (5, 8, 7, 8), (5, 9, 7, 9), (5, 10, 7, 10),

    (6, 1, 8, 1), (6, 2, 8, 2), (6, 3, 8, 3), (6, 4, 8, 4), (6, 5, 8, 5),
    (6, 6, 9, 1), (6, 7, 9, 2), (6, 8, 9, 3), (6, 9, 9, 6), (6, 10, 9, 9),

    (7, 1, 10, 1), (7, 2, 10, 2), (7, 3, 10, 3), (7, 4, 10, 5), (7, 5, 10, 6),
    (7, 6, 11, 1), (7, 7, 11, 2), (7, 8, 11, 3), (7, 9, 11, 6), (7, 10, 11, 9),

    (8, 1, 12, 1), (8, 2, 12, 2), (8, 3, 12, 3), (8, 4, 12, 4), (8, 5, 12, 5),
    (8, 6, 12, 6), (8, 7, 12, 7), (8, 8, 12, 8), (8, 9, 12, 9), (8, 10, 12, 10)
)
select question_mapping.new_chapter, question_mapping.new_position, questions.prompt
from question_mapping
join target_type on true
join public.book_type_chapter_templates as chapters
  on chapters.book_type_id = target_type.id
 and chapters.position = question_mapping.old_chapter
join public.book_type_question_templates as questions
  on questions.chapter_template_id = chapters.id
 and questions.position = question_mapping.old_position;

delete from public.book_type_question_templates as questions
using public.book_type_chapter_templates as chapters, public.book_types as types
where questions.chapter_template_id = chapters.id
  and chapters.book_type_id = types.id
  and types.slug = 'girlfriend';

with target_type as (
  select id from public.book_types where slug = 'girlfriend'
), chapter_data (position, title) as (
  values
    (1, 'О вас и об этой книге'),
    (2, 'Знакомство'),
    (3, 'Первые шаги навстречу'),
    (4, 'Первые свидания и начало отношений'),
    (5, 'Её характер и уникальность'),
    (6, 'Ваш общий мир и воспоминания'),
    (7, 'Забота, поддержка и будущее'),
    (8, 'Благодарность и послание ей')
)
update public.book_type_chapter_templates as chapters
set title = chapter_data.title
from target_type, chapter_data
where chapters.book_type_id = target_type.id
  and chapters.position = chapter_data.position;

delete from public.book_type_chapter_templates as chapters
using public.book_types as types
where chapters.book_type_id = types.id
  and types.slug = 'girlfriend'
  and chapters.position > 8;

insert into public.book_type_question_templates (chapter_template_id, prompt, position)
select chapters.id, snapshot.prompt, snapshot.new_position
from girlfriend_question_snapshot as snapshot
join public.book_types as types on types.slug = 'girlfriend'
join public.book_type_chapter_templates as chapters
  on chapters.book_type_id = types.id
 and chapters.position = snapshot.new_chapter
order by snapshot.new_chapter, snapshot.new_position;
