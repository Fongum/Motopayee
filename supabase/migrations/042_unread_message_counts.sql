-- ============================================================
-- Migration 042 — Unread message counts in the database
--
-- Three places worked out how many messages a user has not read, and two of
-- them did it by fetching every unread row and counting the array:
--
--   GET /api/conversations   select('conversation_id') ... then tally in JS
--   /me/inbox                the same block, copied
--   GET /api/messages/unread-count   count:'exact', head:true — the right way
--
-- The two that count in JavaScript are wrong twice over. PostgREST truncates the
-- fetch at db-max-rows, so a busy inbox stops counting at 1000; and every unread
-- row crosses the wire to be discarded after incrementing a number.
--
-- All three also resolved the user's conversations first and passed the ids back
-- through `.in(...)`, which is a second round trip and its own row cap.
--
-- One call now answers both questions — the per-conversation breakdown and the
-- badge total — for a given user, with the membership test inlined.
-- ============================================================

create or replace function public.unread_message_counts(
  p_user_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select m.conversation_id
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
     where m.read_at is null
       and m.sender_id <> p_user_id
       and (c.participant_a = p_user_id or c.participant_b = p_user_id)
  )
  select jsonb_build_object(
    'total', (select count(*) from mine),
    'by_conversation', coalesce((
      select jsonb_object_agg(conversation_id, n)
        from (select conversation_id, count(*) as n from mine group by conversation_id) g
    ), '{}'::jsonb)
  );
$$;

comment on function public.unread_message_counts(uuid) is
  'Unread message totals for one user: the badge total and the per-conversation '
  'breakdown. Counting happens here so a busy inbox is not truncated at '
  'db-max-rows and unread rows do not cross the wire to be tallied and thrown away.';

-- Callers pass p_user_id from their own verified session and reach this with the
-- service-role key. Revoke FROM PUBLIC — revoking from anon/authenticated alone
-- does nothing, since the default grant is held through PUBLIC (migration 040).
revoke execute on function public.unread_message_counts(uuid) from public;
grant  execute on function public.unread_message_counts(uuid) to service_role;

-- ── Index ────────────────────────────────────────────────────
-- `idx_messages_unread` covers (conversation_id) where read_at is null, but the
-- query also excludes the reader's own messages. Adding sender_id lets the
-- filter be satisfied from the index instead of a heap lookup per row.
create index if not exists messages_unread_by_sender_idx
  on public.messages (conversation_id, sender_id)
  where read_at is null;
