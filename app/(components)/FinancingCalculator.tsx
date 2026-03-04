'use client';

import { useState, useEffect, useRef } from 'react';

interface EligibilityResult {
  financeable: boolean;
  down_payment_percent: number;
  max_tenor: number;
  manual_review_required: boolean;
}

interface Props {
  defaultPrice?: number;
  defaultZone?: string;
  defaultConditionGrade?: string;
  defaultPriceBand?: string;
  compact?: boolean;
}

const INCOME_GRADES = [
  { value: 'A', label: 'Grade A — Plus de 500 000 XAF/mois' },
  { value: 'B', label: 'Grade B — 150 000 à 500 000 XAF/mois' },
  { value: 'C', label: 'Grade C — 80 000 à 150 000 XAF/mois' },
  { value: 'D', label: 'Grade D — Moins de 80 000 XAF/mois' },
];

const CONDITION_GRADES = [
  { value: 'A', label: 'A — Excellent' },
  { value: 'B', label: 'B — Bon' },
  { value: 'C', label: 'C — Correct' },
  { value: 'D', label: 'D — Passable' },
];

const TENORS = [6, 12, 18, 24, 36, 48, 60];
const RATES = [
  { value: 12, label: '12%' },
  { value: 15, label: '15%' },
  { value: 18, label: '18%' },
  { value: 24, label: '24%' },
];

