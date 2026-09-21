import React, { useMemo, useRef, useState } from 'react';
import { AllocationState, RoomStateSnapshot, FranchiseAuctionState, Player } from '../types';
import { X, Trophy, TrendingUp, PieChart, Star, Award, Download, AlertTriangle } from 'lucide-react';
import { resolvePlayerPhoto, resolveTeamLogo, handleImageFallback } from '../services/mediaResolver';

interface TeamAnalysisProps {
  state?: AllocationState;
  snapshot?: RoomStateSnapshot;
  isOpen: boolean;
  onClose: () => void;
  initialFranchiseCode?: string;
  currentMemberId?: string;
  onSelectPlayerProfile?: (player: Player) => void;
}

// =========================================================================
// Phase 5, Section 6.1 — player ratings (mirror of backend PlayerRatings)
// =========================================================================

const num = (v: unknown, fb: number): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : fb;
  }
  return fb;
};

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const normalize = (x: number, lo: number, hi: number) => clamp((x - lo) / (hi - lo), 0, 1) * 100;

function iplOf(p: Player): Record<string, unknown> {
  return (p.ipl || {}) as unknown as Record<string, unknown>;
}

export function battingRating(p: Player): number {
  const ipl = iplOf(p);
  const runs = num(ipl['runs'], 0);
  const sr = num(ipl.strikeRate, 120);
  const avg = num(ipl['average'] ?? ipl['battingAverage'], 25);

  const volumeScore = normalize(runs, 100, 4500);
  const avgScore = normalize(avg, 18, 48);
  const srScore = normalize(sr, 110, 170);

  let raw = 0.35 * volumeScore + 0.35 * srScore + 0.30 * avgScore;
  if (runs >= 2000) raw += 6;
  if (sr >= 145) raw += 4;
  return clamp(raw, 5, 99);
}

export function bowlingRating(p: Player): number {
  const ipl = iplOf(p);
  const wickets = num(ipl['wickets'], 0);
  if (wickets <= 0) return 15;
  const econ = num(ipl['economy'], 9);
  const matches = Math.max(1, num(ipl['matches'], 1));
  return clamp(0.60 * normalize(11 - econ, 0, 5) + 0.40 * normalize(wickets / matches, 0, 1.2), 5, 99);
}

export function impactScore(p: Player): number {
  const bat = battingRating(p);
  const bowl = bowlingRating(p);
  const role = (p.role || '').toLowerCase();
  if (role.includes('all')) return clamp(0.5 * bat + 0.5 * bowl + 4, 5, 99);
  if (role.includes('bowl')) return clamp(0.3 * bat + 0.7 * bowl, 5, 99);
  return clamp(0.8 * bat + 0.2 * bowl, 5, 99);
}

/** Greedy Best XI by impact score, overseas-≤4 rule, role balance (WK + 3 bowling-capable). */
export function selectBestXi(squad: Player[]): Player[] {
  const sorted = [...squad].sort((a, b) => impactScore(b) - impactScore(a));
  const xiSize = Math.min(11, sorted.length);
  const xi: Player[] = [];
  let overseas = 0;
  for (const p of sorted) {
    if (xi.length >= xiSize) break;
    if (p.isOverseas && overseas >= 4) continue;
    xi.push(p);
    if (p.isOverseas) overseas++;
  }
  const roleOf = (p: Player) => (p.role || '').toLowerCase();
  if (!xi.some((p) => roleOf(p).includes('wicket'))) {
    const keeper = sorted.find((p) => roleOf(p).includes('wicket') && !xi.includes(p) && (!p.isOverseas || xi.filter((x) => x.isOverseas).length < 4));
    if (keeper && xi.length > 0) {
      const weakest = [...xi].sort((x, y) => impactScore(x) - impactScore(y))[0];
      xi.splice(xi.indexOf(weakest), 1, keeper);
    }
  }
  let bowlingCapable = xi.filter((p) => bowlingRating(p) > 30).length;
  if (bowlingCapable < 3) {
    for (const p of sorted) {
      if (bowlingCapable >= 3) break;
      if (xi.includes(p) || bowlingRating(p) <= 30) continue;
      if (p.isOverseas && xi.filter((x) => x.isOverseas).length >= 4) continue;
      const weakest = [...xi].filter((x) => bowlingRating(x) <= 30).sort((x, y) => impactScore(x) - impactScore(y))[0];
      if (!weakest) break;
      xi.splice(xi.indexOf(weakest), 1, p);
      bowlingCapable++;
    }
  }
  return xi;
}

