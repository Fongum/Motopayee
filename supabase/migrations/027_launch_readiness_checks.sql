-- Persistent go/no-go checklist for the 30-day launch command center.

create table if not exists public.launch_readiness_checks (
  key         text primary key,
  label       text not null,
  detail      text not null,
  status      text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'ready', 'blocked')),
  notes       text,
  updated_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger launch_readiness_checks_updated_at
  before update on public.launch_readiness_checks
  for each row execute function public.set_updated_at();

alter table public.launch_readiness_checks enable row level security;

create policy "service_role_all_launch_readiness_checks"
  on public.launch_readiness_checks for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

insert into public.launch_readiness_checks (key, label, detail)
values
  ('whatsapp_business', 'WhatsApp Business', 'Numero dedie, labels et quick replies actifs.'),
  ('inquiry_handling', 'Traitement demandes', 'Responsable, delai de reponse et suivi quotidien confirmes.'),
  ('rental_rules', 'Regles location', 'Paiement, commission, depot et conditions expliques avant booking.'),
  ('trust_labels', 'Labels confiance', 'Reviewed, seller verified, documents checked, inspected et finance eligible appliques honnetement.')
on conflict (key) do update
set
  label = excluded.label,
  detail = excluded.detail;
