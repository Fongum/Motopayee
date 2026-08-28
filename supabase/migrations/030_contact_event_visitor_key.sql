-- Per-browser identity for contact events.
--
-- Contact rows are one per click, so a buyer who taps WhatsApp three times
-- looks like three inquiries. Authenticated clicks carry actor_id, but most
-- launch traffic is anonymous, so reads had nothing to group by. visitor_key
-- is a random id the browser keeps in localStorage — no IP, no fingerprint —
-- letting reads collapse repeat taps per viewer, per listing, per day while
-- the raw click rows stay intact.

alter table public.contact_events
  add column if not exists visitor_key text
  check (visitor_key is null or char_length(visitor_key) between 8 and 64);

create index if not exists idx_ce_visitor on public.contact_events (visitor_key, date_day);
