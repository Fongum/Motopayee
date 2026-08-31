import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import Link from 'next/link';
import {
  disbursedValue,
  institutionStats,
  partnerContactEmail,
  totalDisbursedValue,
} from '@/lib/mfi-partner-stats';
import { fetchPartnerStats } from '@/lib/mfi-partner-stats.server';

/** Partners the roster renders. The stat tiles always cover every institution. */
const PARTNER_LIST_LIMIT = 200;

function formatXAF(amount: number) {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

function statusText(active: boolean) {
  return active ? 'Actif' : 'Inactif';
}

function mfiRegisterHref(email: string | null | undefined) {
  const params = new URLSearchParams({ role: 'mfi_partner' });
  if (email) params.set('email', email);
  return `/register?${params.toString()}`;
}

export default async function AdminFinancePartnersPage() {
  await requireAdminPage('finance');

  // One rollup call (migration 039) replaces three unbounded table fetches that
  // were re-filtered once per institution inside the render below.
  const [{ data: institutions }, partnerStats] = await Promise.all([
    supabaseAdmin
      .from('mfi_institutions')
      .select('id, name, code, contact_email, contact_phone, city, active, created_at')
      .order('active', { ascending: false })
      .order('name')
      .limit(PARTNER_LIST_LIMIT),
    fetchPartnerStats(),
  ]);

  const rows = (institutions ?? []) as Array<{
    id: string;
    name: string;
    code: string;
    contact_email: string | null;
    contact_phone: string | null;
    city: string | null;
    active: boolean;
    created_at: string;
  }>;

  const totals = partnerStats.totals;

  const stats = [
    { label: 'Partenaires actifs', value: totals.active_partners.toLocaleString('fr-FR'), href: '/admin/finance/partners' },
    { label: 'Utilisateurs MFI lies', value: totals.linked_users.toLocaleString('fr-FR'), href: '/admin/users' },
    { label: 'Dossiers assignes', value: totals.assigned_applications.toLocaleString('fr-FR'), href: '/admin/applications' },
    { label: 'Valeur decaissee', value: formatXAF(totalDisbursedValue(partnerStats)), href: '/admin/finance?status=disbursed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partenaires finance</h1>
          <p className="mt-1 text-sm text-gray-500">Roster IMF, credit unions et partenaires finance pour le pilote MotoPayee.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/finance/eligible" className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100">
            Vehicules eligibles
          </Link>
          <Link href="/admin/applications" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Dossiers
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[#3d9e3d] hover:shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-bold text-gray-900">Ajouter un partenaire</h2>
        <form action="/api/admin/mfi-institutions" method="POST" className="mt-4 grid gap-3 lg:grid-cols-5">
          <input name="name" required placeholder="Institution" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input name="code" placeholder="Code optionnel" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input name="contact_email" type="email" placeholder="Email contact" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input name="contact_phone" placeholder="Telephone" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto]">
            <input name="city" placeholder="Ville" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132a4d]">
              Ajouter
            </button>
          </div>
        </form>
      </section>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Institution</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Contact</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Dossiers</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Offres</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Utilisateurs</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">Aucun partenaire finance</td>
              </tr>
            ) : rows.map((institution) => {
              const stat = institutionStats(partnerStats, institution.id);
              const activeApplications = stat.active_applications;
              const interestedOffers = stat.interested_offers;
              const primaryUserEmail = partnerContactEmail(stat, institution.contact_email);
              const disbursed = disbursedValue(stat);
              return (
                <tr key={institution.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{institution.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{institution.code} - {institution.city ?? 'Ville n/a'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{institution.contact_email ?? '-'}</p>
                    <p className="mt-1 text-xs text-gray-400">{institution.contact_phone ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{stat.applications}</p>
                    <p className="mt-1 text-xs text-gray-500">{activeApplications} actifs - {formatXAF(disbursed)} decaisse</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{stat.offers}</p>
                    <p className="mt-1 text-xs text-gray-500">{interestedOffers} interesse acheteur</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{stat.users}</p>
                    <p className="mt-1 text-xs text-gray-500">{stat.primary_user_name ?? 'Aucun compte lie'}</p>
                    {primaryUserEmail ? (
                      <Link
                        href={mfiRegisterHref(primaryUserEmail)}
                        className="mt-2 inline-flex text-xs font-semibold text-[#1a3a6b] hover:text-[#3d9e3d]"
                      >
                        Lien inscription portail
                      </Link>
                    ) : null}
                    <form action="/api/admin/users" method="POST" className="mt-3 grid gap-2">
                      <input type="hidden" name="role" value="mfi_partner" />
                      <input type="hidden" name="mfi_institution_id" value={institution.id} />
                      <input
                        name="email"
                        type="email"
                        required
                        defaultValue={institution.contact_email ?? ''}
                        placeholder="Email portail"
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                      />
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <input
                          name="full_name"
                          placeholder="Nom contact"
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs"
                        />
                        <button type="submit" className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-100">
                          Creer acces
                        </button>
                      </div>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      institution.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {statusText(institution.active)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={`/api/admin/mfi-institutions/${institution.id}`} method="POST">
                      <input type="hidden" name="active" value={institution.active ? 'false' : 'true'} />
                      <button type="submit" className="text-xs font-semibold text-[#1a3a6b] hover:text-[#3d9e3d]">
                        {institution.active ? 'Desactiver' : 'Activer'}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
