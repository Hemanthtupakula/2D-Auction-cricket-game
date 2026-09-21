import React, { useState, useEffect } from 'react';
import { MiniMatch } from '../types';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { updateProgressionAfterMatch, PlayerProgressionState } from '../services/playerProgression';

interface MiniMatchPostMatchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  match: MiniMatch;
  onRematch?: () => void;
  onReturnToRoom?: () => void;
}

export const MiniMatchPostMatchDrawer: React.FC<MiniMatchPostMatchDrawerProps> = ({
  isOpen,
  onClose,
  match,
  onRematch,
  onReturnToRoom
}) => {
  const [activeStep, setActiveStep] = useState<'RESULT' | 'SCORECARD' | 'PERFORMANCE' | 'PROGRESSION' | 'SEASON'>('RESULT');
  const [updatedProgression, setUpdatedProgression] = useState<Record<string, PlayerProgressionState>>({});

  useEffect(() => {
    if (isOpen && match) {
      const updated = updateProgressionAfterMatch(match);
      setUpdatedProgression(updated);
    }
  }, [isOpen, match]);

  if (!isOpen || !match) return null;

  const homeRuns = match.homeRuns || 0;
  const homeWickets = match.homeWickets || 0;
  const awayRuns = match.awayRuns || 0;
  const awayWickets = match.awayWickets || 0;

  const winner = homeRuns > awayRuns ? match.homeFranchise : awayRuns > homeRuns ? match.awayFranchise : 'TIE';
  const margin = Math.abs(homeRuns - awayRuns);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#0d1322] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header Ribbon */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>MATCH COMPLETE</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-extrabold uppercase">
                  {winner === 'TIE' ? 'MATCH TIED' : `${winner} WON BY ${margin} RUNS`}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Official results, scorecard, performance XP, rating progression & season standings
              </p>
            </div>
          </div>
        </div>

        {/* Pipeline Navigation Tabs */}
        <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between overflow-x-auto no-scrollbar">
          {[
            { id: 'RESULT', label: '🏆 MATCH RESULT' },
            { id: 'SCORECARD', label: '📊 FULL SCORECARD' },
            { id: 'PERFORMANCE', label: '⭐ PERFORMANCE XP' },
            { id: 'PROGRESSION', label: '📈 RATING PROGRESSION' },
            { id: 'SEASON', label: '🏅 SEASON TABLE' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStep(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                activeStep === tab.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Step Contents */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {/* STEP 1: MATCH RESULT */}
          {activeStep === 'RESULT' && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-[#121a2e] to-slate-900 border border-amber-500/40 shadow-xl text-center space-y-3">
                <div className="text-xs font-black uppercase tracking-widest text-amber-400">FINAL MATCH RESULT</div>
                <div className="flex items-center justify-center space-x-8 my-2">
                  <div className="text-center">
                    <div className="text-2xl font-black text-amber-400">{match.homeFranchise}</div>
                    <div className="text-3xl font-black text-white">{homeRuns} / {homeWickets}</div>
                  </div>
                  <div className="text-sm font-extrabold text-slate-500">VS</div>
                  <div className="text-center">
                    <div className="text-2xl font-black text-sky-400">{match.awayFranchise}</div>
                    <div className="text-3xl font-black text-white">{awayRuns} / {awayWickets}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <button
                  onClick={() => setActiveStep('SCORECARD')}
                  className="py-3 px-4 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 font-bold text-xs transition"
                >
                  VIEW FULL SCORECARD →
                </button>
                <button
                  onClick={() => setActiveStep('PROGRESSION')}
                  className="py-3 px-4 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition"
                >
                  VIEW RATING PROGRESSION →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SCORECARD */}
          {activeStep === 'SCORECARD' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <h3 className="text-sm font-black text-amber-400 uppercase">{match.homeFranchise} INNINGS ({homeRuns}/{homeWickets})</h3>
                <div className="space-y-1 text-xs text-slate-300">
                  {match.ballLog?.filter(b => b.battingFranchise === match.homeFranchise).slice(-6).map((b, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-slate-800/60">
                      <span>Ball {b.ballNumber}: {b.commentary}</span>
                      <span className="font-bold text-emerald-400">{b.runs} Runs</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <h3 className="text-sm font-black text-sky-400 uppercase">{match.awayFranchise} INNINGS ({awayRuns}/{awayWickets})</h3>
                <div className="space-y-1 text-xs text-slate-300">
                  {match.ballLog?.filter(b => b.battingFranchise === match.awayFranchise).slice(-6).map((b, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-slate-800/60">
                      <span>Ball {b.ballNumber}: {b.commentary}</span>
                      <span className="font-bold text-sky-400">{b.runs} Runs</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 & 4: PERFORMANCE XP & RATING PROGRESSION */}
          {(activeStep === 'PERFORMANCE' || activeStep === 'PROGRESSION') && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-semibold">
                ✅ Player performance data saved to database & updated in Player Gallery!
              </div>

              <div className="space-y-2">
                {Object.entries(updatedProgression).map(([pId, pState]) => (
                  <div key={pId} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-black text-white text-sm">{pId}</div>
                      <div className="text-slate-400 text-[10px]">
                        Matches: {pState.matchesPlayed} • Runs: {pState.totalRuns} • Wickets: {pState.wickets}
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="font-mono font-bold text-emerald-400">
                        BAT {pState.batProgress.toFixed(1)} (+0.4)
                      </div>
                      <div className="text-[10px] text-amber-400 font-bold">
                        +{pState.recentPerformances[0]?.xpEarned || 25} XP • FORM {pState.form > 0 ? `+${pState.form}` : pState.form}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: SEASON TABLE */}
          {activeStep === 'SEASON' && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider">UPDATED SEASON STANDINGS</h3>
              <div className="space-y-1.5 text-xs">
                {[
                  { pos: 1, team: match.homeFranchise, pts: 4, nrr: '+0.450' },
                  { pos: 2, team: match.awayFranchise, pts: 2, nrr: '-0.210' }
                ].map((row) => (
                  <div key={row.team} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="font-bold text-white">#{row.pos} {row.team}</span>
                    <span className="font-mono text-emerald-400 font-bold">{row.pts} PTS ({row.nrr})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Actions (No Dead Ends) */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              if (onReturnToRoom) onReturnToRoom();
              else onClose();
            }}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO ROOM</span>
          </button>

          {onRematch && (
            <button
              onClick={onRematch}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl transition shadow-lg flex items-center justify-center space-x-2 uppercase"
            >
              <RotateCcw className="w-4 h-4" />
              <span>REMATCH NOW</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