/** Team Rating 0–100: batting strength, bowling strength, squad balance. */
function teamRating(squad: Player[]): number {
  if (squad.length === 0) return 0;
  const xi = selectBestXi(squad);
  if (xi.length === 0) return 0;
  const avgBat = xi.reduce((s, p) => s + battingRating(p), 0) / xi.length;
  const avgBowl = xi.reduce((s, p) => s + bowlingRating(p), 0) / xi.length;
  const roles = new Set(squad.map((p) => (p.role || '').toLowerCase()));
  let balance = 0;
  if ([...roles].some((r) => r.includes('bat'))) balance += 30;
  if ([...roles].some((r) => r.includes('bowl'))) balance += 30;
  if ([...roles].some((r) => r.includes('all'))) balance += 20;
  if ([...roles].some((r) => r.includes('wicket'))) balance += 20;
  const depthBonus = clamp(squad.length / 18, 0, 1) * 10;
  return Math.round(clamp(0.42 * avgBat + 0.33 * avgBowl + 0.25 * (balance + depthBonus) * (100 / 110), 0, 100));
}

const formatCr = (lakhs: number) => `₹${(lakhs / 100).toFixed(2)} Cr`;

const DEFAULT_FRANCHISES = [
  { code: 'CSK', name: 'Chennai Super Kings' },
  { code: 'MI', name: 'Mumbai Indians' },
  { code: 'RCB', name: 'Royal Challengers Bengaluru' },
  { code: 'KKR', name: 'Kolkata Knight Riders' },
  { code: 'SRH', name: 'Sunrisers Hyderabad' },
  { code: 'DC', name: 'Delhi Capitals' },
  { code: 'PBKS', name: 'Punjab Kings' },
  { code: 'RR', name: 'Rajasthan Royals' },
  { code: 'GT', name: 'Gujarat Titans' },
  { code: 'LSG', name: 'Lucknow Super Giants' },
];

const ROLE_COLORS: Record<string, string> = {
  batter: '#38bdf8',
  bowler: '#f472b6',
  'all-rounder': '#fbbf24',
  wicketkeeper: '#34d399',
  other: '#94a3b8',
};

function roleBucket(role: string): string {
  const r = (role || '').toLowerCase();
  if (r.includes('all')) return 'all-rounder';
  if (r.includes('wicket')) return 'wicketkeeper';
  if (r.includes('bowl')) return 'bowler';
  if (r.includes('bat')) return 'batter';
  return 'other';
}

