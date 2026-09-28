-- Cover design is managed by administrators. Book owners keep read access so
-- their dashboard and previews can render the selected cover.
drop policy if exists "Users can choose covers for their books" on public.book_covers;
drop policy if exists "Users can change covers for their books" on public.book_covers;

create policy "Admins can create book covers"
on public.book_covers for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

create policy "Admins can change book covers"
on public.book_covers for update to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

drop policy if exists "Users can upload their custom cover images" on storage.objects;
drop policy if exists "Users can delete their custom cover images" on storage.objects;

create policy "Admins can upload custom cover images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'book-cover-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

create policy "Admins can delete custom cover images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'book-cover-images'
  and owner_id = (select auth.uid()::text)
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);
