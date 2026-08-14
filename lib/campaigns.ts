export type AcquisitionSearchParams = {
  campaign?: string | string[];
  campaign_name?: string | string[];
  source?: string | string[];
  utm_source?: string | string[];
  utm_campaign?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function campaignNameFromSearch(
  searchParams: AcquisitionSearchParams | undefined,
  fallback?: string,
) {
  const raw =
    firstValue(searchParams?.campaign) ||
    firstValue(searchParams?.campaign_name) ||
    firstValue(searchParams?.utm_campaign) ||
    fallback ||
    '';

  const campaignName = raw.trim().slice(0, 120);
  return campaignName || undefined;
}

export function leadSourceFromSearch(searchParams: AcquisitionSearchParams | undefined) {
  const raw = (
    firstValue(searchParams?.source) ||
    firstValue(searchParams?.utm_source) ||
    ''
  ).trim().toLowerCase();

  if (!raw) return 'website';
  if (raw.includes('facebook') || raw === 'fb' || raw.includes('meta')) return 'facebook';
  if (raw.includes('whatsapp') || raw === 'wa') return 'whatsapp';
  if (raw.includes('referral') || raw.includes('refer') || raw.includes('ambassador')) return 'referral';
  if (raw.includes('field') || raw.includes('flyer') || raw.includes('street')) return 'field';
  if (raw.includes('dealer')) return 'dealer_visit';
  if (raw.includes('staff')) return 'staff';
  if (raw.includes('website') || raw.includes('google') || raw.includes('direct')) return 'website';

  return 'other';
}
