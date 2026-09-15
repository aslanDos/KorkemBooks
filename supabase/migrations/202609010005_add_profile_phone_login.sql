alter table public.profiles
add column phone_e164 text;

alter table public.profiles
add constraint profiles_phone_e164_format
check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{9,14}$');

create unique index profiles_phone_e164_unique
on public.profiles (phone_e164)
where phone_e164 is not null;

comment on column public.profiles.phone_e164 is
'Normalized phone number used as the application login. Technical Supabase Auth emails are never shown to users.';

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, phone_e164)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone_e164', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
