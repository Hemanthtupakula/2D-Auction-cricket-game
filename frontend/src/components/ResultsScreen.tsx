/**
 * Results gallery — real persisted data only (data/results/<ROOM>.json on the server).
 * Everyone in the room can open it from the main interface.
 *
 * Sections: 🏆 Achievements (tournament trophies with grand visuals),
 * 📋 Match history, ⭐ Player scorecards, 🛡 Team records.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { RoomResults } from '../types';
import * as api from '../services/api';
import { resolveTeamLogo, handleImageFallback } from '../services/mediaResolver';
import { X, Trophy } from 'lucide-react';

interface ResultsScreenProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'achievements' | 'matches' | 'players' | 'teams';

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ roomCode, isOpen, onClose }) => {
  const [results, setResults] = useState<RoomResults | null>(null);
  const [tab, setTab] = useState<Tab>('achievements');

  useEffect(() => {
    if (!isOpen) return;
    api.getResults(roomCode).then((r) => setResults(r)).catch(() => {});
  }, [isOpen, roomCode]);

  const sortedPlayers = useMemo(
    () => [...(results?.playerStats || [])].sort((a, b) => b.runs - a.runs || b.wickets - a.wickets),
    [results]
  );
  const sortedTeams = useMemo(
    () => [...(results?.teamStats || [])].sort((a, b) => b.trophies - a.trophies || b.won - a.won),
    [results]
  );

  if (!isOpen) return null;

  const empty = results != null && results.matches.length === 0 && results.achievements.length === 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-3xl max-h-[86vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Results</h2>
              <p className="text-[10px] text-slate-500">Every match, trophy and scorecard — real data, saved on the server</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3">
          {(
            [
              ['achievements', '🏆 Trophies'],
              ['matches', '📋 Matches'],
              ['players', '⭐ Scorecards'],
              ['teams', '🛡 Teams'],
            ] as Array<[Tab, string]>
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all ${
                tab === t ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {empty && (
            <div className="text-center py-12 text-slate-500 text-sm">
              No matches played yet — results appear here the moment a game finishes.
            </div>
          )}

          {/* 🏆 Achievements: tournament champions with grand trophy visuals */}
          {tab === 'achievements' &&
            (results?.achievements || []).map((a, i) => (
              <div
                key={i}
                className="rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 p-5 flex items-center gap-4 shadow-lg shadow-amber-500/10"
              >
                <div className="text-5xl animate-bounce" style={{ animationDuration: '2s' }}>🏆</div>
                <img src={resolveTeamLogo(a.team)} onError={handleImageFallback} className="w-14 h-14 rounded-2xl object-cover" alt="" />
                <div className="flex-1">
                  <div className="text-base font-black text-amber-300 uppercase tracking-wider">{a.team} — Tournament Champions</div>
                  <div className="text-[11px] text-slate-400">Season {a.seasonId} • {new Date(a.at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          {tab === 'achievements' && (results?.achievements || []).length === 0 && !empty && (
            <p className="text-center text-slate-500 text-xs py-8">No tournament trophies yet — finish a season to crown a champion.</p>
          )}

          {/* 📋 Match history */}
          {tab === 'matches' &&
            [...(results?.matches || [])].reverse().map((m) => (
              <div key={m.matchId} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-black">
                    <img src={resolveTeamLogo(m.homeFranchise)} onError={handleImageFallback} className="w-5 h-5 rounded" alt="" />
                    <span className={m.winnerFranchise === m.homeFranchise ? 'text-emerald-300' : 'text-slate-300'}>
                      {m.homeFranchise} {m.homeRuns}/{m.homeWickets}
                    </span>
                    <span className="text-slate-600 text-xs">vs</span>
                    <img src={resolveTeamLogo(m.awayFranchise)} onError={handleImageFallback} className="w-5 h-5 rounded" alt="" />
                    <span className={m.winnerFranchise === m.awayFranchise ? 'text-emerald-300' : 'text-slate-300'}>
                      {m.awayFranchise} {m.awayRuns}/{m.awayWickets}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {m.resultText} • {m.overs} overs{m.fixtureId ? ' • season fixture' : ' • mini match'} • {new Date(m.completedAt).toLocaleString()}
                  </div>
                </div>
                {m.winnerFranchise ? <span className="text-xl">🏅</span> : null}
              </div>
            ))}

          {/* ⭐ Player scorecards */}
          {tab === 'players' && (
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[9px] tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2">Player</th>
                    <th className="px-2 py-2">Team</th>
                    <th className="px-2 py-2">Mat</th>
                    <th className="px-2 py-2">Runs</th>
                    <th className="px-2 py-2">Wkts</th>
                    <th className="px-2 py-2">50s</th>
                    <th className="px-2 py-2">100s</th>
                    <th className="px-2 py-2">Best</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.map((p) => (
                    <tr key={p.playerId} className="border-t border-slate-800/60 hover:bg-slate-800/20">
                      <td className="px-3 py-2 font-bold text-white">{p.name}</td>
                      <td className="px-2 py-2 text-center">
                        <img src={resolveTeamLogo(p.team)} onError={handleImageFallback} className="w-4 h-4 rounded inline-block" alt="" />
                      </td>
                      <td className="px-2 py-2 text-center text-slate-400">{p.matches}</td>
                      <td className="px-2 py-2 text-center font-black text-emerald-300">{p.runs}</td>
                      <td className="px-2 py-2 text-center font-black text-red-300">{p.wickets}</td>
                      <td className="px-2 py-2 text-center text-slate-400">{p.fifties > 0 ? `🔥${p.fifties}` : '—'}</td>
                      <td className="px-2 py-2 text-center text-slate-400">{p.hundreds > 0 ? `💯${p.hundreds}` : '—'}</td>
                      <td className="px-2 py-2 text-center text-slate-400">{p.bestBowling > 0 ? `${p.bestBowling}w` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 🛡 Team records */}
          {tab === 'teams' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {sortedTeams.map((t) => (
                <div key={t.team} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={resolveTeamLogo(t.team)} onError={handleImageFallback} className="w-8 h-8 rounded-lg object-cover" alt="" />
                    <div>
                      <div className="text-sm font-black text-white">{t.team}</div>
                      <div className="text-[9px] text-slate-500">{t.trophies > 0 ? `🏆 ${t.trophies} trophy${t.trophies > 1 ? 's' : ''}` : 'no trophies yet'}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 space-y-1">
                    <div className="flex justify-between"><span>Record</span><span className="font-bold text-slate-200">{t.won}W – {t.lost}L ({t.played})</span></div>
                    <div className="flex justify-between"><span>Win rate</span><span className="font-bold text-emerald-300">{t.played > 0 ? Math.round((t.won / t.played) * 100) : 0}%</span></div>
                    <div className="flex justify-between"><span>Runs for/against</span><span className="font-bold text-slate-200">{t.runsFor}/{t.runsAgainst}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;
