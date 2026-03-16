import { redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { isAdminRole } from '@/lib/auth/roles';
import type { Metadata } from 'next';
import AdminReviewActions from './AdminReviewActions';

export const metadata: Metadata = { title: 'Modération des avis — MotoPayee' };

const STATUS_FR: Record<string, { label: string; cls: string }> = {
  published: { label: 'Publié', cls: 'bg-green-100 text-green-700' },
  hidden: { label: 'Masqué', cls: 'bg-gray-100 text-gray-600' },
  flagged: { label: 'Signalé', cls: 'bg-red-100 text-red-600' },
};

export default async function AdminReviewsPage() {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) redirect('/login');

  const { data } = await supabaseAdmin
    .from('reviews')
    .select('*, reviewer:profiles!reviewer_id(full_name, email), reviewed:profiles!reviewed_id(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(100);

  const reviews = data ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Modération des avis</h1>

      {reviews.length === 0 ? (
        <p className="text-gray-400">Aucun avis.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r: Record<string, unknown>) => {
            const st = STATUS_FR[(r.status as string)] ?? STATUS_FR.published;
            const reviewer = r.reviewer as unknown as { full_name: string | null; email: string } | null;
            const reviewed = r.reviewed as unknown as { full_name: string | null; email: string } | null;
            const rId = String(r.id);
            return (
              <div key={rId} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold">{reviewer?.full_name ?? reviewer?.email ?? ''}</span>
                      {' → '}
                      <span className="font-semibold">{reviewed?.full_name ?? reviewed?.email ?? ''}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {String(r.entity_type)} · {new Date(String(r.created_at)).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-amber-500">{String(r.rating)}/5</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </div>
                </div>
                {r.title ? <p className="text-sm font-semibold text-gray-800 mb-1">{String(r.title)}</p> : null}
                {r.comment ? <p className="text-sm text-gray-600 mb-2">{String(r.comment)}</p> : null}
                <AdminReviewActions reviewId={r.id as string} currentStatus={r.status as string} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
