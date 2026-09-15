-- Also lets the book owner view a cover background uploaded by an administrator.
create policy "Book owners can view attached custom cover images"
on storage.objects for select to authenticated
using (
  bucket_id = 'book-cover-images'
  and exists (
    select 1 from public.book_covers cover
    where cover.owner_id = (select auth.uid())
      and cover.custom_background_path = storage.objects.name
  )
);
