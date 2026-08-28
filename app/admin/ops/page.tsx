import { getCurrentUser } from '@/lib/auth/server';
import { getDailyOpsSnapshot, OPS_AREA_LABELS, OPS_PRIORITY_LABELS, type OpsArea, type OpsPriority } from '@/lib/ops-snapshot';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const PRIORITY_STYLES: Record<OpsPriority, string> = {
  critical: 'border-red-200 bg-red-50 text-red-800',
  high: 'border-orange-200 bg-orange-50 text-orange-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  normal: 'border-gray-200 bg-gray-50 text-gray-700',
};

const AREA_STYLES: Record<OpsArea, string> = {
  leads: 'bg-blue-50 text-blue-700',
  inspections: 'bg-teal-50 text-teal-700',
  finance: 'bg-purple-50 text-purple-700',
  rentals: 'bg-amber-50 text-amber-800',
  revenue: 'bg-green-50 text-green-700',
  supply: 'bg-gray-100 text-gray-700',
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : 'Sans date';
}

export default async function AdminOpsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { activeQueues, quietQueues, leadReminders, totalOpenActions, criticalActions, revenueActions } = await getDailyOpsSnapshot();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily ops command board</h1>
          <p className="mt-1 text-sm text-gray-500">File unique pour prioriser leads, supply, inspections, finance, location et revenu.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/ops/report" className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100">
            Rapport print
          </Link>
          <Link href="/admin/leads/action-board" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">
            Action leads
          </Link>
          <Link href="/admin/launch" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Command center
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Actions ouvertes', value: totalOpenActions, color: 'text-gray-900' },
          { label: 'Critiques', value: criticalActions, color: 'text-red-700' },
          { label: 'Revenu a suivre', value: revenueActions, color: 'text-green-700' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-red-100 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">A traiter maintenant</h2>
            <p className="mt-1 text-sm text-gray-500">Queues non vides, triees par criticite puis volume.</p>
          </div>
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
            {activeQueues.length} files actives
          </span>
        </div>
        {activeQueues.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">Aucune file urgente pour le moment.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeQueues.map((item) => (
              <Link key={item.title} href={item.href} className="rounded-xl border border-gray-200 p-4 hover:border-[#1a3a6b]/40 hover:bg-blue-50/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${AREA_STYLES[item.area] ?? AREA_STYLES.supply}`}>
                        {OPS_AREA_LABELS[item.area]}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_STYLES[item.priority]}`}>
                        {OPS_PRIORITY_LABELS[item.priority]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.detail}</p>
                  </div>
                  <p className="text-3xl font-bold text-[#1a3a6b]">{item.count}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Relances leads dues</h2>
              <p className="mt-1 text-sm text-gray-500">Les prochains contacts a rappeler aujourd hui.</p>
            </div>
            <Link href="/admin/leads/action-board" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              Ouvrir
            </Link>
          </div>
          {leadReminders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">Aucune relance lead due.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {leadReminders.map((lead) => (
                <Link key={lead.id} href={`/admin/leads/${lead.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm hover:bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900">{lead.business_name || lead.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {lead.lead_type}{lead.city ? ` - ${lead.city}` : ''} - {lead.assigned?.full_name ?? lead.assigned?.email ?? 'Non assigne'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.priority === 'high' && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Haute</span>
                    )}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{formatDate(lead.next_follow_up_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900">Files au calme</h2>
            <p className="mt-1 text-sm text-gray-500">Queues actuellement a zero, utile pour verifier la couverture ops.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {quietQueues.map((item) => (
              <Link key={item.title} href={item.href} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-xs hover:bg-gray-50">
                <span className="text-gray-600">{item.title}</span>
                <span className="font-semibold text-green-700">0</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
