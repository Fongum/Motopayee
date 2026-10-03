import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import {
  DEALER_PROGRAM_COLUMNS,
  DEALER_REQUIREMENTS,
  TRUSTED_DEALER_LABEL,
  TRUSTED_DEALER_TITLE,
  dealerProgramGaps,
  type DealerProgramRecord,
} from '@/lib/dealer-program';

type DealerRow = DealerProgramRecord & {
  id: string;
  city: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  program_notes: string | null;
  verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
};

const NOTICES: Record<string, { text: string; tone: 'ok' | 'warn' | 'error' }> = {
  saved: { text: 'Fiche enregistree.', tone: 'ok' },
  approved: { text: 'Label Concessionnaire de confiance accorde.', tone: 'ok' },
  revoked: { text: 'Label retire.', tone: 'warn' },
  revoked_incomplete: { text: 'Une condition a ete retiree : le label a ete retire automatiquement.', tone: 'warn' },
  incomplete: { text: 'Toutes les conditions doivent etre remplies avant d approuver.', tone: 'error' },
  save_first: { text: 'Enregistrez d abord la fiche du concessionnaire.', tone: 'error' },
  name_required: { text: 'Le nom du concessionnaire est obligatoire.', tone: 'error' },
  invalid: { text: 'Formulaire invalide : verifiez les numeros de telephone.', tone: 'error' },
  error: { text: 'Erreur lors de l enregistrement. Reessayez.', tone: 'error' },
};

const TONE_CLASS = {
  ok: 'border-green-200 bg-green-50 text-green-700',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
  error: 'border-red-200 bg-red-50 text-red-700',
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : null);

const INPUT = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a3a6b] focus:outline-none';

function Agreement({ name, label, at }: { name: string; label: string; at: string | null }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
      <input type="checkbox" name={name} defaultChecked={!!at} className="mt-0.5 h-4 w-4" />
      <span className="text-sm text-gray-800">
        {label}
        {at && <span className="ml-2 text-xs text-gray-400">depuis le {fmt(at)}</span>}
      </span>
    </label>
  );
}

