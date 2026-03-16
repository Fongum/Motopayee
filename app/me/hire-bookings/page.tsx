import { redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import type { HireBooking } from '@/lib/types';
import BookingActions from './BookingActions';

function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

const STATUS_FR: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'En attente',  cls: 'bg-amber-100 text-amber-700' },
  confirmed:  { label: 'Confirmé',    cls: 'bg-blue-100 text-blue-700' },
  active:     { label: 'En cours',    cls: 'bg-green-100 text-green-700' },
  completed:  { label: 'Terminé',     cls: 'bg-gray-100 text-gray-600' },
  cancelled:  { label: 'Annulé',      cls: 'bg-red-100 text-red-600' },
  disputed:   { label: 'Litige',      cls: 'bg-red-100 text-red-700' },
};

export default async function MyHireBookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Fetch bookings where user is renter
  const { data: renterBookings } = await supabaseAdmin
    .from('hire_bookings')
    .select('*, hire_listing:hire_listings(id, make, model, year, city, daily_rate), renter:profiles!renter_id(full_name, phone), owner:profiles!owner_id(full_name, phone)')
    .eq('renter_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch bookings where user is owner
  const { data: ownerBookings } = await supabaseAdmin
    .from('hire_bookings')
    .select('*, hire_listing:hire_listings(id, make, model, year, city, daily_rate), renter:profiles!renter_id(full_name, phone, email), owner:profiles!owner_id(full_name, phone)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  const myRentals = (renterBookings ?? []) as unknown as HireBooking[];
  const myVehicleBookings = (ownerBookings ?? []) as unknown as HireBooking[];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Réservations</h1>

      {/* Owner bookings — if user has any */}
      {myVehicleBookings.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">Réservations sur mes véhicules</h2>
          <div className="space-y-3">
            {myVehicleBookings.map((b) => {
              const st = STATUS_FR[b.status] ?? STATUS_FR.pending;
              const hl = b.hire_listing;
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">
                        {hl ? `${hl.year} ${hl.make} ${hl.model}` : 'Véhicule'}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {b.start_date} — {b.end_date} ({b.total_days} jours)
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Locataire: {b.renter?.full_name} {b.renter?.phone ? `(${b.renter.phone})` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      <p className="text-sm font-bold text-gray-800 mt-1">{formatXAF(b.total_amount)}</p>
                    </div>
                  </div>
                  {b.renter_notes && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-2">Note: {b.renter_notes}</p>
                  )}
                  <BookingActions booking={b} isOwner={true} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Renter bookings */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase mb-4">Mes locations</h2>
        {myRentals.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-500 mb-2">Aucune réservation</p>
            <a href="/hire" className="text-[#3d9e3d] font-semibold hover:underline">Parcourir les véhicules</a>
          </div>
        ) : (
          <div className="space-y-3">
            {myRentals.map((b) => {
              const st = STATUS_FR[b.status] ?? STATUS_FR.pending;
              const hl = b.hire_listing;
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <a href={hl ? `/hire/${hl.id}` : '#'} className="font-bold text-[#1a3a6b] hover:text-[#3d9e3d] text-sm">
                        {hl ? `${hl.year} ${hl.make} ${hl.model}` : 'Véhicule'}
                      </a>
                      <p className="text-xs text-gray-400">
                        {b.start_date} — {b.end_date} ({b.total_days} jours)
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {b.hire_type === 'with_driver' ? 'Avec chauffeur' : 'Sans chauffeur'}
                        {b.pickup_location ? ` — ${b.pickup_location}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      <p className="text-sm font-bold text-gray-800 mt-1">{formatXAF(b.total_amount)}</p>
                    </div>
                  </div>
                  {b.owner_notes && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-2">Note propriétaire: {b.owner_notes}</p>
                  )}
                  <BookingActions booking={b} isOwner={false} />
                  {b.status === 'completed' && (
                    <a
                      href={`/hire/${b.hire_listing_id}#reviews`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1a3a6b] hover:text-[#3d9e3d] transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      Laisser un avis
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
