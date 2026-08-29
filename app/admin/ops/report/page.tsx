import { requireAdminPage } from '@/lib/auth/admin-access';
import { getDailyOpsSnapshot, OPS_AREA_LABELS, OPS_PRIORITY_LABELS } from '@/lib/ops-snapshot';
import Link from 'next/link';
import PrintButton from './PrintButton';

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(value);
}

function formatLeadDate(value: string | null) {
  return value ? new Date(value).toLocaleString('fr-FR') : 'Sans date';
}

export default async function AdminOpsReportPage() {
  const user = await requireAdminPage('ops');

  const { generatedAt, activeQueues, quietQueues, leadReminders, totalOpenActions, criticalActions, revenueActions } = await getDailyOpsSnapshot({ leadLimit: 12 });

  return (
    <div className="space-y-6 print:bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4 print:block">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">MotoPayee</p>
          <h1 className="text-2xl font-bold text-gray-900">Daily ops report</h1>
          <p className="mt-1 text-sm text-gray-500">Genere le {formatDateTime(generatedAt)} par {user.name ?? user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link href="/admin/ops" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Retour ops
          </Link>
          <PrintButton />
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3 print:grid-cols-3">
        {[
          { label: 'Actions ouvertes', value: totalOpenActions },
          { label: 'Critiques', value: criticalActions },
          { label: 'Revenu a suivre', value: revenueActions },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-300 bg-white p-4 print:break-inside-avoid">
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-gray-300 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Files actives</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Priorite</th>
                <th className="px-3 py-2">Zone</th>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeQueues.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-400">Aucune file active.</td>
                </tr>
              ) : activeQueues.map((item) => (
                <tr key={item.title}>
                  <td className="px-3 py-2 font-medium text-gray-900">{OPS_PRIORITY_LABELS[item.priority]}</td>
                  <td className="px-3 py-2 text-gray-600">{OPS_AREA_LABELS[item.area]}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.detail}</p>
                  </td>
                  <td className="px-3 py-2 text-right text-lg font-bold text-gray-900">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-300 bg-white p-5 print:break-inside-avoid">
        <h2 className="font-semibold text-gray-900">Relances leads dues</h2>
        {leadReminders.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">Aucune relance lead due.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Lead</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Assigne</th>
                  <th className="px-3 py-2">Relance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leadReminders.map((lead) => (
                  <tr key={lead.id}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">{lead.business_name || lead.name}</p>
                      <p className="text-xs text-gray-500">{lead.city ?? '-'}</p>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{lead.lead_type}</td>
                    <td className="px-3 py-2 text-gray-600">{lead.assigned?.full_name ?? lead.assigned?.email ?? 'Non assigne'}</td>
                    <td className="px-3 py-2 text-gray-600">{formatLeadDate(lead.next_follow_up_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-300 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Files a zero</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 print:grid-cols-2">
          {quietQueues.map((item) => (
            <div key={item.title} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-xs">
              <span className="text-gray-600">{item.title}</span>
              <span className="font-semibold text-green-700">0</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
