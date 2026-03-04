import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Statistiques de l\'annonce — MotoPayee',
};

interface DayData { date: string; count: number }

interface AnalyticsData {
  total_views: number;
  views_7d: number;
  favourites_count: number;
  by_day: DayData[];
}

async function getAnalytics(listingId: string, sellerId: string): Promise<AnalyticsData | null> {
  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, seller_id, vehicle:vehicles(make, model, year)')
    .eq('id', listingId)
    .eq('seller_id', sellerId)
    .single();

  if (!listing) return null;

  const ago7d  = new Date(Date.now() - 7  * 86_400_000).toISOString().split('T')[0];
  const ago30d = new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0];

  const [totalRes, week7Res, byDayRes, favRes] = await Promise.all([
    supabaseAdmin.from('listing_views').select('id', { count: 'exact', head: true }).eq('listing_id', listingId),
    supabaseAdmin.from('listing_views').select('id', { count: 'exact', head: true }).eq('listing_id', listingId).gte('date_day', ago7d),
    supabaseAdmin.from('listing_views').select('date_day').eq('listing_id', listingId).gte('date_day', ago30d).order('date_day'),
    supabaseAdmin.from('favourites').select('id', { count: 'exact', head: true }).eq('listing_id', listingId),
  ]);

  const dayMap: Record<string, number> = {};
  ((byDayRes.data ?? []) as { date_day: string }[]).forEach((r) => {
    dayMap[r.date_day] = (dayMap[r.date_day] ?? 0) + 1;
  });

  const by_day: DayData[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86_400_000);
    const key = d.toISOString().split('T')[0];
    return { date: key, count: dayMap[key] ?? 0 };
  });

  return {
    total_views: totalRes.count ?? 0,
    views_7d: week7Res.count ?? 0,
    favourites_count: favRes.count ?? 0,
    by_day,
  };
}

/** Simple SVG bar chart — no dependencies */
function BarChart({ data }: { data: DayData[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 600;
  const H = 120;
  const barW = W / data.length - 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
      {data.map((d, i) => {
        const h = Math.max(2, (d.count / max) * (H - 20));
        const x = i * (W / data.length) + 1;
        const y = H - h;
        return (
          <g key={d.date}>
            <rect
              x={x} y={y} width={barW} height={h}
              rx={2}
              fill={d.count > 0 ? '#1a3a6b' : '#e5e7eb'}
            />
            {d.count > 0 && (
              <title>{`${d.date}: ${d.count} vue${d.count !== 1 ? 's' : ''}`}</title>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default async function ListingAnalyticsPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !['seller_individual', 'seller_dealer'].includes(user.role)) redirect('/login');

  const analytics = await getAnalytics(params.id, user.id);
  if (!analytics) notFound();

  const { total_views, views_7d, favourites_count, by_day } = analytics;

  // Label first day and last day of chart
  const firstDay = by_day[0]?.date ? new Date(by_day[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
  const lastDay = by_day[29]?.date ? new Date(by_day[29].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';

  const STATS = [
    {
      label: 'Vues totales',
      value: total_views,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      color: 'bg-blue-50 text-[#1a3a6b] border-blue-100',
    },
    {
      label: '7 derniers jours',
      value: views_7d,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'bg-green-50 text-[#3d9e3d] border-green-100',
    },
    {
      label: 'Favoris',
      value: favourites_count,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      color: 'bg-red-50 text-red-600 border-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/me/listings/${params.id}`} className="text-sm text-blue-600 hover:underline">
          ← Mon annonce
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATS.map(({ label, value, icon, color }) => (
          <div key={label} className={`flex items-center gap-4 p-5 bg-white rounded-2xl border ${color}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              {icon}
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900">{value.toLocaleString('fr-FR')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Vues — 30 derniers jours</h2>
        <p className="text-xs text-gray-400 mb-5">{"Chaque barre représente les vues d'une journée"}</p>
        <BarChart data={by_day} />
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{firstDay}</span>
          <span>{lastDay}</span>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <p className="text-sm font-semibold text-amber-800 mb-2">Conseils pour plus de visibilité</p>
        <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
          <li>Ajoutez des photos de qualité — les annonces avec photos reçoivent 5× plus de vues</li>
          <li>Répondez rapidement aux acheteurs intéressés</li>
          <li>Assurez-vous que le prix est dans la bande verte (MVE estimé)</li>
        </ul>
      </div>
    </div>
  );
}
