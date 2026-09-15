alter table public.book_page_images
add column if not exists display_mode text not null default 'contain';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'book_page_images_display_mode_check'
      and conrelid = 'public.book_page_images'::regclass
  ) then
    alter table public.book_page_images
    add constraint book_page_images_display_mode_check
    check (display_mode in ('contain', 'full'));
  end if;
end;
$$;
