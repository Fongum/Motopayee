'use client';

import { useState, useEffect } from 'react';

interface ReferralCode {
  id: string;
  code: string;
  total_uses: number;
  reward_balance_xaf: number;
}

interface ReferralUse {
  id: string;
  reward_xaf: number;
  rewarded: boolean;
  created_at: string;
  referred?: { full_name: string | null };
}

export default function ReferralClient() {
  const [code, setCode] = useState<ReferralCode | null>(null);
  const [uses, setUses] = useState<ReferralUse[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referrals')
      .then((r) => r.json())
      .then((data) => {
        setCode(data.code);
        setUses(data.uses ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function copyCode() {
    if (!code) return;
    navigator.clipboard.writeText(code.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    if (!code) return;
    const text = `Rejoins MotoPayee, la plateforme auto #1 au Cameroun ! Utilise mon code de parrainage ${code.code} pour t'inscrire. ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://motopayee.com'}/register?ref=${code.code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-10 text-center">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Parrainage</h1>
      <p className="text-sm text-gray-500">Invitez vos amis sur MotoPayee et gagnez des récompenses pour chaque inscription.</p>

      {/* Code card */}
      {code && (
        <div className="bg-gradient-to-br from-[#1a3a6b] to-[#0d1f3c] rounded-2xl p-6 text-white">
          <p className="text-xs text-blue-200/70 mb-1">Votre code de parrainage</p>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl font-extrabold tracking-widest">{code.code}</span>
            <button onClick={copyCode} className="text-xs bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition">
              {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{code.total_uses}</p>
              <p className="text-[10px] text-blue-200/60">Filleuls inscrits</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{code.reward_balance_xaf.toLocaleString('fr-FR')}</p>
              <p className="text-[10px] text-blue-200/60">XAF gagnés</p>
            </div>
          </div>

          <button
            onClick={shareWhatsApp}
            className="w-full bg-[#25D366] text-white font-semibold py-3 rounded-xl hover:bg-[#1da851] transition text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.613.613l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.291 0-4.408-.754-6.116-2.027l-.427-.323-2.648.888.888-2.648-.323-.427A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            Partager via WhatsApp
          </button>
        </div>
      )}

      {/* Referral history */}
      <div>
        <h2 className="text-sm font-bold text-gray-800 mb-3">Historique des parrainages</h2>
        {uses.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">Aucun filleul pour le moment. Partagez votre code !</p>
        ) : (
          <div className="space-y-2">
            {uses.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{u.referred?.full_name ?? 'Utilisateur'}</p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(u.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#3d9e3d]">+{u.reward_xaf.toLocaleString('fr-FR')} XAF</p>
                  <p className="text-[10px] text-gray-400">{u.rewarded ? 'Versé' : 'En attente'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
