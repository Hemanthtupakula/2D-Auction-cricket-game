import React, { useMemo } from 'react';
import { SeasonAwards } from '../types';
import { resolveTeamLogo, handleImageFallback } from '../services/mediaResolver';
import { Trophy, X } from 'lucide-react';

interface ChampionCeremonyProps {
  champion: string;
  runnerUp: string;
  awards: SeasonAwards;
  onClose: () => void;
}

/**
 * Phase 5, Section 7.6 — full-screen champion ceremony: animated trophy lift,
 * CSS confetti, and season awards (Orange Cap / Purple Cap / Best Buy).
 * Pure CSS/2D — no 3D, no external assets.
 */
export const ChampionCeremony: React.FC<ChampionCeremonyProps> = ({ champion, runnerUp, awards, onClose }) => {
  const confetti = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: ((i * 13) % 40) / 10,
        duration: 2.5 + ((i * 7) % 20) / 10,
        color: ['#fbbf24', '#38bdf8', '#f472b6', '#34d399', '#a78bfa'][i % 5],
        size: 6 + ((i * 11) % 8),
      })),
    []
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md overflow-hidden" onClick={onClose}>
      <style>{`
        @keyframes axi-confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.4; }
        }
        @keyframes axi-trophy-lift {
          0% { transform: translateY(60px) scale(0.6); opacity: 0; }
          60% { transform: translateY(-12px) scale(1.08); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes axi-glow-pulse {
          0%, 100% { box-shadow: 0 0 40px 8px rgba(251,191,36,0.35); }
          50% { box-shadow: 0 0 80px 20px rgba(251,191,36,0.55); }
        }
      `}</style>

      {confetti.map((c, i) => (
        <div
          key={i}
          className="absolute top-0 pointer-events-none rounded-sm"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size * 0.6,
            backgroundColor: c.color,
            animation: `axi-confetti-fall ${c.duration}s linear ${c.delay}s infinite`,
          }}
        />
      ))}

      <div className="relative text-center space-y-6 p-8 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-2 right-2 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div style={{ animation: 'axi-trophy-lift 1.1s ease-out both' }} className="space-y-3">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-amber-600" style={{ animation: 'axi-glow-pulse 2s ease-in-out infinite' }}>
            <Trophy className="w-14 h-14 text-slate-950" />
          </div>
          <div className="text-[11px] font-black tracking-[0.3em] text-amber-400/80 uppercase">Season Champions</div>
        </div>

        <div className="space-y-2">
          <img
            src={resolveTeamLogo(champion)}
            alt={champion}
            className="w-24 h-24 rounded-3xl object-cover mx-auto border-4 border-amber-400/60 shadow-2xl shadow-amber-500/30"
            onError={handleImageFallback}
          />
          <h1 className="text-4xl font-black text-white tracking-tight">{champion}</h1>
          <p className="text-sm text-slate-400">
            defeated <span className="font-bold text-slate-200">{runnerUp}</span> in the Final
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
          {awards.orangeCap && (
            <div className="rounded-2xl bg-orange-500/10 border border-orange-500/40 p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-orange-300">🟠 Orange Cap</div>
              <div className="text-sm font-black text-white mt-1 truncate">{awards.orangeCap.playerName}</div>
              <div className="text-[11px] text-slate-400">{awards.orangeCap.runs} runs • {awards.orangeCap.franchise}</div>
            </div>
          )}
          {awards.purpleCap && (
            <div className="rounded-2xl bg-purple-500/10 border border-purple-500/40 p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-purple-300">🟣 Purple Cap</div>
              <div className="text-sm font-black text-white mt-1 truncate">{awards.purpleCap.playerName}</div>
              <div className="text-[11px] text-slate-400">{awards.purpleCap.wickets} wickets • {awards.purpleCap.franchise}</div>
            </div>
          )}
          {awards.bestBuy && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/40 p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">💎 Best Buy</div>
              <div className="text-sm font-black text-white mt-1 truncate">{awards.bestBuy.playerName}</div>
              <div className="text-[11px] text-slate-400">
                ₹{awards.bestBuy.priceCr.toFixed(2)} Cr • impact {awards.bestBuy.impactScore} • {awards.bestBuy.franchise}
              </div>
            </div>
          )}
        </div>

        <p className="text-[10px] text-slate-600">Champion is saved on the room — visible in the lobby for bragging rights.</p>
      </div>
    </div>
  );
};
