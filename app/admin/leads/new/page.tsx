import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
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

export default async function NewLeadPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data: staffData } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role')
    .in('role', ['field_agent', 'inspector', 'verifier', 'admin'])
    .eq('status', 'active')
    .order('full_name');

  const staff = (staffData ?? []) as Array<{ id: string; full_name: string | null; email: string; role: string }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau lead</h1>
          <p className="mt-1 text-sm text-gray-500">Ajouter un contact capture hors site web.</p>
        </div>
        <Link href="/admin/leads" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Retour leads
        </Link>
      </div>

      <form action="/api/admin/leads" method="POST" className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Type</span>
            <select name="lead_type" required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {LEAD_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Source</span>
            <select name="source" defaultValue="whatsapp" required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {SOURCES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Nom</span>
            <input name="name" required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Entreprise</span>
            <input name="business_name" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Telephone</span>
            <input name="phone" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Email</span>
            <input name="email" type="email" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Ville</span>
            <input name="city" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Campagne</span>
            <input name="campaign_name" placeholder="Ex: Dealer pilot August" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Priorite</span>
            <select name="priority" defaultValue="normal" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="low">Basse</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Assigner a</span>
            <select name="assigned_to" defaultValue={user.id} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {staff.map((member) => (
                <option key={member.id} value={member.id}>{member.full_name ?? member.email}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Prochaine relance</span>
            <input type="datetime-local" name="next_follow_up_at" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-gray-600">Interet / besoin</span>
          <input name="interest" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-gray-600">Notes</span>
          <textarea name="notes" rows={4} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>

        <div className="mt-6 flex justify-end">
          <button type="submit" className="rounded-lg bg-[#1a3a6b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#132a4d]">
            Enregistrer lead
          </button>
        </div>
      </form>
    </div>
  );
}