export const TeamAnalysis: React.FC<TeamAnalysisProps> = ({
  state,
  snapshot,
  isOpen,
  onClose,
  initialFranchiseCode,
  currentMemberId,
  onSelectPlayerProfile,
}) => {
  const [selectedCode, setSelectedCode] = useState<string>(initialFranchiseCode || '');
  const [compareMode, setCompareMode] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  const franchises = useMemo<FranchiseAuctionState[]>(() => {
    if (snapshot && snapshot.franchises && Object.keys(snapshot.franchises).length > 0) {
      return Object.values(snapshot.franchises).sort((a, b) => {
        const aU = a.ownerMemberId === currentMemberId;
        const bU = b.ownerMemberId === currentMemberId;
        if (aU && !bU) return -1;
        if (!aU && bU) return 1;
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return a.franchiseCode.localeCompare(b.franchiseCode);
      });
    }
    if (state && state.seats && state.seats.length > 0) {
      return state.seats.map((s) => ({
        franchiseCode: s.code,
        franchiseName: s.name,
        ownerMemberId: s.ownerMemberId,
        ownerDisplayName: s.ownerDisplayName || (s.isHuman ? 'Human Member' : 'Unclaimed'),
        active: s.isHuman,
        purseLakhs: 10000,
        spentLakhs: 0,
        squad: [] as Player[],
        squadSize: 0,
        overseasCount: 0,
      }));
    }
    return DEFAULT_FRANCHISES.map((d) => ({
      franchiseCode: d.code,
      franchiseName: d.name,
      ownerMemberId: null,
      ownerDisplayName: 'Unclaimed',
      active: false,
      purseLakhs: 10000,
      spentLakhs: 0,
      squad: [] as Player[],
      squadSize: 0,
      overseasCount: 0,
    }));
  }, [snapshot, state, currentMemberId]);

  const selected = useMemo(
    () => franchises.find((f) => f.franchiseCode === selectedCode) || franchises[0],
    [franchises, selectedCode]
  );

  const completedLots = useMemo(() => snapshot?.completedLots || [], [snapshot]);

  const selectedAnalytics = useMemo(() => {
    if (!selected) return null;
    const squad = selected.squad || [];
    const buys = completedLots
      .filter((l) => l.phase === 'SOLD' && l.highestBidderFranchise === selected.franchiseCode)
      .sort((a, b) => a.lotNumber - b.lotNumber);
    let cum = 0;
    const timeline = buys.map((l) => {
      cum += l.currentBidLakhs;
      return { lot: l.lotNumber, cumSpent: cum, price: l.currentBidLakhs, name: l.player?.fullName || '' };
    });
    const bestXi = selectBestXi(squad);
    const rating = teamRating(squad);
    const roleCounts: Record<string, number> = {};
    squad.forEach((p) => {
      const b = roleBucket(p.role);
      roleCounts[b] = (roleCounts[b] || 0) + 1;
    });
    return { buys, timeline, bestXi, rating, roleCounts };
  }, [selected, completedLots]);

  const comparison = useMemo(() => {
    return franchises
      .filter((f) => f.active)
      .map((f) => {
        const buys = completedLots.filter((l) => l.phase === 'SOLD' && l.highestBidderFranchise === f.franchiseCode);
        const biggest = buys.reduce<number>((m, l) => Math.max(m, l.currentBidLakhs), 0);
        return {
          code: f.franchiseCode,
          name: f.franchiseName,
          owner: f.ownerDisplayName || '',
          rating: teamRating(f.squad || []),
          spent: f.spentLakhs,
          biggestBuy: biggest,
          players: (f.squad || []).length,
        };
      })
      .sort((a, b) => b.rating - a.rating);
  }, [franchises, completedLots]);

  const donutSegments = useMemo(() => {
    const a = selectedAnalytics;
    if (!a) return [] as Array<{ role: string; count: number; frac: number; offset: number }>;
    const total = Object.values(a.roleCounts).reduce((x, y) => x + y, 0) || 1;
    let offset = 0;
    return Object.entries(a.roleCounts).map(([role, count]) => {
      const frac = count / total;
      const seg = { role, count, frac, offset };
      offset += frac;
      return seg;
    });
  }, [selectedAnalytics]);

  if (!isOpen) return null;

  const a = selectedAnalytics;
  const spent = selected?.spentLakhs ?? 0;
  const purse = selected?.purseLakhs ?? 10000;
  const spentPct = clamp((spent / (spent + purse || 10000)) * 100, 0, 100);
  const overseasHeavy = (selected?.overseasCount ?? 0) >= 8;
  const timelineMax = a && a.timeline.length > 0 ? a.timeline[a.timeline.length - 1].cumSpent : 1;

  // 5.8 shareable squad card (client-side canvas PNG, no server round trip)
  const handleShareCard = async () => {
    if (!selected || !a) return;
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const grad = ctx.createLinearGradient(0, 0, 900, 1200);
    grad.addColorStop(0, '#0b1120');
    grad.addColorStop(1, '#111c33');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 1200);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 44px Arial';
    ctx.fillText(selected.franchiseCode, 60, 90);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 26px Arial';
    ctx.fillText(selected.franchiseName, 60, 130);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 20px Arial';
    ctx.fillText(`Owner: ${selected.ownerDisplayName || '—'}   •   Spent ${formatCr(spent)} / ₹100 Cr   •   Team Rating ${a.rating}/100`, 60, 170);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 24px Arial';
    ctx.fillText('BEST XI (auto)', 60, 230);
    ctx.font = '600 21px Arial';
    a.bestXi.forEach((p, i) => {
      ctx.fillStyle = i < 4 ? '#f8fafc' : '#cbd5e1';
      const tag = p.isOverseas ? ' ✈' : '';
      ctx.fillText(`${i + 1}. ${p.fullName}${tag}  —  ${p.role}`, 60, 275 + i * 40);
      ctx.fillStyle = '#64748b';
      ctx.font = '600 16px Arial';
      ctx.fillText(`BAT ${Math.round(battingRating(p))}  BOWL ${Math.round(bowlingRating(p))}`, 620, 275 + i * 40);
      ctx.font = '600 21px Arial';
    });
    ctx.fillStyle = '#475569';
    ctx.font = '600 16px Arial';
    ctx.fillText('Auction XI — Squad Card', 60, 1150);
    const link = document.createElement('a');
    link.download = `${selected.franchiseCode}-squad-card.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-[#0b1120] border border-slate-700/60 rounded-3xl w-full max-w-6xl max-h-[94vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0b1120]/95 backdrop-blur border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-black text-white tracking-tight">Team Analysis</h2>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Post-Auction Breakdown</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                compareMode ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
            >
              {compareMode ? '← Squad View' : 'Compare Teams'}
            </button>
            <button onClick={onClose} className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Franchise selector pills */}
        <div className="px-5 pt-4 flex flex-wrap gap-2">
          {franchises.map((f) => (
            <button
              key={f.franchiseCode}
              onClick={() => { setSelectedCode(f.franchiseCode); setCompareMode(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all flex items-center space-x-1.5 ${
                selected?.franchiseCode === f.franchiseCode && !compareMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : f.active
                  ? 'bg-slate-900 text-slate-200 border-slate-700 hover:border-slate-500'
                  : 'bg-slate-950 text-slate-600 border-slate-800/60'
              }`}
            >
              <img src={resolveTeamLogo(f.franchiseCode)} alt="" className="w-4 h-4 rounded-full object-cover" onError={handleImageFallback} />
              <span>{f.franchiseCode}</span>
              {f.ownerMemberId === currentMemberId && <Star className="w-3 h-3 text-amber-300" fill="currentColor" />}
            </button>
          ))}
        </div>

        {compareMode ? (
          /* 5.7 CROSS-TEAM COMPARISON */
          <div className="p-5 space-y-4">
            <h3 className="text-lg font-black text-white flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Who Actually Won the Auction?</span>
            </h3>
            {comparison.length === 0 && <p className="text-slate-500 text-sm">No active human teams yet.</p>}
            {comparison.map((t, rank) => (
              <div key={t.code} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-sm ${rank === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                      {rank + 1}
                    </span>
                    <img src={resolveTeamLogo(t.code)} alt="" className="w-8 h-8 rounded-full object-cover" onError={handleImageFallback} />
                    <div>
                      <div className="font-black text-white">{t.code}</div>
                      <div className="text-[11px] text-slate-500">{t.owner}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-amber-300 text-lg">{t.rating}<span className="text-xs text-slate-500">/100</span></div>
                    <div className="text-[11px] text-slate-500">{t.players} players • {formatCr(t.spent)} spent</div>
                  </div>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-700" style={{ width: `${t.rating}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Spend: <span className="text-slate-200 font-bold">{formatCr(t.spent)}</span></span>
                  <span>Biggest buy: <span className="text-slate-200 font-bold">{formatCr(t.biggestBuy)}</span></span>
                </div>
              </div>
            ))}
          </div>
        ) : selected && a ? (
          <div className="p-5 space-y-5" ref={shareRef}>
            {/* 5.1 Header card */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-900 border border-slate-700/60 rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-5">
              <img src={resolveTeamLogo(selected.franchiseCode)} alt={selected.franchiseCode} className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700 shadow-xl" onError={handleImageFallback} />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <h3 className="text-2xl font-black text-white">{selected.franchiseCode}</h3>
                  {selected.active ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">{selected.ownerDisplayName}</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[10px] font-bold">UNCLAIMED</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{selected.franchiseName}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span className="text-slate-400">Purse spent</span>
                    <span className="text-amber-300">{formatCr(spent)} <span className="text-slate-500">/ ₹100 Cr</span></span>
                  </div>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full" style={{ width: `${spentPct}%` }} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-800/70 rounded-2xl px-4 py-3">
                  <div className="text-xl font-black text-white">{(selected.squad || []).length}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Players</div>
                </div>
                <div className={`rounded-2xl px-4 py-3 ${overseasHeavy ? 'bg-red-500/15 border border-red-500/40' : 'bg-slate-800/70'}`}>
                  <div className={`text-xl font-black ${overseasHeavy ? 'text-red-300' : 'text-white'}`}>{selected.overseasCount}/8</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center space-x-1">
                    {overseasHeavy && <AlertTriangle className="w-3 h-3 text-red-400" />}
                    <span>Overseas</span>
                  </div>
                </div>
                <div className="bg-slate-800/70 rounded-2xl px-4 py-3">
                  <div className="text-xl font-black text-amber-300">{a.rating}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Rating</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* 5.2 Squad composition donut */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
                <h4 className="font-black text-white text-sm flex items-center space-x-2 mb-4">
                  <PieChart className="w-4 h-4 text-blue-400" />
                  <span>Squad Composition</span>
                </h4>
                <div className="flex items-center gap-6">
                  <svg width="130" height="130" viewBox="0 0 42 42" className="flex-shrink-0">
                    <circle cx="21" cy="21" r="15.915" fill="none" stroke="#1e293b" strokeWidth="6" />
                    {donutSegments.map((seg) => (
                      <circle
                        key={seg.role}
                        cx="21" cy="21" r="15.915" fill="none"
                        stroke={ROLE_COLORS[seg.role] || ROLE_COLORS.other}
                        strokeWidth="6"
                        strokeDasharray={`${seg.frac * 100} ${100 - seg.frac * 100}`}
                        strokeDashoffset={`${25 - seg.offset * 100}`}
                      />
                    ))}
                    <text x="21" y="21" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="8" fontWeight="900">
                      {(selected.squad || []).length}
                    </text>
                  </svg>
                  <div className="space-y-1.5">
                    {donutSegments.map((seg) => (
                      <div key={seg.role} className="flex items-center space-x-2 text-xs">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ROLE_COLORS[seg.role] || ROLE_COLORS.other }} />
                        <span className="text-slate-300 font-semibold capitalize">{seg.role}</span>
                        <span className="text-slate-500 font-mono">×{seg.count}</span>
                      </div>
                    ))}
                    {donutSegments.length === 0 && <p className="text-slate-600 text-xs">No players bought yet.</p>}
                  </div>
                </div>
              </div>

              {/* 5.3 Spend timeline */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
                <h4 className="font-black text-white text-sm flex items-center space-x-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Spend Timeline (cumulative)</span>
                </h4>
                {a.timeline.length === 0 ? (
                  <p className="text-slate-600 text-xs">No purchases yet.</p>
                ) : (
                  <svg viewBox="0 0 300 110" className="w-full h-28">
                    <polyline
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="2.5"
                      points={a.timeline.map((t, i) => {
                        const x = a.timeline.length === 1 ? 150 : (i / (a.timeline.length - 1)) * 290 + 5;
                        const y = 105 - (t.cumSpent / timelineMax) * 95;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                    {a.timeline.map((t, i) => {
                      const x = a.timeline.length === 1 ? 150 : (i / (a.timeline.length - 1)) * 290 + 5;
                      const y = 105 - (t.cumSpent / timelineMax) * 95;
                      return <circle key={i} cx={x} cy={y} r="3" fill="#fbbf24"><title>{`${t.name} — ${formatCr(t.price)}`}</title></circle>;
                    })}
                  </svg>
                )}
              </div>
            </div>

            {/* 5.5 + 5.6 Best XI & rating */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-white text-sm flex items-center space-x-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span>Auto-Suggested Best XI</span>
                  <span className="text-[10px] font-bold text-slate-500">(overseas ≤ 4 enforced)</span>
                </h4>
                <button
                  onClick={handleShareCard}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Share Squad Card</span>
                </button>
              </div>
              {a.bestXi.length === 0 ? (
                <p className="text-slate-600 text-xs">Squad is empty.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {a.bestXi.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => onSelectPlayerProfile?.(p)}
                      className="flex items-center space-x-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-xl px-3 py-2 text-left transition-colors"
                    >
                      <span className="w-5 text-[11px] font-black text-slate-500 font-mono">{i + 1}</span>
                      <img src={resolvePlayerPhoto(p, 'card').url} alt="" className="w-8 h-8 rounded-lg object-cover bg-slate-700" onError={handleImageFallback} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{p.fullName} {p.isOverseas && <span className="text-blue-400">✈</span>}</div>
                        <div className="text-[10px] text-slate-500">{p.role}</div>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 text-right">
                        <div>BAT {Math.round(battingRating(p))}</div>
                        <div>BOWL {Math.round(bowlingRating(p))}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 5.4 Full buy list */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5">
              <h4 className="font-black text-white text-sm mb-3">Full Buy List</h4>
              {a.buys.length === 0 ? (
                <p className="text-slate-600 text-xs">No purchases yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 text-left border-b border-slate-800">
                        <th className="pb-2 font-bold">Lot</th>
                        <th className="pb-2 font-bold">Player</th>
                        <th className="pb-2 font-bold">Role</th>
                        <th className="pb-2 font-bold">Country</th>
                        <th className="pb-2 font-bold text-right">Price</th>
                        <th className="pb-2 font-bold text-right">vs Base</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.buys.map((l) => {
                        const ratio = l.basePriceLakhs > 0 ? l.currentBidLakhs / l.basePriceLakhs : 0;
                        return (
                          <tr key={l.lotNumber} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                            <td className="py-2 text-slate-500 font-mono">#{l.lotNumber}</td>
                            <td className="py-2">
                              <button onClick={() => l.player && onSelectPlayerProfile?.(l.player)} className="flex items-center space-x-2 hover:text-blue-300 text-white font-semibold">
                                {l.player && (
                                  <img src={resolvePlayerPhoto(l.player, 'card').url} alt="" className="w-6 h-6 rounded object-cover bg-slate-700" onError={handleImageFallback} />
                                )}
                                <span>{l.player?.fullName || '—'}</span>
                              </button>
                            </td>
                            <td className="py-2 text-slate-400">{l.player?.role}</td>
                            <td className="py-2 text-slate-400">{l.player?.country}</td>
                            <td className="py-2 text-right font-bold text-amber-300">{formatCr(l.currentBidLakhs)}</td>
                            <td className="py-2 text-right">
                              {ratio <= 1.5 ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">VALUE PICK</span>
                              ) : ratio >= 4 ? (
                                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold">OVERPAY</span>
                              ) : (
                                <span className="text-slate-500 font-mono">{ratio.toFixed(1)}×</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
