alter table public.book_covers
add column if not exists custom_background_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'book-cover-images',
  'book-cover-images',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can view their custom cover images"
on storage.objects for select to authenticated
using (
  bucket_id = 'book-cover-images'
  and owner_id = (select auth.uid()::text)
);

create policy "Users can upload their custom cover images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'book-cover-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can delete their custom cover images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'book-cover-images'
  and owner_id = (select auth.uid()::text)
);
