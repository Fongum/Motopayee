import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { isAdminRole } from '@/lib/auth/roles';
import type { ZoneRule } from '@/lib/types';

export default async function RulesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data } = await supabaseAdmin
    .from('zone_rules')
    .select('*')
    .order('zone')
    .order('income_grade')
    .order('vehicle_price_band')
    .order('condition_grade');

  const rules = (data ?? []) as ZoneRule[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Règles de zone</h1>
          <p className="text-sm text-gray-500 mt-1">
            Matrice d&apos;éligibilité: zone × revenus × bande de prix × condition
          </p>
        </div>
        {isAdminRole(user.role) && (
          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full">
            Vous pouvez modifier ces règles
          </span>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Zone', 'Revenus', 'Bande prix', 'Condition', 'Finançable', 'Apport', 'Durée max', 'Revue manuelle'].map((h) => (
                  <th key={h} className="text-left px-3 py-3 font-medium text-gray-700 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{rule.zone}</td>
                  <td className="px-3 py-2">{rule.income_grade}</td>
                  <td className="px-3 py-2 capitalize">{rule.vehicle_price_band}</td>
                  <td className="px-3 py-2">{rule.condition_grade}</td>
                  <td className="px-3 py-2">
                    <span className={rule.financeable ? 'text-green-600 font-medium' : 'text-red-500'}>
                      {rule.financeable ? 'Oui' : 'Non'}
                    </span>
                  </td>
                  <td className="px-3 py-2">{rule.down_payment_percent}%</td>
                  <td className="px-3 py-2">{rule.max_tenor_months} mois</td>
                  <td className="px-3 py-2">{rule.manual_review_required ? 'Oui' : 'Non'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
