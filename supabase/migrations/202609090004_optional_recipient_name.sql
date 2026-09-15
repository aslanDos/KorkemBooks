-- Keep a string value for existing clients; an empty string means no recipient name.
alter table public.books drop constraint books_recipient_name_check;
alter table public.books add constraint books_recipient_name_check check (char_length(recipient_name) <= 120);
alter table public.books alter column recipient_name set default '';
