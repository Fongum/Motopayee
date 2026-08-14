'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

const PAGE_OPTIONS = [
  {
    value: '/sell',
    label: 'Vendeurs',
    fallbackCampaign: 'Sell page',
    hook: 'Vous voulez vendre votre vehicule au Cameroun?',
    body: 'MotoPayee aide les vendeurs a mettre leur vehicule en ligne, verifier les documents et trouver des acheteurs serieux.',
  },
  {
    value: '/dealers',
    label: 'Concessionnaires',
    fallbackCampaign: 'Dealer pilot page',
    hook: 'Vous etes concessionnaire, garage ou vendeur professionnel?',
    body: 'Rejoignez le pilote MotoPayee pour presenter vos vehicules a des acheteurs verifies et potentiellement finances.',
  },
  {
    value: '/hire',
    label: 'Location proprietaires',
    fallbackCampaign: 'Rental owner page',
    hook: 'Vous avez un vehicule a mettre en location?',
    body: 'MotoPayee onboarde des proprietaires et partenaires de location pour les demandes de location au Cameroun.',
  },
  {
    value: '/apply',
    label: 'Acheteurs financement',
    fallbackCampaign: 'Buyer finance page',
    hook: 'Vous cherchez un vehicule avec option de financement?',
    body: 'MotoPayee vous connecte a des vehicules financeables et a des partenaires de microfinance.',
  },
  {
    value: '/finance-partners',
    label: 'Partenaires financement',
    fallbackCampaign: 'Finance partner page',
    hook: 'Votre institution finance des vehicules?',
    body: 'MotoPayee recherche des IMF, credit unions et partenaires de financement pour traiter des demandes vehicules structurees.',
  },
];

const SOURCE_OPTIONS = [
  { value: 'facebook', label: 'Facebook / Meta' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'referral', label: 'Reference' },
  { value: 'field', label: 'Terrain / flyer' },
  { value: 'dealer_visit', label: 'Visite concessionnaire' },
  { value: 'website', label: 'Site web direct' },
  { value: 'other', label: 'Autre' },
];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

function validPath(value: string | undefined): string {
  if (value && PAGE_OPTIONS.some((option) => option.value === value)) return value;
  return '/sell';
}

function validSource(value: string | undefined): string {
  if (value && SOURCE_OPTIONS.some((option) => option.value === value)) return value;
  return 'facebook';
}

