-- Normalized contact keys make duplicate lead detection reliable across forms and staff entry.

alter table public.launch_leads
  add column if not exists phone_key text,
  add column if not exists email_key text;

update public.launch_leads
set
  phone_key = nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), ''),
  email_key = nullif(lower(trim(coalesce(email, ''))), '')
where phone_key is null or email_key is null;

create index if not exists launch_leads_phone_key_idx
  on public.launch_leads (phone_key)
  where phone_key is not null;

create index if not exists launch_leads_email_key_idx
  on public.launch_leads (email_key)
  where email_key is not null;
