/**
 * The MotoPayee dealer program — what earns the "Trusted Dealer" label.
 *
 * docs/trust-verification-policy.md lists seven minimum requirements. Each one
 * is a column on `dealers` (migration 045), and the table's CHECK constraint
 * refuses `verified = true` while any is missing. This module is the app-side
 * mirror of that constraint, so the admin screen can say what is still missing
 * before the database has to refuse.
 *
 * Pure — no Supabase client — so the rules are unit-tested directly.
 */

export interface DealerProgramRecord {
  dealer_name: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  manager_contact_confirmed_at: string | null;
  inventory_contact_name: string | null;
  inventory_contact_phone: string | null;
  agreed_listing_accuracy_at: string | null;
  agreed_sold_updates_at: string | null;
  agreed_lead_handling_at: string | null;
  agreed_no_false_financeable_at: string | null;
}

/** Columns the admin screen reads. One literal: supabase-js parses it. */
export const DEALER_PROGRAM_COLUMNS =
  'id, profile_id, dealer_name, city, contact_email, contact_phone, manager_name, manager_phone, manager_contact_confirmed_at, inventory_contact_name, inventory_contact_phone, agreed_listing_accuracy_at, agreed_sold_updates_at, agreed_lead_handling_at, agreed_no_false_financeable_at, program_notes, verified, verified_at, verified_by, created_at';

export type DealerRequirementKey =
  | 'business_name'
  | 'manager_contact'
  | 'inventory_contact'
  | 'listing_accuracy'
  | 'sold_updates'
  | 'lead_handling'
  | 'no_false_financeable';

export interface DealerRequirement {
  key: DealerRequirementKey;
  /** The policy's own wording — tests check the policy still says it. */
  policy: string;
  /** What the admin checklist shows. */
  label: string;
  met: (d: DealerProgramRecord) => boolean;
}

const filled = (v: string | null | undefined) => typeof v === 'string' && v.trim() !== '';

export const DEALER_REQUIREMENTS: readonly DealerRequirement[] = [
  {
    key: 'business_name',
    policy: 'Dealer/business name captured',
    label: 'Nom du concessionnaire / de l entreprise renseigne',
    met: (d) => filled(d.dealer_name),
  },
  {
    key: 'manager_contact',
    policy: 'Owner or manager contact confirmed',
    label: 'Contact du proprietaire ou gerant confirme (nom, telephone, confirmation)',
    met: (d) => filled(d.manager_name) && filled(d.manager_phone) && !!d.manager_contact_confirmed_at,
  },
  {
    key: 'inventory_contact',
    policy: 'Inventory contact person assigned',
    label: 'Responsable inventaire designe (nom et telephone)',
    met: (d) => filled(d.inventory_contact_name) && filled(d.inventory_contact_phone),
  },
  {
    key: 'listing_accuracy',
    policy: 'Dealer agrees to listing accuracy',
    label: 'Accepte l exactitude des annonces',
    met: (d) => !!d.agreed_listing_accuracy_at,
  },
  {
    key: 'sold_updates',
    policy: 'Dealer agrees to update sold or unavailable vehicles',
    label: 'Accepte de mettre a jour les vehicules vendus ou indisponibles',
    met: (d) => !!d.agreed_sold_updates_at,
  },
  {
    key: 'lead_handling',
    policy: 'Dealer agrees to lead handling expectations',
    label: 'Accepte les regles de traitement des prospects',
    met: (d) => !!d.agreed_lead_handling_at,
  },
  {
    key: 'no_false_financeable',
    policy: 'Dealer agrees not to make false financeable claims',
    label: 'Accepte de ne pas annoncer de faux vehicules "financables"',
    met: (d) => !!d.agreed_no_false_financeable_at,
  },
];

/** Requirements not yet met. Empty means the dealer may be approved. */
export function dealerProgramGaps(d: DealerProgramRecord): DealerRequirementKey[] {
  return DEALER_REQUIREMENTS.filter((r) => !r.met(d)).map((r) => r.key);
}

/**
 * Whether a seller, as embedded on a listing, is an approved program dealer.
 *
 * Reads `seller.dealers`, embedded as `dealers!profile_id(verified)`. It is a
 * one-to-many embed, so PostgREST returns an array; a single object is
 * accepted too. Absent data is "no" — a trust label must never default on.
 */
export function isProgramDealer(
  seller: { dealers?: Array<{ verified: boolean }> | { verified: boolean } | null } | null | undefined
): boolean {
  const rows = seller?.dealers;
  if (!rows) return false;
  return (Array.isArray(rows) ? rows : [rows]).some((row) => row?.verified === true);
}

/** The policy's suggested public wording, in French. */
export const TRUSTED_DEALER_LABEL = 'Concessionnaire de confiance';
export const TRUSTED_DEALER_TITLE =
  'Ce concessionnaire fait partie du programme concessionnaires MotoPayee et a accepte les standards de la marketplace. Cela ne veut pas dire que chaque vehicule est inspecte ou eligible au financement.';