export default function CampaignLinkBuilder({
  initialCampaign,
  initialSource,
  initialPath,
}: {
  initialCampaign?: string;
  initialSource?: string;
  initialPath?: string;
}) {
  const [path, setPath] = useState(validPath(initialPath));
  const [source, setSource] = useState(validSource(initialSource));
  const [campaign, setCampaign] = useState(initialCampaign && initialCampaign !== '__none' ? initialCampaign : 'seller_launch_august');
  const [copied, setCopied] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState('');

  const selectedPage = PAGE_OPTIONS.find((option) => option.value === path) ?? PAGE_OPTIONS[0];
  const normalizedCampaign = slugify(campaign) || slugify(selectedPage.fallbackCampaign);

  const relativeUrl = useMemo(() => {
    const params = new URLSearchParams({
      utm_source: source,
      utm_campaign: normalizedCampaign,
    });
    return `${path}?${params.toString()}`;
  }, [normalizedCampaign, path, source]);

  const fullUrl = typeof window === 'undefined'
    ? relativeUrl
    : `${window.location.origin}${relativeUrl}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(fullUrl)}`;

  async function copyLink() {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const outreachMessages = useMemo(() => {
    const shortMessage = `${selectedPage.hook}\n\n${selectedPage.body}\n\nLaissez vos informations ici: ${fullUrl}`;
    const socialPost = `${selectedPage.hook}\n\n${selectedPage.body}\n\nMotoPayee est une marketplace professionnelle et de confiance pour acheter, vendre, financer et louer des vehicules au Cameroun.\n\nDemarrez ici: ${fullUrl}`;
    const flyerLine = `${selectedPage.hook} Contactez MotoPayee: ${fullUrl}`;

    return [
      {
        key: 'whatsapp',
        label: 'Message WhatsApp',
        value: shortMessage,
        shareHref: `https://wa.me/?text=${encodeURIComponent(shortMessage)}`,
        shareLabel: 'Ouvrir WhatsApp',
      },
      {
        key: 'facebook',
        label: 'Post Facebook',
        value: socialPost,
        shareHref: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`,
        shareLabel: 'Partager Facebook',
      },
      { key: 'flyer', label: 'Texte flyer court', value: flyerLine },
    ];
  }, [fullUrl, selectedPage]);

  async function copyMessage(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedMessage(key);
    window.setTimeout(() => setCopiedMessage(''), 1500);
  }

  function printCampaignSheet() {
    window.print();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Page publique</span>
            <select
              value={path}
              onChange={(event) => setPath(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {PAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-600">Source</span>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-gray-600">Nom de campagne</span>
          <input
            value={campaign}
            onChange={(event) => setCampaign(event.target.value)}
            placeholder="Ex: seller_launch_august"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lien genere</p>
          <input
            readOnly
            value={fullUrl}
            className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-lg bg-[#3d9e3d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d8a2d]"
            >
              {copied ? 'Copie' : 'Copier le lien'}
            </button>
            <a
              href={relativeUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
            >
              Ouvrir
            </a>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
            <Image
              src={qrCodeUrl}
              alt="QR code du lien de campagne"
              width={112}
              height={112}
              unoptimized
              className="h-28 w-28 rounded-lg border border-gray-200 bg-white p-1"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">QR code campagne</p>
              <p className="mt-1 text-xs text-gray-500">
                Utilisez ce QR code sur les flyers, affiches ou visuels terrain.
              </p>
              <a
                href={qrCodeUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Ouvrir QR
              </a>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Scripts prets a envoyer</p>
            <p className="mt-1 text-xs text-gray-500">
              Ces textes incluent automatiquement le lien de campagne ci-dessus.
            </p>
          </div>
          {outreachMessages.map((message) => (
            <div key={message.key} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-800">{message.label}</h3>
                <div className="flex flex-wrap justify-end gap-2">
                  {message.shareHref && (
                    <a
                      href={message.shareHref}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#1a3a6b] hover:bg-blue-100"
                    >
                      {message.shareLabel}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => copyMessage(message.key, message.value)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {copiedMessage === message.key ? 'Copie' : 'Copier'}
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={message.value}
                rows={message.key === 'flyer' ? 2 : 5}
                className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              />
            </div>
          ))}
        </div>
      </section>

      <aside className="space-y-5">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <h2 className="font-bold text-[#1a3a6b]">Utilisation</h2>
          <div className="mt-3 space-y-3 text-sm text-blue-900">
            <p>Utilisez un lien different pour chaque post, campagne WhatsApp, flyer ou partenaire.</p>
            <p>Quand une personne soumet le formulaire, MotoPayee gardera la source et la campagne sur le lead.</p>
            <p>Les resultats sont visibles dans les filtres, exports CSV, cartes analytics et tableaux campagne.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-bold text-gray-900">Fiche terrain</h2>
            <button
              type="button"
              onClick={printCampaignSheet}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Imprimer
            </button>
          </div>
          <div className="rounded-xl border-2 border-[#1a3a6b] bg-white p-5 text-center print:border-gray-900">
            <p className="text-2xl font-black">
              <span className="text-[#3d9e3d]">Moto</span><span className="text-[#1a3a6b]">Payee</span>
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Marketplace vehicule de confiance
            </p>
            <h3 className="mt-5 text-xl font-bold text-gray-900">{selectedPage.hook}</h3>
            <p className="mt-3 text-sm leading-6 text-gray-600">{selectedPage.body}</p>
            <div className="mt-5 flex justify-center">
              <Image
                src={qrCodeUrl}
                alt="QR code MotoPayee"
                width={144}
                height={144}
                unoptimized
                className="h-36 w-36 rounded-lg border border-gray-200 bg-white p-2"
              />
            </div>
            <div className="mt-5 rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lien campagne</p>
              <p className="mt-2 break-all text-sm font-semibold text-[#1a3a6b]">{fullUrl}</p>
            </div>
            <p className="mt-5 text-xs text-gray-500">Campagne: {normalizedCampaign}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
