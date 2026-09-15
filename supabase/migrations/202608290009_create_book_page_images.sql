create table public.book_page_images (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  question_id uuid not null unique references public.questions (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 6291456),
  display_mode text not null default 'contain' check (display_mode in ('contain', 'full')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.book_page_images is 'A private image attached to a question page in a user book.';

create trigger book_page_images_set_updated_at
before update on public.book_page_images
for each row execute function public.set_updated_at();

alter table public.book_page_images enable row level security;

create policy "Users can read images in their books"
on public.book_page_images for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can add images to their books"
on public.book_page_images for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.questions
    join public.chapters on chapters.id = questions.chapter_id
    join public.books on books.id = chapters.book_id
    where questions.id = book_page_images.question_id
      and books.id = book_page_images.book_id
      and books.owner_id = (select auth.uid())
      and books.deleted_at is null
      and chapters.deleted_at is null
      and questions.deleted_at is null
  )
);

create policy "Users can replace images in their books"
on public.book_page_images for update to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.questions
    join public.chapters on chapters.id = questions.chapter_id
    join public.books on books.id = chapters.book_id
    where questions.id = book_page_images.question_id
      and books.id = book_page_images.book_id
      and books.owner_id = (select auth.uid())
  )
);

create policy "Users can delete images in their books"
on public.book_page_images for delete to authenticated
using ((select auth.uid()) = owner_id);

revoke all on table public.book_page_images from anon;
grant select, insert, update, delete on table public.book_page_images to authenticated;

create index book_page_images_book_idx on public.book_page_images (book_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-images',
  'book-images',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can view their book images"
on storage.objects for select to authenticated
using (
  bucket_id = 'book-images'
  and owner_id = (select auth.uid()::text)
);

create policy "Users can upload their book images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'book-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can delete their book images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'book-images'
  and owner_id = (select auth.uid()::text)
);
