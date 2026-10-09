-- Pickup is no longer supported. Existing pickup rows contain no address, so
-- remove them and let administrators enter delivery details explicitly.
delete from public.book_deliveries where pickup = true;

alter table public.book_deliveries
drop constraint book_deliveries_address_required,
drop column pickup;

alter table public.book_deliveries
add constraint book_deliveries_address_required
check (char_length(trim(city)) > 0 and char_length(trim(address)) > 0);
