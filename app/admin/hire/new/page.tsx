import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import Link from 'next/link';

type SearchParams = { launch_lead_id?: string; owner_id?: string; city?: string; description?: string; conditions?: string };

type LeadRow = {
  id: string;
  name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  interest: string | null;
  notes: string | null;
};

export default async function AdminNewHireListingPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage('hire');

  const [{ data: ownersData }, { data: leadData }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, phone, role')
      .in('role', ['buyer', 'seller_individual', 'seller_dealer'])
      .eq('status', 'active')
      .order('full_name'),
    searchParams.launch_lead_id
      ? supabaseAdmin
        .from('launch_leads')
        .select('id, name, business_name, phone, email, city, interest, notes')
        .eq('id', searchParams.launch_lead_id)
        .single()
      : Promise.resolve({ data: null }),
  ]);

  const owners = ownersData ?? [];
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
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Creer une annonce location</h1>
          <p className="mt-1 text-sm text-gray-500">Creation staff avec proprietaire selectionne et conversion du lead si fourni.</p>
        </div>
        <Link href="/admin/hire" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Locations
        </Link>
      </div>

      <form action="/api/admin/hire" method="POST" className="space-y-6">
        {searchParams.launch_lead_id && <input type="hidden" name="launch_lead_id" value={searchParams.launch_lead_id} />}

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900">Proprietaire</h2>
          <select name="owner_id" required defaultValue={searchParams.owner_id ?? ''} className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm">
            <option value="">Selectionner un proprietaire</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.full_name ?? owner.email} - {owner.role}{owner.phone ? ` - ${owner.phone}` : ''}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900">Vehicule</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <input name="make" required placeholder="Marque" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input name="model" required placeholder="Modele" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input name="year" type="number" required min="1970" max={new Date().getFullYear() + 1} placeholder="Annee" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <select name="fuel_type" defaultValue="petrol" className="rounded-xl border border-gray-300 px-4 py-3 text-sm">
              <option value="petrol">Essence</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electrique</option>
              <option value="hybrid">Hybride</option>
              <option value="other">Autre</option>
            </select>
            <select name="transmission" defaultValue="automatic" className="rounded-xl border border-gray-300 px-4 py-3 text-sm">
              <option value="automatic">Automatique</option>
              <option value="manual">Manuelle</option>
              <option value="other">Autre</option>
            </select>
            <input name="seats" type="number" min="1" defaultValue="5" placeholder="Places" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input name="color" placeholder="Couleur" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input name="plate_number" placeholder="Immatriculation" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold text-gray-900">Location</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <select name="hire_type" defaultValue="self_drive" className="rounded-xl border border-gray-300 px-4 py-3 text-sm">
              <option value="self_drive">Sans chauffeur</option>
              <option value="with_driver">Avec chauffeur</option>
              <option value="both">Les deux</option>
            </select>
            <input name="daily_rate" type="number" required min="1000" placeholder="Tarif journalier" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input name="deposit_amount" type="number" min="0" defaultValue="0" placeholder="Caution" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input name="driver_daily_rate" type="number" min="0" placeholder="Tarif chauffeur/jour" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input name="min_hire_days" type="number" min="1" defaultValue="1" placeholder="Duree min" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input name="max_hire_days" type="number" min="1" placeholder="Duree max" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input name="city" required defaultValue={lead?.city ?? searchParams.city ?? ''} placeholder="Ville" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <select name="zone" defaultValue="A" className="rounded-xl border border-gray-300 px-4 py-3 text-sm">
              <option value="A">Zone A</option>
              <option value="B">Zone B</option>
              <option value="C">Zone C</option>
            </select>
          </div>
          <textarea name="description" defaultValue={description} rows={4} placeholder="Description" className="mt-4 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          <textarea name="conditions" defaultValue={searchParams.conditions ?? lead?.notes ?? ''} rows={3} placeholder="Conditions" className="mt-4 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm" />
        </section>

        <button type="submit" className="w-full rounded-xl bg-[#3d9e3d] py-3 text-sm font-semibold text-white hover:bg-[#2d8a2d]">
          Creer annonce location
        </button>
      </form>
    </div>
  );
}
