alter table public.book_covers
add column if not exists background_inside_frame boolean not null default false;

comment on column public.book_covers.background_inside_frame is
'Clip the template background to the selected decorative frame interior when the frame is enabled.';
