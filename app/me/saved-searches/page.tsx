import { redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import type { Metadata } from 'next';
import SavedSearchActions from './SavedSearchActions';

export const metadata: Metadata = { title: 'Recherches sauvées — MotoPayee' };

const NOTIFY_FR: Record<string, string> = {
  none: 'Aucune',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

export default async function SavedSearchesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data } = await supabaseAdmin
    .from('saved_searches')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const searches = data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Recherches sauvées</h1>
        <a href="/listings" className="text-sm text-[#1a3a6b] hover:underline">Parcourir les annonces</a>
      </div>

      {searches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 mb-2">Aucune recherche sauvée</p>
          <p className="text-sm text-gray-400">
            Utilisez le bouton &quot;Sauvegarder cette recherche&quot; sur la page des annonces ou des locations.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {searches.map((s) => {
            const filters = s.filters as Record<string, string>;
            const filterSummary = Object.entries(filters)
              .filter(([k]) => k !== 'sort' && k !== 'page')
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ');
            const searchUrl = `/${s.search_type === 'hire' ? 'hire' : 'listings'}?${new URLSearchParams(filters).toString()}`;

            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <a href={searchUrl} className="font-bold text-sm text-[#1a3a6b] hover:text-[#3d9e3d]">
                      {s.label}
                    </a>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {s.search_type === 'hire' ? 'Location' : 'Achat'} · {filterSummary || 'Tous les filtres'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {s.last_match_count} résultat{s.last_match_count !== 1 ? 's' : ''}
                    </p>
                    <p className="text-[10px] text-gray-300">
                      Notif: {NOTIFY_FR[s.notify_via] ?? s.notify_via}
                    </p>
                  </div>
                </div>
                <SavedSearchActions searchId={s.id} active={s.active} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
