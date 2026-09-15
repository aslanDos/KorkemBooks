insert into public.cover_templates (
  slug,
  name,
  background_path,
  text_color,
  overlay_color,
  overlay_opacity,
  is_active,
  sort_order
)
values
  ('ivory-roses', 'Розы на слоновой кости', '/covers/ivory-roses.jpg', '#29251f', null, 0, true, 10),
  ('dark-floral', 'Тёмный цветочный', '/covers/dark-floral.jpg', '#29251f', null, 0, true, 20),
  ('blue-birds', 'Синие птицы', '/covers/blue-birds.jpg', '#29251f', null, 0, true, 30),
  ('pale-blue-blossom', 'Цветущие ветви', '/covers/pale-blue-blossom.jpg', '#29251f', null, 0, true, 40),
  ('turquoise-almond', 'Бирюзовый миндаль', '/covers/turquoise-almond.jpg', '#29251f', null, 0, true, 60)
on conflict (slug) do update set
  name = excluded.name,
  background_path = excluded.background_path,
  text_color = excluded.text_color,
  overlay_color = excluded.overlay_color,
  overlay_opacity = excluded.overlay_opacity,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

update public.cover_templates
set is_active = false
where slug in ('golden-peach', 'rose-beige');
