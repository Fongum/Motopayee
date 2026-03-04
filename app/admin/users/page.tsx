import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { isAdminRole } from '@/lib/auth/roles';
import type { Profile } from '@/lib/types';
import VerifyToggle from '@/app/(components)/VerifyToggle';

const ROLE_COLORS: Record<string, string> = {
  buyer: 'bg-gray-100 text-gray-700',
  seller_individual: 'bg-blue-100 text-blue-700',
  seller_dealer: 'bg-blue-100 text-blue-700',
  field_agent: 'bg-yellow-100 text-yellow-700',
  inspector: 'bg-purple-100 text-purple-700',
  verifier: 'bg-orange-100 text-orange-700',
  admin: 'bg-red-100 text-red-700',
};

const ROLE_LABELS: Record<string, string> = {
  buyer: 'Acheteur',
  seller_individual: 'Vendeur particulier',
  seller_dealer: 'Concessionnaire',
  field_agent: 'Agent terrain',
  inspector: 'Inspecteur',
  verifier: 'Vérificateur',
  admin: 'Admin',
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { role?: string; page?: string };
}) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) redirect('/admin/dashboard');

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const PAGE_SIZE = 30;

  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (searchParams.role) {
    query = query.eq('role', searchParams.role);
  }

  const { data, count } = await query;
  const profiles = (data ?? []) as Profile[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
        <span className="text-sm text-gray-500">{count ?? 0} total</span>
      </div>

      {/* Role filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['', 'buyer', 'seller_individual', 'seller_dealer', 'field_agent', 'inspector', 'verifier', 'admin'].map((r) => (
          <a
            key={r}
            href={r ? `/admin/users?role=${r}` : '/admin/users'}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              searchParams.role === r || (!searchParams.role && !r)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {r === '' ? 'Tous' : ROLE_LABELS[r] ?? r}
          </a>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Nom</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Rôle</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Zone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Vérifié</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Inscrit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {profiles.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucun utilisateur</td></tr>
            ) : profiles.map((profile) => (
              <tr key={profile.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{profile.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{profile.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[profile.role] ?? 'bg-gray-100 text-gray-700'}`}>
                    {ROLE_LABELS[profile.role] ?? profile.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${profile.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                    {profile.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{profile.zone ?? '—'}</td>
                <td className="px-4 py-3">
                  {['seller_individual', 'seller_dealer'].includes(profile.role) ? (
                    <VerifyToggle
                      userId={profile.id}
                      initialVerified={(profile as Profile & { is_verified: boolean }).is_verified ?? false}
                    />
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(profile.created_at).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
