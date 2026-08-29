import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import Link from 'next/link';

const LEAD_TYPES = [
  ['seller', 'Vendeur'],
  ['dealer', 'Concessionnaire'],
  ['rental_owner', 'Proprietaire location'],
  ['buyer', 'Acheteur'],
  ['renter', 'Locataire'],
  ['mfi', 'IMF / credit union'],
  ['inspection', 'Inspection'],
  ['other', 'Autre'],
];

const SOURCES = [
  ['whatsapp', 'WhatsApp'],
  ['field', 'Terrain'],
  ['referral', 'Referral'],
  ['facebook', 'Facebook'],
  ['dealer_visit', 'Visite dealer'],
  ['staff', 'Staff'],
  ['website', 'Website'],
  ['other', 'Autre'],
];

const CSV_TEMPLATE = 'name,business_name,phone,email,city,interest,notes,campaign_name,lead_type,source,priority';

export default async function LeadImportPage({
  searchParams,
}: {
  searchParams: { created?: string; updated?: string; skipped?: string };
}) {
  const user = await requireAdminPage('leads');

  const { data: staffData } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role')
    .in('role', ['field_agent', 'inspector', 'verifier', 'admin'])
    .eq('status', 'active')
    .order('full_name');

  const staff = (staffData ?? []) as Array<{ id: string; full_name: string | null; email: string; role: string }>;
  const hasResult = searchParams.created || searchParams.updated || searchParams.skipped;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import leads CSV</h1>
          <p className="mt-1 text-sm text-gray-500">Coller une liste depuis Excel ou Google Sheets pour creer ou mettre a jour des leads.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/leads/new" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Nouveau lead
          </Link>
          <a href="/api/admin/leads/import/template" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Template CSV
          </a>
          <Link href="/admin/leads" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Retour leads
          </Link>
        </div>
      </div>

      {hasResult && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
            <p className="text-2xl font-bold text-green-700">{Number(searchParams.created ?? 0)}</p>
            <p className="mt-1 text-sm text-green-900">Crees</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-2xl font-bold text-blue-700">{Number(searchParams.updated ?? 0)}</p>
            <p className="mt-1 text-sm text-blue-900">Mis a jour</p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <p className="text-2xl font-bold text-orange-700">{Number(searchParams.skipped ?? 0)}</p>
            <p className="mt-1 text-sm text-orange-900">Ignores</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form action="/api/admin/leads/import" method="POST" className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Type par defaut</span>
              <select name="default_lead_type" defaultValue="seller" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {LEAD_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Source par defaut</span>
              <select name="default_source" defaultValue="staff" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {SOURCES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Priorite par defaut</span>
              <select name="default_priority" defaultValue="normal" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="low">Basse</option>
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Assigner a</span>
              <select name="assigned_to" defaultValue={user.id} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">Non assigne</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>{member.full_name ?? member.email}</option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-gray-600">Prochaine relance commune</span>
              <input type="datetime-local" name="next_follow_up_at" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-gray-600">Campagne par defaut</span>
              <input name="default_campaign_name" placeholder="Ex: Dealer pilot August" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
          </div>

          <label className="mt-5 block">
            <span className="text-xs font-medium text-gray-600">CSV</span>
            <textarea
              name="csv_data"
              rows={14}
              required
              placeholder={`${CSV_TEMPLATE}\nJohn Doe,,237600000000,john@example.com,Douala,Toyota Corolla,Lead Facebook,Rental season,seller,facebook,normal`}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
            />
          </label>

          <div className="mt-6 flex justify-end">
            <button type="submit" className="rounded-lg bg-[#1a3a6b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#132a4d]">
              Importer leads
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-900">Colonnes supportees</h2>
            <p className="mt-2 rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700">{CSV_TEMPLATE}</p>
            <p className="mt-3 text-sm text-gray-500">
              Les colonnes <span className="font-medium text-gray-700">campaign_name</span>, <span className="font-medium text-gray-700">lead_type</span>, <span className="font-medium text-gray-700">source</span> et <span className="font-medium text-gray-700">priority</span> sont optionnelles par ligne.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Les imports colles peuvent etre separes par virgule, point-virgule ou tabulation.
            </p>
          </section>
          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <h2 className="text-sm font-bold text-blue-950">Regle de doublon</h2>
            <p className="mt-2 text-sm text-blue-950">
              Si un telephone ou un email existe deja, MotoPayee met a jour le lead existant et ajoute une activite d import.
            </p>
          </section>
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-bold text-gray-900">Limite</h2>
            <p className="mt-2 text-sm text-gray-500">Chaque import traite les 200 premieres lignes valides pour garder l operation controlable.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
