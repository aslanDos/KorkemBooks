alter table public.book_covers
add column if not exists spine_letter_spacing smallint not null default 10
check (spine_letter_spacing between 0 and 50);
