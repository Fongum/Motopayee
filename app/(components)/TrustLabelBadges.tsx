import type { HireListing, Listing } from '@/lib/types';

type TrustBadge = {
  label: string;
  title: string;
  className: string;
};

const BASE_BADGE = 'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold';

function Badge({ badge }: { badge: TrustBadge }) {
  return (
    <span title={badge.title} className={`${BASE_BADGE} ${badge.className}`}>
      {badge.label}
    </span>
  );
}

export function getListingTrustBadges(listing: Listing): TrustBadge[] {
  const badges: TrustBadge[] = [];

  if (!listing.status || listing.status === 'published') {
    badges.push({
      label: 'MotoPayee revu',
      title: 'MotoPayee a revu les informations de base avant publication.',
      className: 'border-blue-200 bg-blue-50 text-blue-700',
    });
  }

  if (listing.seller?.is_verified) {
    badges.push({
      label: 'Vendeur verifie',
      title: 'MotoPayee a verifie le profil ou les informations du vendeur.',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    });
  }

  if (listing.vehicle?.condition_grade) {
    badges.push({
      label: 'Inspecte',
      title: 'MotoPayee a inspecte le vehicule et attribue un grade de condition.',
      className: 'border-purple-200 bg-purple-50 text-purple-700',
    });
  }

  if (listing.financeable) {
    badges.push({
      label: 'Finance eligible',
      title: 'Ce vehicule peut etre soumis aux partenaires de financement. Approbation finale par le partenaire.',
      className: 'border-green-200 bg-green-50 text-green-700',
    });
  }

  return badges;
}

export function getHireTrustBadges(listing: HireListing): TrustBadge[] {
  const badges: TrustBadge[] = [];

  if (!listing.status || listing.status === 'published') {
    badges.push({
      label: 'Location verifiee',
      title: 'MotoPayee a revu le vehicule, le proprietaire, les tarifs, la caution et les conditions avant publication.',
      className: 'border-green-200 bg-green-50 text-green-700',
    });
  }

  if (listing.owner?.is_verified) {
    badges.push({
      label: 'Proprietaire verifie',
      title: 'MotoPayee a verifie le profil ou les informations du proprietaire.',
      className: 'border-blue-200 bg-blue-50 text-blue-700',
    });
  }

  if (listing.insurance_included) {
    badges.push({
      label: 'Assurance indiquee',
      title: 'Le proprietaire indique une assurance incluse pour cette location.',
      className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    });
  }

  return badges;
}

export function ListingTrustBadges({ listing, compact = false }: { listing: Listing; compact?: boolean }) {
  const badges = getListingTrustBadges(listing);
  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'mt-2'}`}>
      {badges.map((badge) => (
        <Badge key={badge.label} badge={badge} />
      ))}
    </div>
  );
}

export function HireTrustBadges({ listing, compact = false }: { listing: HireListing; compact?: boolean }) {
  const badges = getHireTrustBadges(listing);
  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'mt-2'}`}>
      {badges.map((badge) => (
        <Badge key={badge.label} badge={badge} />
      ))}
    </div>
  );
}
