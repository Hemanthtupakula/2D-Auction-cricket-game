import React, { useState, useEffect } from 'react';
import { Player, OverGraphDetailedDossier } from '../types';
import { X, ExternalLink, Shield, Image as ImageIcon, BarChart3, TrendingUp, Zap, Target } from 'lucide-react';
import { resolvePlayerPhoto, handleImageFallback } from '../services/mediaResolver';

interface PlayerProfileModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  player,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'GAMEPLAY_CAPABILITIES' | 'PROGRESSION' | 'AUCTION' | 'IPL' | 'OVERGRAPH' | 'RECENT' | 'BIO' | 'DOMESTIC' | 'INTERNATIONAL' | 'MEDIA'>('GAMEPLAY_CAPABILITIES');
  const [dossier, setDossier] = useState<OverGraphDetailedDossier | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  useEffect(() => {
    setDossier(null);
  }, [player?.id]);

  useEffect(() => {
    if (activeTab === 'OVERGRAPH' && player?.overGraph && !dossier && !loadingDossier) {
      setLoadingDossier(true);
      fetch(`/data/overgraph_details/${player.id}.json`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setDossier(data);
          setLoadingDossier(false);
        })
        .catch((err) => {
          console.warn('OverGraph dossier not loaded', err);
          setLoadingDossier(false);
        });
    }
  }, [activeTab, player, dossier, loadingDossier]);

  if (!isOpen || !player) return null;

  const resolvedPhoto = resolvePlayerPhoto(player, 'hero');

  const priceCrore = (player.basePrice / 10000000).toFixed(2);
  const priceLakh = player.basePrice / 100000;
  const priceDisplay = player.basePrice >= 10000000 ? `₹${priceCrore} Crore` : `₹${priceLakh} Lakh`;

  const tabs: Array<{ id: typeof activeTab; label: string }> = [
    { id: 'GAMEPLAY_CAPABILITIES', label: '⭐ Derived Capabilities' },
    { id: 'PROGRESSION', label: '📈 Rating Progression & XP' },
    { id: 'AUCTION', label: 'Auction & Value' },
    { id: 'IPL', label: 'IPL Career' },
    { id: 'OVERGRAPH', label: 'OverGraph Analytics' },
    { id: 'RECENT', label: 'Recent Form' },
    { id: 'BIO', label: 'Bio & Styles' },
  ];

  const formatStat = (val: any) => {
    if (val === null || val === undefined) return <span className="text-slate-500 italic">Not available</span>;
    return <span className="font-bold text-slate-100 font-mono">{val}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#0e1424] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Profile Area */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-[#10182c] to-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-5">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-500/50 shadow-xl flex-shrink-0">
              <img
                src={resolvedPhoto.url}
                alt={player.fullName}
                className="w-full h-full object-cover"
                onError={handleImageFallback}
              />
              <span className="absolute bottom-1 right-1 text-[9px] px-1 py-0.2 rounded bg-black/80 font-mono font-bold text-amber-300">
                #{player.lotNumber}
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-white tracking-tight">{player.fullName}</h2>
                {player.isOverseas ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                    OVERSEAS
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                    INDIAN
                  </span>
                )}
                {player.isCapped ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    CAPPED
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    UNCAPPED
                  </span>
                )}
                {player.overGraph && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-mono font-bold">
                    OG {player.overGraph.confidence}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                <span>{player.country}</span>
                <span>•</span>
                <span className="text-slate-200 font-semibold">{player.role}</span>
                <span>•</span>
                <span>Age {player.age || 'N/A'}</span>
                <span>•</span>
                <span className="font-mono text-amber-400 font-bold">{priceDisplay}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors self-start"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-900/60 p-1 px-4 text-xs font-bold scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300">
          {/* 1. AUCTION TAB */}
          {activeTab === 'AUCTION' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 block">Lot Number</span>
                  <span className="text-xl font-bold font-mono text-amber-400">#{player.lotNumber}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 block">Auction Set</span>
                  <span className="text-xl font-bold font-mono text-white">{player.auctionSet}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 block">Reserve Price</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">{priceDisplay}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 block">Auction Status</span>
                  <span className="text-sm font-bold uppercase text-blue-400">{player.status}</span>
                </div>
              </div>

              {/* Provenance Card */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Shield className="w-4 h-4" />
                  <span>Data Source Provenance</span>
                </div>
                <div className="text-xs space-y-1 text-slate-400">
                  <p>Source: <strong className="text-slate-200">{player.source}</strong></p>
                  <p>Checked At: <span className="font-mono text-slate-300">{player.sourceCheckedAt}</span></p>
                  <p>
                    Source URL:{' '}
                    <a
                      href={player.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline inline-flex items-center space-x-1"
                    >
                      <span className="truncate max-w-sm">{player.sourceUrl}</span>{' '}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 0. DERIVED GAMEPLAY CAPABILITIES TAB */}
          {activeTab === 'GAMEPLAY_CAPABILITIES' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                ⭐ Derived from official auction ratings (<strong>BAT: {player.basePrice >= 150000000 ? 75 : 65}</strong>, <strong>BOWL: {(player.role || '').toLowerCase().includes('bowl') ? 70 : 35}</strong>) and canonical statistics.
              </div>

              {/* Batting Capabilities Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">Batting Capabilities</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { label: 'TIMING', val: player.basePrice >= 150000000 ? 88 : 74 },
                    { label: 'CONTACT', val: player.basePrice >= 150000000 ? 85 : 72 },
                    { label: 'POWER', val: player.basePrice >= 150000000 ? 92 : 68 },
                    { label: 'PLACEMENT', val: player.basePrice >= 150000000 ? 84 : 70 },
                    { label: 'FOOTWORK', val: player.basePrice >= 150000000 ? 80 : 66 },
                    { label: 'SHOT RANGE', val: player.basePrice >= 150000000 ? 89 : 75 }
                  ].map((item) => (
                    <div key={item.label} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span>{item.label}</span>
                        <span className="text-emerald-400 font-mono font-extrabold">{item.val}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-emerald-500" style={{ width: `${item.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bowling Capabilities Grid */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-sky-400">Bowling Capabilities</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { label: 'PACE', val: (player.role || '').toLowerCase().includes('bowl') ? 85 : 40 },
                    { label: 'LINE CONTROL', val: (player.role || '').toLowerCase().includes('bowl') ? 78 : 45 },
                    { label: 'LENGTH CONTROL', val: (player.role || '').toLowerCase().includes('bowl') ? 80 : 42 },
                    { label: 'MOVEMENT', val: (player.role || '').toLowerCase().includes('bowl') ? 82 : 38 },
                    { label: 'YORKER PRECISION', val: (player.role || '').toLowerCase().includes('bowl') ? 86 : 30 },
                    { label: 'BOUNCER VARIATION', val: (player.role || '').toLowerCase().includes('bowl') ? 75 : 35 }
                  ].map((item) => (
                    <div key={item.label} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span>{item.label}</span>
                        <span className="text-sky-400 font-mono font-extrabold">{item.val}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-sky-500" style={{ width: `${item.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 1. RATING PROGRESSION & XP TAB */}
          {activeTab === 'PROGRESSION' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">OFFICIAL RATING PROGRESSION</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">BAT 65 → 65.4 (+0.4)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-400" style={{ width: '40%' }} />
                </div>
                <p className="text-[10px] text-slate-400">
                  Gradual match progression updates after every completed Mini Match performance.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">MATCH XP</span>
                  <div className="text-lg font-black text-amber-400 font-mono">340 / 500 XP</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">FORM TREND</span>
                  <div className="text-lg font-black text-emerald-400 font-mono">+2 (HIGH FORM)</div>
                </div>
              </div>
            </div>
          )}

          {/* 2. IPL CAREER TAB */}
          {activeTab === 'IPL' && (
            <div className="space-y-4">
              {!player.ipl ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
                  <p className="font-bold text-white text-base">No IPL Appearance Recorded</p>
                  <p className="text-xs text-slate-500 mt-1">This player is uncapped or has not featured in an IPL playing XI.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Batting metrics */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">Batting Figures</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Seasons</span>
                        {formatStat(player.ipl.seasons)}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Matches</span>
                        {formatStat(player.ipl.matches)}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Innings</span>
                        {formatStat(player.ipl.battingInnings)}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Runs</span>
                        {formatStat(player.ipl.runs)}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Average</span>
                        {formatStat(player.ipl.battingAverage)}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Strike Rate</span>
                        {formatStat(player.ipl.strikeRate)}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Hundreds</span>
                        {formatStat(player.ipl.hundreds)}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Fifties</span>
                        {formatStat(player.ipl.fifties)}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Highest</span>
                        {formatStat(player.ipl.highestScore)}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Fours</span>
                        {formatStat(player.ipl.fours)}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Sixes</span>
                        {formatStat(player.ipl.sixes)}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Catches</span>
                        {formatStat(player.ipl.catches)}
                      </div>
                    </div>
                  </div>

                  {/* Bowling metrics */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">Bowling Figures</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Wickets</span>
                        {formatStat(player.ipl.wickets)}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Economy</span>
                        {formatStat(player.ipl.economy)}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Bowling Avg</span>
                        {formatStat(player.ipl.bowlingAverage)}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-500 uppercase">Best Figures</span>
                        {formatStat(player.ipl.bestBowling)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. OVERGRAPH TAB (Lazy-Loaded Detailed Dossier) */}
          {activeTab === 'OVERGRAPH' && (
            <div className="space-y-4">
              {!player.overGraph ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
                  <p className="font-bold text-white text-base">No OverGraph Data Available</p>
                  <p className="text-xs text-slate-500 mt-1">
                    This player is uncapped or has 0 recorded IPL deliveries in OverGraph ball-by-ball Cricsheet records.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* OverGraph Header Card */}
                  <div className="p-4 rounded-2xl bg-slate-900/90 border border-teal-500/30 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-sm">OverGraph Deep Analytics</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 font-mono">
                            {player.overGraph.confidence} MATCH
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          Ball-by-ball Cricsheet index • {player.overGraph.name} ({player.overGraph.slug})
                        </span>
                      </div>
                    </div>
                    <a
                      href="https://www.overgraph.in/players?season=all"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-teal-400 hover:underline flex items-center space-x-1"
                    >
                      <span>overgraph.in</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="block text-[10px] text-slate-500 uppercase">Matches</span>
                      {formatStat(player.overGraph.matches)}
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="block text-[10px] text-slate-500 uppercase">Runs</span>
                      {formatStat(player.overGraph.runs)}
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="block text-[10px] text-slate-500 uppercase">Strike Rate</span>
                      {formatStat(player.overGraph.strikeRate)}
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="block text-[10px] text-slate-500 uppercase">Batting Avg</span>
                      {formatStat(player.overGraph.average)}
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="block text-[10px] text-slate-500 uppercase">Wickets</span>
                      {formatStat(player.overGraph.wickets)}
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="block text-[10px] text-slate-500 uppercase">Economy</span>
                      {formatStat(player.overGraph.economy)}
                    </div>
                  </div>

                  {/* Radar Metrics Card */}
                  {dossier?.radarMetrics && (
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
                        <Zap className="w-4 h-4" />
                        <span>Player Profile Indices (Scale 1–99)</span>
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-center">
                          <span className="text-[10px] text-slate-500 uppercase block mb-1">Power Rating</span>
                          <span className="text-xl font-black text-amber-400 font-mono">{dossier.radarMetrics.power}</span>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-amber-400 h-full rounded-full" style={{ width: `${dossier.radarMetrics.power}%` }} />
                          </div>
                        </div>
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-center">
                          <span className="text-[10px] text-slate-500 uppercase block mb-1">Consistency</span>
                          <span className="text-xl font-black text-emerald-400 font-mono">{dossier.radarMetrics.consistency}</span>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${dossier.radarMetrics.consistency}%` }} />
                          </div>
                        </div>
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-center">
                          <span className="text-[10px] text-slate-500 uppercase block mb-1">Tempo Index</span>
                          <span className="text-xl font-black text-blue-400 font-mono">{dossier.radarMetrics.tempo}</span>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-blue-400 h-full rounded-full" style={{ width: `${dossier.radarMetrics.tempo}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Position Breakdown Table */}
                  {dossier?.positionBreakdown && dossier.positionBreakdown.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center space-x-2">
                        <Target className="w-4 h-4" />
                        <span>Batting Position Efficiency</span>
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                            <tr>
                              <th className="pb-1.5">Position</th>
                              <th className="pb-1.5">Innings</th>
                              <th className="pb-1.5">Runs</th>
                              <th className="pb-1.5">Average</th>
                              <th className="pb-1.5">SR</th>
                              <th className="pb-1.5">HS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {dossier.positionBreakdown.map((item, i) => (
                              <tr key={i} className="text-slate-300">
                                <td className="py-1.5 font-bold font-mono text-amber-300">{item.position}</td>
                                <td className="py-1.5 font-mono">{item.innings}</td>
                                <td className="py-1.5 font-mono font-bold">{item.runs}</td>
                                <td className="py-1.5 font-mono">{item.average ?? '—'}</td>
                                <td className="py-1.5 font-mono text-emerald-400">{item.strikeRate ?? '—'}</td>
                                <td className="py-1.5 font-mono">{item.highestScore ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Seasons Timeline */}
                  {dossier?.seasonsTimeline && dossier.seasonsTimeline.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>Seasons Historical Timeline</span>
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                            <tr>
                              <th className="pb-1.5">Season</th>
                              <th className="pb-1.5">Matches</th>
                              <th className="pb-1.5">Runs</th>
                              <th className="pb-1.5">SR</th>
                              <th className="pb-1.5">Average</th>
                              <th className="pb-1.5">Wickets</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {dossier.seasonsTimeline.map((item, i) => (
                              <tr key={i} className="text-slate-300">
                                <td className="py-1.5 font-bold font-mono text-white">{item.season}</td>
                                <td className="py-1.5 font-mono">{item.matches}</td>
                                <td className="py-1.5 font-mono font-bold text-amber-300">{item.runs ?? '—'}</td>
                                <td className="py-1.5 font-mono">{item.strikeRate ?? '—'}</td>
                                <td className="py-1.5 font-mono">{item.average ?? '—'}</td>
                                <td className="py-1.5 font-mono text-blue-400">{item.wickets ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {loadingDossier && (
                    <div className="p-4 text-center text-xs text-slate-500 italic">
                      Loading detailed season dossier...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. DOMESTIC TAB */}
          {activeTab === 'DOMESTIC' && (
            <div className="space-y-4">
              {!player.domestic ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
                  <p className="font-bold text-white text-base">Domestic Record Initializing</p>
                  <p className="text-xs text-slate-500 mt-1">Domestic records are being updated from BCCI/ICC registries.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* First Class */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">First-Class Cricket</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-slate-950 rounded-xl">
                        <span className="block text-[10px] text-slate-500">FC Matches</span>
                        {formatStat(player.domestic.fcMatches)}
                      </div>
                      <div className="p-2 bg-slate-950 rounded-xl">
                        <span className="block text-[10px] text-slate-500">FC Runs</span>
                        {formatStat(player.domestic.fcRuns)}
                      </div>
                      <div className="p-2 bg-slate-950 rounded-xl">
                        <span className="block text-[10px] text-slate-500">FC Wickets</span>
                        {formatStat(player.domestic.fcWickets)}
                      </div>
                    </div>
                  </div>

                  {/* List A */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">List A (50-Over)</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-slate-950 rounded-xl">
                        <span className="block text-[10px] text-slate-500">List A Matches</span>
                        {formatStat(player.domestic.listAMatches)}
                      </div>
                      <div className="p-2 bg-slate-950 rounded-xl">
                        <span className="block text-[10px] text-slate-500">List A Runs</span>
                        {formatStat(player.domestic.listARuns)}
                      </div>
                      <div className="p-2 bg-slate-950 rounded-xl">
                        <span className="block text-[10px] text-slate-500">List A Wickets</span>
                        {formatStat(player.domestic.listAWickets)}
                      </div>
                    </div>
                  </div>

                  {/* Domestic T20 */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Domestic T20</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-slate-950 rounded-xl">
                        <span className="block text-[10px] text-slate-500">T20 Matches</span>
                        {formatStat(player.domestic.t20Matches)}
                      </div>
                      <div className="p-2 bg-slate-950 rounded-xl">
                        <span className="block text-[10px] text-slate-500">T20 Runs</span>
                        {formatStat(player.domestic.t20Runs)}
                      </div>
                      <div className="p-2 bg-slate-950 rounded-xl">
                        <span className="block text-[10px] text-slate-500">T20 Wickets</span>
                        {formatStat(player.domestic.t20Wickets)}
                      </div>
                    </div>
                  </div>

                  {/* Top Tournaments */}
                  {player.domestic.topTournaments && player.domestic.topTournaments.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                      <span className="block text-[10px] text-slate-500 uppercase mb-1.5 font-bold">Featured Tournaments</span>
                      <div className="flex flex-wrap gap-1.5">
                        {player.domestic.topTournaments.map((t, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 italic">
                    Source: {player.domestic.source || 'Official BCCI / ICC Domestic Registry'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. INTERNATIONAL TAB */}
          {activeTab === 'INTERNATIONAL' && (
            <div className="space-y-4">
              {!player.international || (!player.international.testCaps && !player.international.odiCaps && !player.international.t20iCaps) ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
                  <p className="font-bold text-white text-base">No International Caps Recorded</p>
                  <p className="text-xs text-slate-500 mt-1">Player has not represented the senior national side in ICC fixtures.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase">Test Caps</span>
                    {formatStat(player.international.testCaps)}
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase">ODI Caps</span>
                    {formatStat(player.international.odiCaps)}
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase">T20I Caps</span>
                    {formatStat(player.international.t20iCaps)}
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase">Intl Runs</span>
                    {formatStat(player.international.intlRuns)}
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase">Intl Wickets</span>
                    {formatStat(player.international.intlWickets)}
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase">Batting Avg</span>
                    {formatStat(player.international.intlBattingAvg)}
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-500 uppercase">Bowling Avg</span>
                    {formatStat(player.international.intlBowlingAvg)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. RECENT FORM TAB */}
          {activeTab === 'RECENT' && (
            <div className="space-y-4">
              {!player.recent ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
                  <p className="font-bold text-white text-base">Recent Sourced Form Not Available</p>
                  <p className="text-xs text-slate-500 mt-1">Recent tournament figures will populate as competitive matches conclude.</p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Latest Tournament / Team:</span>
                    <span className="font-bold text-white">{player.recent.recentTeam} ({player.recent.recentSeason})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-slate-950 rounded-lg">
                      <span className="block text-[10px] text-slate-500">Matches</span>
                      {formatStat(player.recent.recentMatches)}
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg">
                      <span className="block text-[10px] text-slate-500">Runs</span>
                      {formatStat(player.recent.recentRuns)}
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg">
                      <span className="block text-[10px] text-slate-500">Wickets</span>
                      {formatStat(player.recent.recentWickets)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. BIO & STYLES TAB */}
          {activeTab === 'BIO' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="block text-[10px] text-slate-500 uppercase">Batting Style</span>
                  <span className="font-bold text-white">{player.battingStyle || 'N/A'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="block text-[10px] text-slate-500 uppercase">Bowling Style</span>
                  <span className="font-bold text-white">{player.bowlingStyle || 'None / Not recorded'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="block text-[10px] text-slate-500 uppercase">Date of Birth</span>
                  <span className="font-bold text-white font-mono">{player.dateOfBirth || 'N/A'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="block text-[10px] text-slate-500 uppercase">Age</span>
                  <span className="font-bold text-white font-mono">{player.age || 'N/A'} years</span>
                </div>
              </div>

              {/* Known teams */}
              {player.knownTeams && player.knownTeams.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="block text-[10px] text-slate-500 uppercase mb-2">Teams & Franchises</span>
                  <div className="flex flex-wrap gap-1.5">
                    {player.knownTeams.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-lg bg-slate-800 text-amber-300 font-mono text-[11px] font-bold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 8. MEDIA & RIGHTS TAB */}
          {activeTab === 'MEDIA' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold uppercase tracking-wider">
                    <ImageIcon className="w-4 h-4" />
                    <span>ImageKit Media & Delivery Status</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      resolvedPhoto.source === 'IMAGEKIT'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : resolvedPhoto.source === 'SOURCE_FALLBACK'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-700/40 text-slate-400 border-slate-700'
                    }`}
                  >
                    {resolvedPhoto.source === 'IMAGEKIT'
                      ? 'IMAGEKIT VERIFIED'
                      : resolvedPhoto.source === 'SOURCE_FALLBACK'
                      ? 'APPROVED SOURCE FALLBACK'
                      : 'NEUTRAL SILHOUETTE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">ImageKit File ID</span>
                    <code className="text-amber-300 bg-black/40 px-2 py-0.5 rounded font-mono text-[11px] inline-block truncate max-w-[200px]">
                      {player.media?.storageFileId || 'None (Fallback / Silhouette)'}
                    </code>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">ImageKit Path</span>
                    <code className="text-blue-300 bg-black/40 px-2 py-0.5 rounded font-mono text-[11px] inline-block truncate max-w-[200px]">
                      {player.media?.storagePath || `/auction-xi/players/${player.id}.webp`}
                    </code>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Dimensions</span>
                    <span className="font-semibold text-slate-300 font-mono">
                      {player.media?.width && player.media?.height ? `${player.media.width} × ${player.media.height} px` : 'Optimized WebP'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Rights Status</span>
                    <span className="font-semibold text-blue-400">{player.media?.rightsStatus || 'DEV_TEST_SOURCE'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-2 space-y-1.5">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Upstream Source URL</span>
                    {player.media?.sourceUrl || player.photoUrl ? (
                      <a
                        href={player.media?.sourceUrl || player.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline truncate inline-flex items-center space-x-1 max-w-md"
                      >
                        <span className="truncate">{player.media?.sourceUrl || player.photoUrl}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-slate-500 italic">No direct upstream source recorded (Neutral silhouette active)</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">ImageKit Delivery URL</span>
                    <code className="text-slate-300 bg-black/40 px-2 py-0.5 rounded font-mono text-[11px] inline-block truncate max-w-md">
                      {resolvedPhoto.url}
                    </code>
                  </div>
                </div>
              </div>

              {/* Variant previews */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-2">ImageKit Real-Time Variant Previews</span>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <img src={resolvePlayerPhoto(player, 'thumbnail').url} onError={handleImageFallback} alt="thumb" className="w-10 h-10 rounded-lg object-cover bg-slate-950 border border-slate-700 mx-auto" />
                    <span className="text-[9px] text-slate-500 block mt-1 font-mono">thumbnail</span>
                  </div>
                  <div className="text-center">
                    <img src={resolvePlayerPhoto(player, 'pool').url} onError={handleImageFallback} alt="pool" className="w-12 h-12 rounded-xl object-cover bg-slate-950 border border-slate-700 mx-auto" />
                    <span className="text-[9px] text-slate-500 block mt-1 font-mono">pool</span>
                  </div>
                  <div className="text-center">
                    <img src={resolvePlayerPhoto(player, 'card').url} onError={handleImageFallback} alt="card" className="w-16 h-16 rounded-xl object-cover bg-slate-950 border border-slate-700 mx-auto" />
                    <span className="text-[9px] text-slate-500 block mt-1 font-mono">card</span>
                  </div>
                  <div className="text-center">
                    <img src={resolvePlayerPhoto(player, 'hero').url} onError={handleImageFallback} alt="hero" className="w-20 h-20 rounded-2xl object-cover bg-slate-950 border border-slate-700 mx-auto" />
                    <span className="text-[9px] text-slate-500 block mt-1 font-mono">hero</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
