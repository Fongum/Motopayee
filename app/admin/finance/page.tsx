import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import Link from 'next/link';
import { calculateFinanceCommission } from '@/lib/finance-commissions';
import {
  commissionAmount,
  commissionCount,
  financeListSelect,
  firstEmbedded,
  isCommissionStatus,
  isPipelineStatus,
  pipelineCount,
  pipelineValue,
} from '@/lib/finance-dashboard';
import { fetchCommissionTotals, fetchPipelineTotals } from '@/lib/finance-dashboard.server';

/** Rows the reconciliation table renders. Capped, with the total shown alongside. */
const FINANCE_LIST_LIMIT = 200;

type CommissionRow = {
  id: string;
  application_id: string;
  commission_rate_percent: number;
  commission_amount_xaf: number | string;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  notes: string | null;
};

function formatXAF(amount: number) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_LABELS: Record<string, string> = {
  approved: 'A decaisser',
  disbursed: 'Finance',
};

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-amber-50 text-amber-700',
  disbursed: 'bg-emerald-50 text-emerald-700',
};

const COMMISSION_LABELS: Record<string, string> = {
  expected: 'A facturer',
  invoiced: 'Facturee',
  paid: 'Encaissee',
  waived: 'Annulee',
};

const COMMISSION_COLORS: Record<string, string> = {
  expected: 'bg-amber-50 text-amber-700',
  invoiced: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  waived: 'bg-gray-100 text-gray-600',
};

