import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Fetch stats in parallel
  const [
    { count: pendingListings },
    { count: pendingApps },
    { count: publishedListings },
    { count: totalApps },
  ] = await Promise.all([
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true })
      .in('status', ['ownership_submitted', 'ownership_verified', 'media_done', 'inspected', 'pricing_review']),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true })
      .in('status', ['submitted', 'docs_pending', 'docs_received', 'under_review']),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }),
  ]);

  const stats = [
    { label: 'Annonces en attente', value: pendingListings ?? 0, href: '/admin/listings?status=pending', color: 'text-yellow-600' },
    { label: 'Demandes en cours', value: pendingApps ?? 0, href: '/admin/applications?status=active', color: 'text-blue-600' },
    { label: 'Annonces publiées', value: publishedListings ?? 0, href: '/admin/listings?status=published', color: 'text-green-600' },
    { label: 'Total demandes', value: totalApps ?? 0, href: '/admin/applications', color: 'text-gray-700' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Vue d&apos;ensemble</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-sm transition"
          >
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="space-y-3">
            <Link href="/admin/listings?status=ownership_submitted" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-blue-600">
              <span>Vérifier les propriétés soumises</span>
              <span className="text-gray-400">→</span>
            </Link>
            <Link href="/admin/applications?status=docs_received" className="flex items-center justify-between text-sm py-2 border-b border-gray-100 hover:text-blue-600">
              <span>Examiner les dossiers reçus</span>
              <span className="text-gray-400">→</span>
            </Link>
            <Link href="/admin/listings?status=inspected" className="flex items-center justify-between text-sm py-2 hover:text-blue-600">
              <span>Publier les annonces inspectées</span>
              <span className="text-gray-400">→</span>
            </Link>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Votre rôle</h2>
          <div className="text-sm text-gray-600 space-y-2">
            {user.role === 'admin' && (
              <>
                <p>✓ Gérer toutes les annonces et demandes</p>
                <p>✓ Publier des annonces</p>
                <p>✓ Modifier les règles de zone</p>
                <p>✓ Gérer les utilisateurs</p>
              </>
            )}
            {user.role === 'verifier' && (
              <>
                <p>✓ Examiner les dossiers de financement</p>
                <p>✓ Vérifier les documents d&apos;identité</p>
                <p>✓ Mettre à jour les statuts des demandes</p>
              </>
            )}
            {user.role === 'inspector' && (
              <>
                <p>✓ Soumettre les rapports d&apos;inspection</p>
                <p>✓ Attribuer les grades de condition</p>
                <p>✓ Confirmer l&apos;éligibilité au financement</p>
              </>
            )}
            {user.role === 'field_agent' && (
              <>
                <p>✓ Photographier les véhicules</p>
                <p>✓ Téléverser les médias des annonces</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
