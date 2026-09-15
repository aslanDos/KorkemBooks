alter table public.answers
add column answer_format jsonb not null default '{"version":1,"marks":[]}'::jsonb;

alter table public.answers
add constraint answers_answer_format_object_check
check (jsonb_typeof(answer_format) = 'object');

comment on column public.answers.answer_format is
'Inline formatting ranges for answer_text. Only bold, italic and underline marks are supported.';
