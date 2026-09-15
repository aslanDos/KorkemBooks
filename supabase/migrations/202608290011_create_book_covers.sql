create table public.cover_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 100),
  background_path text not null,
  text_color text not null default '#2d332d',
  overlay_color text,
  overlay_opacity numeric(3, 2) not null default 0 check (overlay_opacity between 0 and 1),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.book_covers (
  book_id uuid primary key references public.books (id) on delete cascade,
  template_id uuid not null references public.cover_templates (id),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  show_author boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger cover_templates_set_updated_at before update on public.cover_templates
for each row execute function public.set_updated_at();
create trigger book_covers_set_updated_at before update on public.book_covers
for each row execute function public.set_updated_at();

insert into public.cover_templates (slug, name, background_path, text_color, sort_order)
values
  ('golden-peach', 'Золотистый персик', '/covers/golden-peach-texture.jpg', '#35291f', 10),
  ('rose-beige', 'Пудровый беж', '/covers/rose-beige-texture.jpg', '#382b29', 20)
on conflict (slug) do update set
  name = excluded.name,
  background_path = excluded.background_path,
  text_color = excluded.text_color,
  sort_order = excluded.sort_order;

alter table public.cover_templates enable row level security;
alter table public.book_covers enable row level security;

create policy "Authenticated users can read active cover templates"
on public.cover_templates for select to authenticated
using (is_active = true);

create policy "Users can read their book covers"
on public.book_covers for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can choose covers for their books"
on public.book_covers for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.books
    where books.id = book_covers.book_id
      and books.owner_id = (select auth.uid())
      and books.deleted_at is null
  )
  and exists (
    select 1 from public.cover_templates
    where cover_templates.id = book_covers.template_id
      and cover_templates.is_active = true
  )
);

create policy "Users can change covers for their books"
on public.book_covers for update to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.books
    where books.id = book_covers.book_id
      and books.owner_id = (select auth.uid())
  )
  and exists (
    select 1 from public.cover_templates
    where cover_templates.id = book_covers.template_id
      and cover_templates.is_active = true
  )
);

revoke all on table public.cover_templates, public.book_covers from anon;
revoke insert, update, delete on table public.cover_templates from authenticated;
grant select on table public.cover_templates to authenticated;
grant select, insert, update on table public.book_covers to authenticated;
