type LeadMessageInput = {
  name: string;
  lead_type: string;
  interest?: string | null;
};

const LEAD_TYPE_LABELS: Record<string, string> = {
  seller: 'vendre votre vehicule',
  dealer: 'rejoindre le programme dealer MotoPayee',
  rental_owner: 'mettre un vehicule en location',
  buyer: 'acheter un vehicule',
  renter: 'louer un vehicule',
  mfi: 'devenir partenaire financement',
  inspection: 'verifier un vehicule',
  other: 'MotoPayee',
};

const MESSAGE_BY_TYPE: Record<string, string> = {
  seller: 'Nous pouvons vous aider a verifier, presenter et vendre votre vehicule sur MotoPayee. Pouvez-vous nous confirmer la ville, le modele, le prix souhaite et si les documents sont disponibles ?',
  dealer: 'Nous lancons un pilote gratuit pour les dealers afin de publier le stock, recevoir des acheteurs serieux et connecter les dossiers eligibles au financement. Pouvez-vous nous confirmer votre ville, votre volume de vehicules et le bon contact pour un rendez-vous ?',
  rental_owner: 'Nous organisons les partenaires location pour la haute saison. Pouvez-vous confirmer le type de vehicule, la ville, les tarifs, la caution et les disponibilites ?',
  buyer: 'Nous pouvons vous aider a trouver un vehicule verifie et, si besoin, presenter votre demande a nos partenaires de financement. Quel budget, quelle ville et quel type de vehicule cherchez-vous ?',
  renter: 'Nous pouvons vous aider a trouver une location adaptee. Pouvez-vous confirmer vos dates, votre ville, le type de vehicule souhaite et si vous avez un permis valide ?',
  mfi: 'MotoPayee connecte les acheteurs eligibles aux partenaires de financement. Nous aimerions comprendre vos criteres, documents requis, zones couvertes et delais de reponse pour vous envoyer de bons dossiers.',
  inspection: 'Nous pouvons organiser une verification MotoPayee pour renforcer la confiance autour du vehicule. Pouvez-vous confirmer la ville, le vehicule concerne et le contact disponible pour programmer l inspection ?',
  other: 'Nous vous contactons pour clarifier votre besoin et voir comment MotoPayee peut vous accompagner. Pouvez-vous nous donner plus de details sur votre objectif ?',
};

export function buildLeadOutreachMessage(lead: LeadMessageInput) {
  const interest = lead.interest?.trim();
  const context = interest || LEAD_TYPE_LABELS[lead.lead_type] || LEAD_TYPE_LABELS.other;
  const body = MESSAGE_BY_TYPE[lead.lead_type] || MESSAGE_BY_TYPE.other;

  return `Bonjour ${lead.name}, ici MotoPayee. Nous vous contactons suite a votre interet pour ${context}. ${body}`;
}

export const QUICK_LEAD_ACTIVITY_TEMPLATES = [
  {
    id: 'whatsapp_sent',
    label: 'WhatsApp envoye',
    action: 'whatsapp',
    outcome: 'other',
    followUpPreset: 'tomorrow',
    summary: 'Message WhatsApp envoye avec script MotoPayee. Relance demain si pas de reponse.',
  },
  {
    id: 'call_no_answer',
    label: 'Appel sans reponse',
    action: 'call',
    outcome: 'no_answer',
    followUpPreset: 'later_today',
    summary: 'Appel effectue, pas de reponse. Relance planifiee plus tard.',
  },
  {
    id: 'interested',
    label: 'Interesse',
    action: 'call',
    outcome: 'reached_interested',
    followUpPreset: 'tomorrow',
    summary: 'Contact atteint et interesse. Prochaine etape a confirmer demain.',
  },
  {
    id: 'documents_requested',
    label: 'Docs demandes',
    action: 'documents',
    outcome: 'documents_requested',
    followUpPreset: 'three_days',
    summary: 'Documents demandes pour avancer le dossier MotoPayee.',
  },
  {
    id: 'meeting_booked',
    label: 'RDV fixe',
    action: 'meeting',
    outcome: 'meeting_booked',
    followUpPreset: 'tomorrow',
    summary: 'Rendez-vous fixe pour avancer la conversion du lead.',
  },
] as const;
