import React, { useEffect, useMemo, useState } from 'react';
import { RoomStateSnapshot, SeasonSnapshot, SeasonFixture } from '../types';
import * as api from '../services/api';
import { AuctionEventMessage } from '../services/websocket';
import { resolveTeamLogo, handleImageFallback } from '../services/mediaResolver';
import { PlayoffBracket } from './PlayoffBracket';
import { ChampionCeremony } from './ChampionCeremony';
import { X, Trophy, Play, CalendarRange, ListOrdered } from 'lucide-react';

interface SeasonScreenProps {
  roomCode: string;
  currentMemberId: string;
  snapshot: RoomStateSnapshot;
  isOpen: boolean;
  onClose: () => void;
  lastEvent: AuctionEventMessage | null;
  onOpenMatch: (matchId: string, fixtureLabel: string) => void;
}

const formatOvers = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

export const SeasonScreen: React.FC<SeasonScreenProps> = ({
  roomCode,
  currentMemberId,
  snapshot,
  isOpen,
  onClose,
  lastEvent,
  onOpenMatch,
}) => {
  const [season, setSeason] = useState<SeasonSnapshot | null>(null);
  const [doubleRR, setDoubleRR] = useState(false);
  const [seasonOvers, setSeasonOvers] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCeremony, setShowCeremony] = useState(false);

  const isHost = snapshot.hostMemberId === currentMemberId;

  // Host can restart the season — after the tournament or mid-tournament
  const handleRestartSeason = async () => {
    if (!window.confirm('Restart the season? All fixtures, points and the champion will be cleared.')) return;
    setBusy(true);
    setError(null);
    try {
      await api.restartSeason(roomCode, currentMemberId);
      setSeason(null);
      setShowCeremony(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restart failed');
    } finally {
      setBusy(false);
    }
  };

  // Per-team season stats (computed client-side from completed fixtures)
  const teamStats = useMemo(() => {
    if (!season) return [] as Array<{ code: string; runsFor: number; runsAgainst: number; bestWinRuns: number; wins: number }>;
    const m: Record<string, { runsFor: number; runsAgainst: number; bestWinRuns: number; wins: number }> = {};
    for (const t of season.teams) m[t] = { runsFor: 0, runsAgainst: 0, bestWinRuns: 0, wins: 0 };
    for (const f of season.fixtures) {
      if (f.status !== 'COMPLETED' || f.homeRuns == null || f.awayRuns == null) continue;
      const h = m[f.homeFranchise];
      const a = m[f.awayFranchise];
      if (h) { h.runsFor += f.homeRuns; h.runsAgainst += f.awayRuns; }
      if (a) { a.runsFor += f.awayRuns; a.runsAgainst += f.homeRuns; }
      if (f.winnerFranchise) {
        const w = m[f.winnerFranchise];
        if (w) {
          w.wins += 1;
          const margin = Math.abs(f.homeRuns - f.awayRuns);
          if (margin > w.bestWinRuns) w.bestWinRuns = margin;
        }
      }
    }
    return season.teams.map((code) => ({ code, ...m[code] }));
  }, [season]);

  useEffect(() => {
    if (!isOpen) return;
    api.getSeason(roomCode).then((s) => {
      if (s) setSeason(s);
    }).catch(() => {});
  }, [isOpen, roomCode]);

  useEffect(() => {
    if (!isOpen || !lastEvent) return;
    if (lastEvent.eventType === 'SEASON_RESTARTED') {
      setSeason(null);
      setShowCeremony(false);
      return;
    }
    if (
      lastEvent.eventType === 'SEASON_STARTED' ||
      lastEvent.eventType === 'SEASON_UPDATED' ||
      lastEvent.eventType === 'SEASON_TABLE_UPDATED' ||
      lastEvent.eventType === 'SEASON_BRACKET_UPDATED'
    ) {
      setSeason(lastEvent.payload as SeasonSnapshot);
    } else if (lastEvent.eventType === 'SEASON_CHAMPION_DECLARED') {
      setSeason(lastEvent.payload as SeasonSnapshot);
      setShowCeremony(true);
    }
  }, [lastEvent, isOpen]);

  const humanTeamCount = useMemo(
    () => Object.values(snapshot.franchises || {}).filter((f) => f.active).length,
    [snapshot]
  );

  const handleStartSeason = async () => {
    setBusy(true);
    setError(null);
    try {
      setSeason(await api.startSeason(roomCode, currentMemberId, doubleRR, seasonOvers));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start season');
    } finally {
      setBusy(false);
    }
  };

  const handleStartFixture = async (fixture: SeasonFixture) => {
    setBusy(true);
    setError(null);
    try {
      const match = await api.startFixtureMatch(roomCode, fixture.fixtureId, currentMemberId);
      onOpenMatch(match.matchId, fixture.label);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start fixture');
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  const playoffFixtures = season?.fixtures.filter((f) => f.stage === 'PLAYOFF') || [];

  const canStartFixture = (f: SeasonFixture) => {
    if (f.status !== 'PENDING') return false;
    if (isHost) return true;
    const home = snapshot.franchises?.[f.homeFranchise];
    const away = snapshot.franchises?.[f.awayFranchise];
    return [home?.ownerMemberId, away?.ownerMemberId].includes(currentMemberId);
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-[#0a101f] border border-slate-700/60 rounded-3xl w-full max-w-5xl max-h-[94vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[#0a101f]/95 backdrop-blur border-b border-slate-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white tracking-tight">Season Mode</h2>
            {season && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                season.stage === 'COMPLETED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : season.stage === 'PLAYOFFS' ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              }`}>
                {season.stage}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {season && isHost && (
              <button
                onClick={handleRestartSeason}
                disabled={busy}
                className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-[10px] font-black hover:bg-red-500/25 transition-colors"
                title="Restart season (clears fixtures, points, champion)"
              >
                ↺ RESTART
              </button>
            )}
            {season?.stage === 'COMPLETED' && season.championFranchise && (
              <button
                onClick={() => setShowCeremony(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 transition-colors"
              >
                🏆 Ceremony
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!season ? (
          <div className="p-8 max-w-lg mx-auto space-y-5 text-center">
            <CalendarRange className="w-12 h-12 text-amber-400 mx-auto" />
            <h3 className="text-2xl font-black text-white">Turn the auction into a season</h3>
            <p className="text-sm text-slate-400">
              Round-robin league between every human-owned franchise, then playoffs and a Final —
              all played as fast 2-over mini matches with your real squads.
            </p>
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-300">
              <div>• {humanTeamCount} human teams detected → {humanTeamCount < 2 ? 'need at least 2' : `${(humanTeamCount * (humanTeamCount - 1)) / 2} league matches`}</div>
              <div>• 2 teams → league decides the champion</div>
              <div>• 3 teams → #1 vs #2 Final</div>
              <div>• 4+ teams → full IPL playoff bracket</div>
            </div>
            {isHost && (
              <label className="flex items-center justify-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={doubleRR}
                  onChange={(e) => setDoubleRR(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-500"
                />
                <span>Double round robin (home & away)</span>
              </label>
            )}
            {error && <p className="text-red-400 text-xs font-semibold">{error}</p>}
            {isHost ? (
              <>
                            <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Overs per match</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[2, 5, 10, 20].map((o) => (
                    <button key={o} onClick={() => setSeasonOvers(o)}
                      className={`py-2 rounded-lg text-xs font-black border transition-all ${seasonOvers === o ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'}`}>
                      {o} ov
                    </button>
                  ))}
                </div>
              </div>
<button
                onClick={handleStartSeason}
                disabled={busy || humanTeamCount < 2}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 disabled:opacity-40 disabled:pointer-events-none hover:brightness-110 transition-all"
              >
                <Play className="w-4 h-4" />
                <span>{busy ? 'Starting...' : 'START SEASON'}</span>
              </button>
            </>
            ) : (
              <p className="text-xs text-slate-500">Only the host can start Season Mode.</p>
            )}
          </div>
        ) : (
          <div className="p-5 space-y-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
              <h4 className="font-black text-white text-sm flex items-center space-x-2 mb-3">
                <ListOrdered className="w-4 h-4 text-blue-400" />
                <span>Points Table</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 text-left border-b border-slate-800">
                      <th className="pb-2 font-bold">#</th>
                      <th className="pb-2 font-bold">Team</th>
                      <th className="pb-2 font-bold text-center">P</th>
                      <th className="pb-2 font-bold text-center">W</th>
                      <th className="pb-2 font-bold text-center">L</th>
                      <th className="pb-2 font-bold text-center">NRR</th>
                      <th className="pb-2 font-bold text-center">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {season.pointsTable.map((row, i) => {
                      const inPlayoffZone = season.teams.length >= 4 ? i < 4 : season.teams.length === 3 ? i < 2 : i < 1;
                      return (
                        <tr key={row.franchise} className={`border-b border-slate-800/50 ${inPlayoffZone ? 'bg-emerald-500/5' : ''}`}>
                          <td className="py-2 text-slate-500 font-mono">{i + 1}</td>
                          <td className="py-2">
                            <div className="flex items-center space-x-2">
                              <img src={resolveTeamLogo(row.franchise)} alt="" className="w-5 h-5 rounded-full object-cover" onError={handleImageFallback} />
                              <span className="font-bold text-white">{row.franchise}</span>
                              {inPlayoffZone && <span className="text-[9px] text-emerald-400 font-black">Q</span>}
                            </div>
                          </td>
                          <td className="py-2 text-center text-slate-300">{row.played}</td>
                          <td className="py-2 text-center text-emerald-400 font-bold">{row.won}</td>
                          <td className="py-2 text-center text-red-400">{row.lost}</td>
                          <td className="py-2 text-center font-mono text-slate-300">{row.nrr > 0 ? '+' : ''}{row.nrr.toFixed(2)}</td>
                          <td className="py-2 text-center font-black text-amber-300">{row.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {playoffFixtures.length > 0 && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
                <h4 className="font-black text-white text-sm mb-3">Playoff Bracket</h4>
                <PlayoffBracket fixtures={season.fixtures} />
              </div>
            )}

            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
              <h4 className="font-black text-white text-sm mb-3">Fixtures</h4>
              {error && <p className="text-red-400 text-xs font-semibold mb-2">{error}</p>}
              <div className="space-y-1.5">
                {season.fixtures.map((f) => (
                  <div
                    key={f.fixtureId}
                    className={`flex items-center space-x-3 rounded-xl border px-3 py-2.5 text-xs transition-all ${
                      f.status === 'IN_PROGRESS'
                        ? 'bg-red-500/10 border-red-500/40'
                        : f.status === 'COMPLETED'
                        ? 'bg-slate-900/60 border-slate-800'
                        : 'bg-slate-950/50 border-slate-800/60'
                    }`}
                  >
                    <span className="w-24 flex-shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-500">{f.label}</span>
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <img src={resolveTeamLogo(f.homeFranchise)} alt="" className="w-5 h-5 rounded-full object-cover" onError={handleImageFallback} />
                      <span className={`font-black ${f.winnerFranchise === f.homeFranchise ? 'text-amber-300' : 'text-slate-200'}`}>{f.homeFranchise}</span>
                      <span className="text-slate-600">vs</span>
                      <span className={`font-black ${f.winnerFranchise === f.awayFranchise ? 'text-amber-300' : 'text-slate-200'}`}>{f.awayFranchise}</span>
                      <img src={resolveTeamLogo(f.awayFranchise)} alt="" className="w-5 h-5 rounded-full object-cover" onError={handleImageFallback} />
                    </div>
                    {f.status === 'COMPLETED' && (
                      <span className="text-slate-500 font-mono text-[10px] truncate max-w-[220px]" title={f.resultText || ''}>
                        {f.homeRuns} ({formatOvers(f.homeBalls)}) — {f.awayRuns} ({formatOvers(f.awayBalls)})
                      </span>
                    )}
                    {f.status === 'IN_PROGRESS' && f.matchId && (
                      <button
                        onClick={() => onOpenMatch(f.matchId!, f.label)}
                        className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-black animate-pulse"
                      >
                        WATCH LIVE
                      </button>
                    )}
                    {f.status === 'PENDING' && (
                      <button
                        onClick={() => handleStartFixture(f)}
                        disabled={!canStartFixture(f) || busy}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        PLAY ▶
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {season.stage === 'COMPLETED' && season.championFranchise && (
              <button
                onClick={() => setShowCeremony(true)}
                className="w-full rounded-3xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border border-amber-500/50 p-5 text-center hover:from-amber-500/30 hover:to-amber-500/30 transition-all"
              >
                <div className="text-2xl">🏆</div>
                <div className="font-black text-amber-300 text-xl">{season.championFranchise} — SEASON CHAMPIONS</div>
                <div className="text-[11px] text-slate-400">Tap to replay the ceremony</div>
              </button>
            )}
          </div>
        )}
      </div>

                  {/* Team performance stats across the season */}
            {season && teamStats.some((t) => t.runsFor > 0 || t.wins > 0) && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">📊 Team Stats (season totals)</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {teamStats.map((t) => (
                    <div key={t.code} className="rounded-xl bg-slate-950/60 border border-slate-800 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <img src={resolveTeamLogo(t.code)} onError={handleImageFallback} className="w-5 h-5 rounded" alt="" />
                        <span className="text-xs font-black text-white">{t.code}</span>
                        <span className="text-[10px] font-black text-emerald-400 ml-auto">{t.wins}W</span>
                      </div>
                      <div className="text-[10px] text-slate-400 space-y-0.5">
                        <div>Runs scored: <span className="text-slate-200 font-bold">{t.runsFor}</span></div>
                        <div>Conceded: <span className="text-slate-200 font-bold">{t.runsAgainst}</span></div>
                        <div>Biggest win: <span className="text-emerald-300 font-bold">{t.bestWinRuns > 0 ? `+${t.bestWinRuns} runs` : '—'}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showCeremony && season?.championFranchise && (
        <ChampionCeremony
          champion={season.championFranchise}
          runnerUp={season.runnerUpFranchise || '—'}
          awards={season.awards || {}}
          onClose={() => setShowCeremony(false)}
        />
      )}
    </div>
  );
};
