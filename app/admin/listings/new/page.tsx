import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

type SearchParams = { launch_lead_id?: string; seller_id?: string; city?: string; description?: string };

type LeadRow = {
  id: string;
  lead_type: string;
  name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  interest: string | null;
  notes: string | null;
};

export default async function AdminNewListingPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [{ data: sellersData }, { data: leadData }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, role')
      .in('role', ['seller_individual', 'seller_dealer'])
      .eq('status', 'active')
      .order('full_name'),
    searchParams.launch_lead_id
      ? supabaseAdmin
        .from('launch_leads')
        .select('id, lead_type, name, business_name, phone, email, city, interest, notes')
        .eq('id', searchParams.launch_lead_id)
        .single()
      : Promise.resolve({ data: null }),
  ]);

  const sellers = sellersData ?? [];
  const lead = leadData as LeadRow | null;
  const description = searchParams.description || [
    lead ? `Lead MotoPayee: ${lead.business_name || lead.name}` : null,
    lead?.phone ? `Telephone: ${lead.phone}` : null,
    lead?.email ? `Email: ${lead.email}` : null,
    lead?.interest ? `Interet: ${lead.interest}` : null,
    lead?.notes ? `Notes: ${lead.notes}` : null,
  ].filter(Boolean).join('\n');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/leads/inventory" className="text-sm font-medium text-[#1a3a6b] hover:underline">
            Retour file inventory
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Creer une annonce vente</h1>
          <p className="mt-1 text-sm text-gray-500">Creation staff avec vendeur selectionne et conversion du lead si fourni.</p>
        </div>
        <Link href="/admin/listings" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Annonces
        </Link>
      </div>

      {lead && (
        <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-950">
          <p className="font-semibold">{lead.business_name || lead.name}</p>
          <p className="mt-1 text-teal-800">
            {lead.phone ?? '-'}{lead.email ? ` - ${lead.email}` : ''}{lead.city ? ` - ${lead.city}` : ''}
          </p>
        </div>
      )}

      <form action="/api/admin/listings" method="POST" className="space-y-6">
        {searchParams.launch_lead_id && <input type="hidden" name="launch_lead_id" value={searchParams.launch_lead_id} />}

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900">Vendeur</h2>
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Profil vendeur *</label>
            <select name="seller_id" required defaultValue={searchParams.seller_id ?? ''} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm">
              <option value="">Selectionner un vendeur</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.full_name ?? seller.email} - {seller.role}{seller.phone ? ` - ${seller.phone}` : ''}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900">Vehicule</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input name="make" required placeholder="Marque" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input name="model" required placeholder="Modele" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input name="year" type="number" required min="1960" max={new Date().getFullYear() + 1} placeholder="Annee" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input name="mileage_km" type="number" required min="0" defaultValue="0" placeholder="Kilometrage" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <select name="fuel_type" defaultValue="petrol" className="rounded-xl border border-gray-300 px-4 py-3 text-sm">
              <option value="petrol">Essence</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electrique</option>
              <option value="hybrid">Hybride</option>
              <option value="other">Autre</option>
            </select>
            <select name="transmission" defaultValue="manual" className="rounded-xl border border-gray-300 px-4 py-3 text-sm">
              <option value="manual">Manuelle</option>
              <option value="automatic">Automatique</option>
              <option value="other">Autre</option>
            </select>
            <input name="color" placeholder="Couleur" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input name="engine_cc" type="number" min="0" placeholder="Cylindree cc" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input name="seats" type="number" min="1" placeholder="Places" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900">Annonce</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input name="asking_price" type="number" required min="0" placeholder="Prix demande XAF" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <select name="zone" defaultValue="A" className="rounded-xl border border-gray-300 px-4 py-3 text-sm">
              <option value="A">Zone A</option>
              <option value="B">Zone B</option>
              <option value="C">Zone C</option>
            </select>
            <input name="city" defaultValue={lead?.city ?? searchParams.city ?? ''} placeholder="Ville" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          </div>
          <textarea name="description" defaultValue={description} rows={5} placeholder="Description" className="mt-4 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm" />
        </section>

        <button type="submit" className="w-full rounded-xl bg-[#3d9e3d] py-3 text-sm font-semibold text-white hover:bg-[#2d8a2d]">
          Creer brouillon vente
        </button>
      </form>
    </div>
  );
}
