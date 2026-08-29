import CampaignLinkBuilder from './CampaignLinkBuilder';
import { requireAdminPage } from '@/lib/auth/admin-access';

export default async function CampaignLinksPage({
  searchParams,
}: {
  searchParams?: { campaign?: string; source?: string; path?: string };
}) {
  await requireAdminPage('leads');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#3d9e3d]">Acquisition</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Liens de campagne</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-500">
          Generez des liens publics avec source et campagne pour suivre les leads dans l&apos;inbox MotoPayee.
        </p>
      </div>

      <CampaignLinkBuilder
        initialCampaign={searchParams?.campaign}
        initialSource={searchParams?.source}
        initialPath={searchParams?.path}
      />
    </div>
  );
}
