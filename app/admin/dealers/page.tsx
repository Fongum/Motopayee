import Link from 'next/link';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import TruncationNotice from '@/app/(components)/TruncationNotice';
import { DEALER_REQUIREMENTS, dealerProgramGaps, type DealerProgramRecord } from '@/lib/dealer-program';

const LIMIT = 200;

type Row = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  created_at: string;
  dealers: Array<DealerProgramRecord & { id: string; verified: boolean; verified_at: string | null }> | null;
};

function statusOf(row: Row) {
  const dealer = row.dealers?.[0];
  if (!dealer) return { key: 'no_record', label: 'Sans fiche', className: 'bg-gray-100 text-gray-600' };
  if (dealer.verified) return { key: 'approved', label: 'Concessionnaire de confiance', className: 'bg-green-50 text-green-700' };
  const met = DEALER_REQUIREMENTS.length - dealerProgramGaps(dealer).length;
  return { key: 'in_progress', label: `En cours ${met}/${DEALER_REQUIREMENTS.length}`, className: 'bg-amber-50 text-amber-700' };
}

export default async function AdminDealersPage() {
  await requireAdminPage('dealers');

  // Every seller_dealer profile, not every dealers row: dealers who signed up
  // through /register have the role but no dealers row until staff create one.
  const { data, count, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id, full_name, email, phone, city, created_at,
      dealers:dealers!profile_id(
        id, dealer_name, manager_name, manager_phone, manager_contact_confirmed_at,
        inventory_contact_name, inventory_contact_phone, agreed_listing_accuracy_at,
        agreed_sold_updates_at, agreed_lead_handling_at, agreed_no_false_financeable_at,
        verified, verified_at
      )
    `, { count: 'exact' })
    .eq('role', 'seller_dealer')
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  const rows = (data ?? []) as unknown as Row[];
  const approved = rows.filter((row) => statusOf(row).key === 'approved').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programme concessionnaires</h1>
          <p className="mt-1 text-sm text-gray-500">
            Le label &laquo; Concessionnaire de confiance &raquo; exige les {DEALER_REQUIREMENTS.length} conditions de la politique de confiance.
          </p>
        </div>
        <p className="text-sm text-gray-500">{approved} approuve{approved !== 1 ? 's' : ''} sur {rows.length}</p>
      </div>

      {error && (
        // Most likely migration 045 is not applied yet: without its columns this
        // select fails, and an empty table would read as 'no dealers'.
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger les concessionnaires ({error.code}). Verifiez que la migration 045 est appliquee.
        </div>
      )}

      <TruncationNotice shown={rows.length} total={count} noun="concessionnaires" />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Concessionnaire</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Contact</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Programme</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Aucun concessionnaire</td></tr>
            ) : rows.map((row) => {
              const status = statusOf(row);
              const dealer = row.dealers?.[0];
              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{dealer?.dealer_name ?? row.full_name ?? row.email}</p>
                    <p className="mt-1 text-xs text-gray-500">{row.city ?? 'Ville n/a'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <p>{row.full_name ?? '-'}</p>
                    <p className="text-gray-400">{row.phone ?? row.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/dealers/${row.id}`} className="text-xs font-semibold text-[#1a3a6b] hover:text-[#3d9e3d]">
                      Ouvrir
                    </Link>
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