function formatXAF(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M XAF`;
  return `${Math.round(n).toLocaleString('fr-FR')} XAF`;
}

/** Standard PMT amortization formula */
function pmt(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0 || principal <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
}

export default function FinancingCalculator({
  defaultPrice,
  defaultZone,
  defaultConditionGrade,
  defaultPriceBand,
  compact = false,
}: Props) {
  const [price, setPrice] = useState(defaultPrice ?? 0);
  const [zone, setZone] = useState(defaultZone ?? 'A');
  const [incomeGrade, setIncomeGrade] = useState('B');
  const [conditionGrade, setConditionGrade] = useState(defaultConditionGrade ?? 'B');
  const [priceBand] = useState(defaultPriceBand ?? 'green');
  const [downPct, setDownPct] = useState(30);
  const [tenor, setTenor] = useState(24);
  const [rate, setRate] = useState(15);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [loading, setLoading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/calculator/eligibility?zone=${zone}&income_grade=${incomeGrade}&price_band=${priceBand}&condition_grade=${conditionGrade}`
        );
        if (res.ok) {
          const data: EligibilityResult = await res.json();
          setEligibility(data);
          if (downPct < data.down_payment_percent) setDownPct(data.down_payment_percent);
          if (tenor > data.max_tenor) setTenor(data.max_tenor);
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, incomeGrade, priceBand, conditionGrade]);

  const downAmount = (price * downPct) / 100;
  const loanAmount = Math.max(0, price - downAmount);
  const monthlyPayment = loanAmount > 0 ? pmt(loanAmount, rate, tenor) : 0;
  const totalRepayment = monthlyPayment * tenor;
  const totalInterest = totalRepayment - loanAmount;

  const minDown = eligibility?.down_payment_percent ?? 20;
  const maxTenor = eligibility?.max_tenor ?? 60;
  const isEligible = eligibility ? eligibility.financeable : null;

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${compact ? '' : 'shadow-md'}`}>
      {/* Header */}
      <div className={`bg-[#1a3a6b] ${compact ? 'px-4 py-3' : 'p-5'}`}>
        <p className={`text-white font-bold ${compact ? 'text-sm' : 'text-xl'}`}>Simulateur de financement</p>
        {!compact && (
          <p className="text-blue-300 text-sm mt-1">Estimez vos mensualités en quelques secondes</p>
        )}
      </div>

      <div className={`${compact ? 'p-4' : 'p-5'} space-y-4`}>

        {/* Price input (hidden if defaultPrice is set) */}
        {defaultPrice === undefined && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Prix du véhicule (XAF)
            </label>
            <input
              type="number"
              value={price || ''}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="ex: 3 500 000"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3d9e3d] focus:ring-1 focus:ring-[#3d9e3d]"
            />
          </div>
        )}

        {/* Zone selector (hidden if defaultZone is set) */}
        {defaultZone === undefined && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              Zone
            </label>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#3d9e3d] focus:ring-1 focus:ring-[#3d9e3d]"
            >
              <option value="A">Zone A — Grandes villes</option>
              <option value="B">Zone B — Villes secondaires</option>
              <option value="C">Zone C — Rural</option>
            </select>
          </div>
        )}

        {/* Condition grade selector (hidden if defaultConditionGrade is set) */}
        {defaultConditionGrade === undefined && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              État du véhicule
            </label>
            <select
              value={conditionGrade}
              onChange={(e) => setConditionGrade(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#3d9e3d] focus:ring-1 focus:ring-[#3d9e3d]"
            >
              {CONDITION_GRADES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Income grade */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
            Votre revenu mensuel
          </label>
          <select
            value={incomeGrade}
            onChange={(e) => setIncomeGrade(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-[#3d9e3d] focus:ring-1 focus:ring-[#3d9e3d]"
          >
            {INCOME_GRADES.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        {/* Eligibility status */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 animate-pulse" />
            {"Vérification de l'éligibilité\u2026"}
          </div>
        )}
        {!loading && isEligible === false && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-700 text-sm font-semibold">{"Ce profil n'est pas éligible au financement."}</p>
            <p className="text-red-600 text-xs mt-1">Essayez une autre zone ou une catégorie de revenu plus élevée.</p>
          </div>
        )}
        {!loading && isEligible === true && eligibility?.manual_review_required && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-amber-800 text-sm font-semibold">Éligible — Examen individuel requis</p>
            <p className="text-amber-700 text-xs mt-1">Votre dossier sera examiné par notre équipe sous 48h.</p>
          </div>
        )}
        {!loading && isEligible === true && !eligibility?.manual_review_required && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-green-700 text-sm font-semibold">✓ Éligible au financement automatique</p>
          </div>
        )}

        {/* Calculation section — only renders when price is known */}
        {price > 0 && (
          <>
            {/* Down payment slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Apport initial</label>
                <span className="text-sm font-bold text-[#1a3a6b]">{downPct}% — {formatXAF(downAmount)}</span>
              </div>
              <input
                type="range"
                min={minDown}
                max={70}
                step={5}
                value={downPct}
                onChange={(e) => setDownPct(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3d9e3d]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Min {minDown}%</span>
                <span>Max 70%</span>
              </div>
            </div>

            {/* Tenor pills */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                Durée de remboursement
              </label>
              <div className="flex flex-wrap gap-2">
                {TENORS.filter((t) => t <= maxTenor).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTenor(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      tenor === t
                        ? 'bg-[#1a3a6b] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t} mois
                  </button>
                ))}
              </div>
            </div>

            {/* Interest rate pills */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                {"Taux d'intérêt annuel"}
              </label>
              <div className="flex gap-2">
                {RATES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRate(r.value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                      rate === r.value
                        ? 'bg-[#3d9e3d] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Result card */}
            {monthlyPayment > 0 && (
              <div className="bg-gradient-to-br from-[#1a3a6b] to-[#0d2147] rounded-xl p-4 text-white">
                <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-1">
                  Mensualité estimée
                </p>
                <p className="text-3xl font-extrabold mb-3">
                  {formatXAF(monthlyPayment)}
                  <span className="text-base font-normal text-blue-300"> /mois</span>
                </p>
                <div className="grid grid-cols-3 gap-2 border-t border-white/20 pt-3 text-center">
                  <div>
                    <p className="text-xs text-blue-300">Montant financé</p>
                    <p className="text-sm font-bold">{formatXAF(loanAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-300">Total remboursé</p>
                    <p className="text-sm font-bold">{formatXAF(totalRepayment)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-300">Coût du crédit</p>
                    <p className="text-sm font-bold">{formatXAF(totalInterest)}</p>
                  </div>
                </div>
                <p className="text-xs text-blue-400/80 mt-3 text-center">
                  {"* Simulation indicative \u2014 sous réserve d'approbation de votre dossier"}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