export default async function AdminDealerDetailPage({
  params,
  searchParams,
}: {
  params: { profileId: string };
  searchParams: { notice?: string };
}) {
  await requireAdminPage('dealers');

  const [{ data: profile }, { data: dealerRows }, { count: listingCount }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, city, role, created_at')
      .eq('id', params.profileId)
      .maybeSingle(),
    supabaseAdmin
      .from('dealers')
      .select(DEALER_PROGRAM_COLUMNS)
      .eq('profile_id', params.profileId)
      .order('created_at', { ascending: true })
      .limit(1),
    supabaseAdmin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', params.profileId)
      .eq('status', 'published'),
  ]);

  if (!profile || profile.role !== 'seller_dealer') notFound();

  const dealer = ((dealerRows ?? [])[0] ?? null) as unknown as DealerRow | null;
  const gaps = dealer ? dealerProgramGaps(dealer) : DEALER_REQUIREMENTS.map((r) => r.key);
  const notice = searchParams.notice ? NOTICES[searchParams.notice] : undefined;

  const { data: verifier } = dealer?.verified_by
    ? await supabaseAdmin.from('profiles').select('full_name, email').eq('id', dealer.verified_by).maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/dealers" className="text-sm text-[#1a3a6b] hover:text-[#3d9e3d]">← Concessionnaires</Link>
        <h1 className="text-xl font-bold text-gray-900">{dealer?.dealer_name ?? profile.full_name ?? profile.email}</h1>
        {dealer?.verified ? (
          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">{TRUSTED_DEALER_LABEL}</span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">Non approuve</span>
        )}
      </div>

      {notice && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${TONE_CLASS[notice.tone]}`}>{notice.text}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <form action={`/api/admin/dealers/${profile.id}`} method="POST" className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6">
          <input type="hidden" name="intent" value="save" />

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900">Entreprise</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-gray-700">Nom du concessionnaire *
                <input name="dealer_name" required defaultValue={dealer?.dealer_name ?? profile.full_name ?? ''} className={INPUT} />
              </label>
              <label className="text-sm text-gray-700">Ville
                <input name="city" defaultValue={dealer?.city ?? profile.city ?? ''} className={INPUT} />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900">Proprietaire ou gerant</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-gray-700">Nom
                <input name="manager_name" defaultValue={dealer?.manager_name ?? ''} className={INPUT} />
              </label>
              <label className="text-sm text-gray-700">Telephone
                <input name="manager_phone" type="tel" defaultValue={dealer?.manager_phone ?? ''} className={INPUT} />
              </label>
            </div>
            <Agreement
              name="manager_contact_confirmed"
              label="Contact confirme (appel ou rencontre avec le proprietaire / gerant)"
              at={dealer?.manager_contact_confirmed_at ?? null}
            />
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900">Responsable inventaire</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-gray-700">Nom
                <input name="inventory_contact_name" defaultValue={dealer?.inventory_contact_name ?? ''} className={INPUT} />
              </label>
              <label className="text-sm text-gray-700">Telephone
                <input name="inventory_contact_phone" type="tel" defaultValue={dealer?.inventory_contact_phone ?? ''} className={INPUT} />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900">Engagements du concessionnaire</h2>
            <Agreement name="agreed_listing_accuracy" label="Exactitude des annonces (prix, details, photos)" at={dealer?.agreed_listing_accuracy_at ?? null} />
            <Agreement name="agreed_sold_updates" label="Mise a jour rapide des vehicules vendus ou indisponibles" at={dealer?.agreed_sold_updates_at ?? null} />
            <Agreement name="agreed_lead_handling" label="Traitement des prospects MotoPayee selon les regles du programme" at={dealer?.agreed_lead_handling_at ?? null} />
            <Agreement name="agreed_no_false_financeable" label="Aucune mention &laquo; financable &raquo; sans validation MotoPayee" at={dealer?.agreed_no_false_financeable_at ?? null} />
          </section>

          <label className="block text-sm text-gray-700">Notes internes
            <textarea name="program_notes" rows={3} defaultValue={dealer?.program_notes ?? ''} className={INPUT} />
          </label>

          <button type="submit" className="rounded-lg bg-[#1a3a6b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#132a4d]">
            Enregistrer la fiche
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900">Conditions du label</h2>
            <ul className="mt-3 space-y-2">
              {DEALER_REQUIREMENTS.map((r) => {
                const met = !gaps.includes(r.key);
                return (
                  <li key={r.key} className="flex items-start gap-2 text-sm">
                    <span className={met ? 'text-green-600' : 'text-gray-300'}>{met ? '✓' : '○'}</span>
                    <span className={met ? 'text-gray-800' : 'text-gray-500'}>{r.label}</span>
                  </li>
                );
              })}
            </ul>

            {dealer?.verified ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-gray-500">
                  Approuve le {fmt(dealer.verified_at)}
                  {verifier ? ` par ${verifier.full_name ?? verifier.email}` : ''}.
                </p>
                <form action={`/api/admin/dealers/${profile.id}`} method="POST">
                  <input type="hidden" name="intent" value="revoke" />
                  <button type="submit" className="w-full rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                    Retirer le label
                  </button>
                </form>
              </div>
            ) : (
              <form action={`/api/admin/dealers/${profile.id}`} method="POST" className="mt-4">
                <input type="hidden" name="intent" value="approve" />
                <button
                  type="submit"
                  disabled={!dealer || gaps.length > 0}
                  className="w-full rounded-lg bg-[#3d9e3d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d8a2d] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                >
                  Approuver ({DEALER_REQUIREMENTS.length - gaps.length}/{DEALER_REQUIREMENTS.length})
                </button>
              </form>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm">
            <h2 className="font-semibold text-gray-900">Compte</h2>
            <dl className="mt-3 space-y-1 text-gray-600">
              <div>{profile.full_name ?? '-'}</div>
              <div>{profile.email}</div>
              <div>{profile.phone ?? 'Telephone n/a'}</div>
              <div>{listingCount ?? 0} annonce{listingCount === 1 ? '' : 's'} publiee{listingCount === 1 ? '' : 's'}</div>
            </dl>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-xs text-gray-500">
            <p className="font-semibold text-gray-700">Ce que voient les acheteurs</p>
            <p className="mt-2">{TRUSTED_DEALER_TITLE}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
