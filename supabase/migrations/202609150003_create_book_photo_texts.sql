create table public.book_photo_texts (
  image_id uuid primary key references public.book_page_images (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  enabled boolean not null default false,
  content text not null default '' check (char_length(content) <= 300),
  text_size smallint not null default 12 check (text_size in (10, 12, 14, 16, 20)),
  placement text not null default 'overlay' check (placement in ('overlay', 'below')),
  position text not null default 'bottom' check (position in ('top', 'middle', 'bottom')),
  tone text not null default 'auto' check (tone in ('auto', 'light', 'dark')),
  image_darkening smallint not null default 0 check (image_darkening between 0 and 70),
  text_shadow smallint not null default 40 check (text_shadow between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.book_photo_texts is
'An optional styled text block displayed on a photo page.';

create trigger book_photo_texts_set_updated_at
before update on public.book_photo_texts
for each row execute function public.set_updated_at();

create trigger book_photo_texts_guard_after_submission
before insert or update or delete on public.book_photo_texts
for each row execute function public.guard_locked_book_content();

alter table public.book_photo_texts enable row level security;

create policy "Users can read photo text in their books"
on public.book_photo_texts for select to authenticated
using (
  exists (
    select 1
    from public.book_page_images
    join public.books on books.id = book_page_images.book_id
    where book_page_images.id = book_photo_texts.image_id
      and book_page_images.book_id = book_photo_texts.book_id
      and books.owner_id = (select auth.uid())
      and books.deleted_at is null
  )
);

create policy "Users can add photo text in their books"
on public.book_photo_texts for insert to authenticated
with check (
  exists (
    select 1
    from public.book_page_images
    join public.books on books.id = book_page_images.book_id
    where book_page_images.id = book_photo_texts.image_id
      and book_page_images.book_id = book_photo_texts.book_id
      and books.owner_id = (select auth.uid())
      and books.deleted_at is null
  )
);

create policy "Users can update photo text in their books"
on public.book_photo_texts for update to authenticated
using (
  exists (
    select 1
    from public.book_page_images
    join public.books on books.id = book_page_images.book_id
    where book_page_images.id = book_photo_texts.image_id
      and book_page_images.book_id = book_photo_texts.book_id
      and books.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.book_page_images
    join public.books on books.id = book_page_images.book_id
    where book_page_images.id = book_photo_texts.image_id
      and book_page_images.book_id = book_photo_texts.book_id
      and books.owner_id = (select auth.uid())
  )
);

create policy "Users can delete photo text in their books"
on public.book_photo_texts for delete to authenticated
using (
  exists (
    select 1
    from public.book_page_images
    join public.books on books.id = book_page_images.book_id
    where book_page_images.id = book_photo_texts.image_id
      and book_page_images.book_id = book_photo_texts.book_id
      and books.owner_id = (select auth.uid())
  )
);

revoke all on table public.book_photo_texts from anon;
grant select, insert, update, delete on table public.book_photo_texts to authenticated;

create index book_photo_texts_book_idx on public.book_photo_texts (book_id);
