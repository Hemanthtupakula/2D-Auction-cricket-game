import React, { useState } from 'react';
import { X, Trophy, ListOrdered, BarChart2, Shield } from 'lucide-react';

interface ScorecardProps {
  isOpen: boolean;
  onClose: () => void;
  match: any;
  ballLog: any[];
}

export const MiniMatchScorecardDrawer: React.FC<ScorecardProps> = ({
  isOpen,
  onClose,
  match,
  ballLog
}) => {
  const [activeTab, setActiveTab] = useState<'SCORECARD' | 'COMMENTARY' | 'STATS'>('SCORECARD');

  if (!isOpen || !match) return null;

  const homeXi = match.homeXi || [];
  const awayXi = match.awayXi || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-700 h-full flex flex-col text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-lg text-amber-300 tracking-wide uppercase">
              Match Scorecard & Stats
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Match Overview Bar */}
        <div className="px-6 py-3 bg-slate-800/60 border-b border-slate-700/50 flex items-center justify-between text-sm font-semibold text-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold">{match.homeFranchise}</span>
            <span>{match.homeRuns}/{match.homeWickets} ({ (match.homeBalls / 6).toFixed(1) } ov)</span>
          </div>
          <span className="text-slate-500 font-bold">vs</span>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">{match.awayFranchise}</span>
            <span>{match.awayRuns}/{match.awayWickets} ({ (match.awayBalls / 6).toFixed(1) } ov)</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-900">
          <button
            onClick={() => setActiveTab('SCORECARD')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'SCORECARD'
                ? 'border-amber-400 text-amber-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-4 h-4" /> Scorecard
          </button>
          <button
            onClick={() => setActiveTab('COMMENTARY')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'COMMENTARY'
                ? 'border-amber-400 text-amber-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" /> Commentary
          </button>
          <button
            onClick={() => setActiveTab('STATS')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition ${
              activeTab === 'STATS'
                ? 'border-amber-400 text-amber-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-4 h-4" /> Match Stats
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'SCORECARD' && (
            <div className="space-y-6">
              {/* Home Batting */}
              <div>
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>{match.homeFranchise} Batting</span>
                  <span className="text-slate-400 text-xs font-normal">
                    {match.homeRuns}/{match.homeWickets} ({ (match.homeBalls / 6).toFixed(1) } Overs)
                  </span>
                </h3>
                <div className="bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Batter</th>
                        <th className="py-2.5 px-2 text-right">R</th>
                        <th className="py-2.5 px-2 text-right">B</th>
                        <th className="py-2.5 px-2 text-right">4s</th>
                        <th className="py-2.5 px-2 text-right">6s</th>
                        <th className="py-2.5 px-3 text-right">SR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {homeXi.map((p: any) => {
                        const r = match.runsByPlayer?.[p.id] || 0;
                        const b = match.ballsFacedByPlayer?.[p.id] || 0;
                        const fours = match.foursByPlayer?.[p.id] || 0;
                        const sixes = match.sixesByPlayer?.[p.id] || 0;
                        const sr = b > 0 ? ((r / b) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={p.id} className="hover:bg-slate-800/30">
                            <td className="py-2 px-3 font-medium text-slate-200">{p.fullName}</td>
                            <td className="py-2 px-2 text-right font-bold text-amber-300">{r}</td>
                            <td className="py-2 px-2 text-right text-slate-400">{b}</td>
                            <td className="py-2 px-2 text-right text-slate-400">{fours}</td>
                            <td className="py-2 px-2 text-right text-slate-400">{sixes}</td>
                            <td className="py-2 px-3 text-right font-mono text-cyan-300">{sr}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Away Batting */}
              <div>
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>{match.awayFranchise} Batting</span>
                  <span className="text-slate-400 text-xs font-normal">
                    {match.awayRuns}/{match.awayWickets} ({ (match.awayBalls / 6).toFixed(1) } Overs)
                  </span>
                </h3>
                <div className="bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Batter</th>
                        <th className="py-2.5 px-2 text-right">R</th>
                        <th className="py-2.5 px-2 text-right">B</th>
                        <th className="py-2.5 px-2 text-right">4s</th>
                        <th className="py-2.5 px-2 text-right">6s</th>
                        <th className="py-2.5 px-3 text-right">SR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {awayXi.map((p: any) => {
                        const r = match.runsByPlayer?.[p.id] || 0;
                        const b = match.ballsFacedByPlayer?.[p.id] || 0;
                        const fours = match.foursByPlayer?.[p.id] || 0;
                        const sixes = match.sixesByPlayer?.[p.id] || 0;
                        const sr = b > 0 ? ((r / b) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={p.id} className="hover:bg-slate-800/30">
                            <td className="py-2 px-3 font-medium text-slate-200">{p.fullName}</td>
                            <td className="py-2 px-2 text-right font-bold text-cyan-300">{r}</td>
                            <td className="py-2 px-2 text-right text-slate-400">{b}</td>
                            <td className="py-2 px-2 text-right text-slate-400">{fours}</td>
                            <td className="py-2 px-2 text-right text-slate-400">{sixes}</td>
                            <td className="py-2 px-3 text-right font-mono text-cyan-300">{sr}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'COMMENTARY' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Ball-by-Ball Commentary Log
              </h3>
              {(!ballLog || ballLog.length === 0) ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No balls bowled yet in this match.
                </div>
              ) : (
                [...ballLog].reverse().map((b: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 flex items-start gap-3 text-xs"
                  >
                    <span className="font-mono font-bold text-amber-400 bg-slate-800 px-2 py-1 rounded">
                      {b.overNumber}.{b.ballInOver}
                    </span>
                    <div className="flex-1">
                      <p className="text-slate-200 font-medium">{b.commentary}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                        <span>Batter: {b.batterName}</span>
                        <span>•</span>
                        <span>Bowler: {b.bowlerName}</span>
                        {b.shot && <span>• Shot: {b.shot}</span>}
                        {b.deliveryType && <span>• Ball: {b.deliveryType}</span>}
                      </div>
                    </div>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        b.wicket
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : b.runs === 6
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : b.runs === 4
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {b.wicket ? 'W' : b.runs}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'STATS' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-300 text-sm">Match Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 block">Total Overs</span>
                    <span className="font-bold text-slate-200 text-base">{match.overs} Overs</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Status</span>
                    <span className="font-bold text-amber-400 text-base">{match.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Toss Winner</span>
                    <span className="font-bold text-slate-200">{match.tossWinnerFranchise || 'Pending'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Toss Decision</span>
                    <span className="font-bold text-slate-200">{match.tossDecision || 'Pending'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