export default async function AdminFinancePage({
  searchParams,
}: {
  searchParams: { status?: string; commission?: string };
}) {
  await requireAdminPage('finance');

  const commissionFilter = isCommissionStatus(searchParams.commission) ? searchParams.commission : null;

  // The commission rides an inner join when it is being filtered on, so there
  // is no pre-query resolving application ids into a `.in()` list — that list
  // was unbounded, and PostgREST caps it at 1000, so the filter silently lost
  // every match past the thousandth.
  let query = supabaseAdmin
    .from('financing_applications')
    .select(financeListSelect(commissionFilter !== null), { count: 'exact' })
    .in('status', ['approved', 'disbursed'])
    .order('disbursed_at', { ascending: false, nullsFirst: false })
    .order('decided_at', { ascending: false })
    .limit(FINANCE_LIST_LIMIT);

  if (isPipelineStatus(searchParams.status)) {
    query = query.eq('status', searchParams.status);
  }

  if (commissionFilter) {
    query = query.eq('commission.status', commissionFilter);
  }

  const { data, count: matchingApplicationCount } = await query;
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    status: string;
    down_payment_percent: number | null;
    max_tenor: number | null;
    decided_at: string | null;
    disbursed_at: string | null;
    listing?: {
      asking_price: number;
      zone: string;
      vehicle?: { make: string; model: string; year: number } | null;
    } | null;
    buyer?: { full_name?: string | null; email?: string | null; phone?: string | null; city?: string | null } | null;
    mfi?: { name?: string | null; code?: string | null } | null;
    commission?: CommissionRow | CommissionRow[] | null;
  }>;

  // The commission now arrives embedded in the row above, so the second query
  // keyed by application id is gone.
  const commissionsByApplication = new Map(
    rows
      .map((row) => firstEmbedded(row.commission))
      .filter((commission): commission is CommissionRow => commission !== null)
      .map((commission) => [commission.application_id, commission])
  );

  // Totalled in Postgres (migration 037). These five figures used to be reduced
  // in JS: the commission ones over the whole table fetched unbounded, the
  // pipeline ones over whichever page of applications the table happened to
  // render. Both truncated at 1000 rows and quietly under-reported.
  const [commissionTotals, pipelineTotals] = await Promise.all([
    fetchCommissionTotals(),
    fetchPipelineTotals(),
  ]);

  const expectedCommissionAmount = commissionAmount(commissionTotals, 'expected');
  const invoicedCommissionAmount = commissionAmount(commissionTotals, 'invoiced');
  const paidCommissionAmount = commissionAmount(commissionTotals, 'paid');
  const listTruncated = (matchingApplicationCount ?? 0) > rows.length;

  const stats = [
    { label: 'A decaisser', value: pipelineCount(pipelineTotals, 'approved'), amount: pipelineValue(pipelineTotals, 'approved'), href: '/admin/finance?status=approved', color: 'text-amber-600' },
    { label: 'Financees', value: pipelineCount(pipelineTotals, 'disbursed'), amount: pipelineValue(pipelineTotals, 'disbursed'), href: '/admin/finance?status=disbursed', color: 'text-emerald-700' },
    { label: 'A facturer', value: commissionCount(commissionTotals, 'expected'), amount: expectedCommissionAmount, href: '/admin/finance?commission=expected', color: 'text-amber-600' },
    { label: 'Facturee', value: commissionCount(commissionTotals, 'invoiced'), amount: invoicedCommissionAmount, href: '/admin/finance?commission=invoiced', color: 'text-blue-700' },
    { label: 'Encaissee', value: commissionCount(commissionTotals, 'paid'), amount: paidCommissionAmount, href: '/admin/finance?commission=paid', color: 'text-green-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reconciliation financement</h1>
          <p className="mt-1 text-sm text-gray-500">Suivi des dossiers approuves, decaisses, et des partenaires IMF.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/finance/matches" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100">
            Matching finance
          </Link>
          <Link href="/admin/applications?status=mfi_unassigned" className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100">
            A router IMF
          </Link>
          <Link href="/admin/applications?status=offers_waiting_buyer" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100">
            Offres a presenter
          </Link>
          <Link href="/admin/finance/partners" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">
            Partenaires finance
          </Link>
          <Link href="/admin/finance/eligible" className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100">
            Vehicules finance eligible
          </Link>
          <Link href="/admin/applications" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Toutes les demandes
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[#3d9e3d] hover:shadow-sm"
          >
            {stat.value == null ? (
              <p className={`text-2xl font-bold ${stat.color}`}>{formatXAF(stat.amount)}</p>
            ) : (
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
            {stat.value != null && (
              <p className="mt-2 text-sm font-semibold text-gray-900">{formatXAF(stat.amount)}</p>
            )}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: '', label: 'Tous' },
          { value: 'approved', label: 'A decaisser' },
          { value: 'disbursed', label: 'Financees' },
        ].map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `/admin/finance?status=${filter.value}` : '/admin/finance'}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              (searchParams.status ?? '') === filter.value
                ? 'border-[#1a3a6b] bg-[#1a3a6b] text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: '', label: 'Toutes commissions' },
          { value: 'expected', label: 'A facturer' },
          { value: 'invoiced', label: 'Facturees' },
          { value: 'paid', label: 'Encaissees' },
          { value: 'waived', label: 'Annulees' },
        ].map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `/admin/finance?commission=${filter.value}` : '/admin/finance'}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              (searchParams.commission ?? '') === filter.value
                ? 'border-[#1a3a6b] bg-[#1a3a6b] text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {/* Reconciliation work needs to know the table is a slice, not the set.
          The stat tiles above are always the full totals. */}
      {listTruncated && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Affichage des {rows.length} dossiers les plus recents sur {matchingApplicationCount} correspondants.
          Les totaux ci-dessus portent sur l ensemble.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Acheteur</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Vehicule</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">IMF</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Montant</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Commission</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Statut</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Dates</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">Aucun dossier a afficher</td>
              </tr>
            ) : rows.map((row) => {
              const vehicle = row.listing?.vehicle;
              const commission = commissionsByApplication.get(row.id);
              const estimatedCommission = calculateFinanceCommission(Number(row.listing?.asking_price ?? 0));
              const commissionAmount = Number(commission?.commission_amount_xaf ?? estimatedCommission);
              const commissionStatus = commission?.status ?? (row.status === 'disbursed' ? 'expected' : 'estimated');
              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.buyer?.full_name ?? row.buyer?.email ?? '-'}</p>
                    <p className="text-xs text-gray-400">{row.buyer?.phone ?? row.buyer?.city ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">
                      {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicule'}
                    </p>
                    <p className="text-xs text-gray-400">Zone {row.listing?.zone ?? '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.mfi?.name ?? row.mfi?.code ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{formatXAF(Number(row.listing?.asking_price ?? 0))}</p>
                    <p className="text-xs text-gray-400">
                      {row.down_payment_percent != null ? `${row.down_payment_percent}% apport` : 'Apport n/a'}
                      {row.max_tenor != null ? ` - ${row.max_tenor} mois` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{formatXAF(commissionAmount)}</p>
                    <p className="text-xs text-gray-400">
                      {commission?.commission_rate_percent ?? 2}% MotoPayee
                    </p>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      COMMISSION_COLORS[commissionStatus] ?? 'bg-gray-50 text-gray-500'
                    }`}>
                      {COMMISSION_LABELS[commissionStatus] ?? 'Estimee'}
                    </span>
                    {commission?.due_at && commission.status !== 'paid' && (
                      <p className="mt-1 text-xs text-amber-700">
                        Due {new Date(commission.due_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                    {commission && (
                      <form action={`/api/admin/finance-commissions/${commission.id}/status`} method="POST" className="mt-2 flex gap-2">
                        <select name="status" defaultValue={commission.status} className="w-28 rounded-md border border-gray-300 px-2 py-1 text-xs">
                          <option value="expected">A facturer</option>
                          <option value="invoiced">Facturee</option>
                          <option value="paid">Encaissee</option>
                          <option value="waived">Annulee</option>
                        </select>
                        <button type="submit" className="rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-700">
                          OK
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <p>Decision: {row.decided_at ? new Date(row.decided_at).toLocaleDateString('fr-FR') : '-'}</p>
                    <p>Decaisse: {row.disbursed_at ? new Date(row.disbursed_at).toLocaleDateString('fr-FR') : '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/applications/${row.id}`} className="text-xs font-medium text-[#1a3a6b] hover:text-[#3d9e3d]">
                      Voir -&gt;
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
