import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import { DEFAULT_BASE_PRICE_XAF, normaliseVehicleName } from '@/lib/pricing';

const formatXAF = (n: number) =>
  new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(n);

const NOTICES: Record<string, { text: string; tone: 'ok' | 'error' }> = {
  saved: { text: 'Prix enregistre.', tone: 'ok' },
  deleted: { text: 'Prix supprime.', tone: 'ok' },
  duplicate: { text: 'Ce vehicule a deja un prix de reference. Modifiez la ligne existante.', tone: 'error' },
  invalid: { text: 'Formulaire invalide : la marque et un prix positif sont obligatoires.', tone: 'error' },
  not_found: { text: 'Ligne introuvable (deja supprimee ?).', tone: 'error' },
  error: { text: 'Erreur lors de l enregistrement. Reessayez.', tone: 'error' },
};

const INPUT = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1a3a6b] focus:outline-none';

type PriceRow = { id: string; make: string; model: string | null; base_price_xaf: number; notes: string | null; updated_at: string };

export default async function AdminPricingPage({
  searchParams,
}: {
  searchParams: { notice?: string; updated?: string; edit?: string };
}) {
  await requireAdminPage('pricing');

  const [{ data: priceData }, { data: estimated }] = await Promise.all([
    supabaseAdmin
      .from('vehicle_base_prices')
      .select('id, make, model, base_price_xaf, notes, updated_at')
      .order('make')
      .order('model', { nullsFirst: true }),
    // Every listing carrying an estimate, to show which ones still rest on
    // the default and which makes would fix the most of them.
    fetchAllRows((from, to) =>
      supabaseAdmin
        .from('listings')
        .select('id, mve_basis, vehicle:vehicles!inner(make)')
        .not('suggested_price', 'is', null)
        .order('id')
        .range(from, to)
    ),
  ]);

  const prices = (priceData ?? []) as PriceRow[];
  const editing = searchParams.edit ? prices.find((p) => p.id === searchParams.edit) : undefined;
  const notice = searchParams.notice ? NOTICES[searchParams.notice] : undefined;

  // Listings estimated before migration 046 have mve_basis null; they were all
  // priced off the default, so they count as default here.
  const onDefault = estimated.filter((l) => l.mve_basis === 'default' || l.mve_basis == null);
  const missingByMake = new Map<string, { label: string; count: number }>();
  for (const listing of onDefault) {
    const vehicle = Array.isArray(listing.vehicle) ? listing.vehicle[0] : listing.vehicle;
    if (!vehicle?.make) continue;
    const key = normaliseVehicleName(vehicle.make);
    const entry = missingByMake.get(key) ?? { label: vehicle.make.trim(), count: 0 };
    entry.count += 1;
    missingByMake.set(key, entry);
  }
  const missing = Array.from(missingByMake.values()).sort((a, b) => b.count - a.count).slice(0, 12);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Prix de reference vehicules</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Base de l estimation de marche (MVE) calculee a l inspection : prix d un vehicule recent du modele, en XAF,
          avant depreciation (age, kilometrage, etat, zone). Recherche : marque + modele, puis prix general de la marque,
          puis le prix par defaut de {formatXAF(DEFAULT_BASE_PRICE_XAF)}, qui ne correspond a aucun vehicule.
          Chaque modification recalcule les annonces deja estimees de la marque.
        </p>
      </div>

      {notice && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${notice.tone === 'ok' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {notice.text}
          {notice.tone === 'ok' && searchParams.updated ? ` ${searchParams.updated} annonce(s) re-estimee(s).` : ''}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-gray-900">{prices.length}</p>
          <p className="mt-1 text-sm text-gray-500">Prix de reference</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-gray-900">{estimated.length - onDefault.length}</p>
          <p className="mt-1 text-sm text-gray-500">Annonces estimees sur un vrai prix</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-3xl font-bold text-amber-800">{onDefault.length}</p>
          <p className="mt-1 text-sm text-amber-800">Annonces estimees sur le prix par defaut</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Marque</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Modele</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Prix de base</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prices.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Aucun prix : toutes les estimations utilisent le prix par defaut.</td></tr>
              ) : prices.map((p) => (
                <tr key={p.id} className={p.id === editing?.id ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.make}</td>
                  <td className="px-4 py-3 text-gray-700">{p.model ?? <span className="text-gray-400">Tous modeles</span>}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{formatXAF(Number(p.base_price_xaf))}</p>
                    {p.notes && <p className="mt-0.5 text-xs text-gray-400">{p.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <a href={`/admin/pricing?edit=${p.id}`} className="text-xs font-semibold text-[#1a3a6b] hover:text-[#3d9e3d]">Modifier</a>
                      <form action="/api/admin/base-prices" method="POST">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="text-xs font-semibold text-red-600 hover:text-red-800">Supprimer</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="space-y-4">
          <form action="/api/admin/base-prices" method="POST" className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900">{editing ? 'Modifier le prix' : 'Ajouter un prix'}</h2>
            <input type="hidden" name="intent" value="save" />
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <label className="block text-sm text-gray-700">Marque *
              <input name="make" required defaultValue={editing?.make ?? ''} placeholder="Toyota" className={INPUT} />
            </label>
            <label className="block text-sm text-gray-700">Modele
              <input name="model" defaultValue={editing?.model ?? ''} placeholder="Vide = tous les modeles de la marque" className={INPUT} />
            </label>
            <label className="block text-sm text-gray-700">Prix de base (XAF) *
              <input name="base_price_xaf" type="number" min={1} step={50000} required defaultValue={editing ? Number(editing.base_price_xaf) : ''} className={INPUT} />
            </label>
            <label className="block text-sm text-gray-700">Source / notes
              <input name="notes" defaultValue={editing?.notes ?? ''} placeholder="ex. prix concession Douala 2026" className={INPUT} />
            </label>
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132a4d]">
                Enregistrer
              </button>
              {editing && <a href="/admin/pricing" className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Annuler</a>}
            </div>
          </form>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900">Marques a chiffrer en priorite</h2>
            <p className="mt-1 text-xs text-gray-500">Annonces estimees sur le prix par defaut, par marque.</p>
            {missing.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">Aucune.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {missing.map((m) => (
                  <li key={m.label} className="flex justify-between">
                    <span className="text-gray-800">{m.label}</span>
                    <span className="text-gray-500">{m.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
