import React from 'react';
import { MiniMatch, MatchAuditEvent } from '../types';
import { ShieldAlert, X, Activity, User, Server } from 'lucide-react';

interface LiveMatchDebugPanelProps {
  match: MiniMatch;
  onClose: () => void;
}

export const LiveMatchDebugPanel: React.FC<LiveMatchDebugPanelProps> = ({ match, onClose }) => {
  const matchAny = match as any;
  const homeCode = match.homeFranchise || matchAny.franchiseA || 'CSK';
  const awayCode = match.awayFranchise || matchAny.franchiseB || 'MI';
  const currentInnings = match.innings || matchAny.currentInnings || 1;
  const battingCode = match.battingFranchise || (currentInnings === 1 ? homeCode : awayCode);
  const bowlingCode = match.bowlingFranchise || (currentInnings === 1 ? awayCode : homeCode);

  const runs = currentInnings === 1 ? (match.homeRuns ?? 0) : (match.awayRuns ?? 0);
  const wkts = currentInnings === 1 ? (match.homeWickets ?? 0) : (match.awayWickets ?? 0);
  const balls = currentInnings === 1 ? (match.homeBalls ?? 0) : (match.awayBalls ?? 0);
  const overFormatted = `${Math.floor(balls / 6)}.${balls % 6}`;

  const striker = match.playerNames?.[match.currentStrikerId || ''] || match.currentStrikerId || 'Waiting...';
  const nonStriker = match.playerNames?.[match.currentNonStrikerId || ''] || match.currentNonStrikerId || 'Waiting...';
  const bowler = match.playerNames?.[match.currentBowlerId || ''] || match.currentBowlerId || 'Waiting...';

  const humanCount = match.humanActionCount ?? 0;
  const serverCount = match.serverRuleActionCount ?? 0;
  const systemDecisions = match.systemDecisionCount ?? 0;
  const cpuDecisions = match.cpuDecisionCount ?? 0;

  const events: MatchAuditEvent[] = match.auditTrail || [];
  const recentEvents = events.slice(-30).reverse();

  return (
    <div className="fixed top-16 right-4 z-[90] w-96 max-w-[95vw] bg-slate-950/95 border border-amber-500/50 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden font-mono text-xs text-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span className="font-black tracking-wider text-amber-300 uppercase text-[11px]">
            AUCTION XI LIVE DEBUG
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Match Telemetry Box */}
      <div className="p-3 bg-slate-900/80 border-b border-slate-800 space-y-1.5 text-[11px]">
        <div className="flex justify-between border-b border-slate-800/80 pb-1">
          <span className="text-slate-400 font-bold">MATCH:</span>
          <span className="font-black text-amber-400">M-{match.matchId}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] pb-1 border-b border-slate-800/80">
          <div><span className="text-slate-500">OWNER A:</span> <b className="text-yellow-400">{homeCode}</b></div>
          <div><span className="text-slate-500">OWNER B:</span> <b className="text-sky-400">{awayCode}</b></div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] pb-1 border-b border-slate-800/80">
          <div><span className="text-slate-500">INNINGS:</span> <b>{currentInnings}</b></div>
          <div><span className="text-slate-500">SCORE:</span> <b className="text-emerald-400">{battingCode} {runs}/{wkts}</b></div>
        </div>
        <div className="flex justify-between text-[10px] pb-1 border-b border-slate-800/80">
          <span className="text-slate-500">OVER:</span>
          <span className="font-bold text-white">{overFormatted} / {match.overs || 2} ov</span>
        </div>
        <div className="space-y-0.5 text-[10px] pb-1 border-b border-slate-800/80">
          <div><span className="text-slate-500">STRIKER:</span> <b className="text-emerald-300">{striker}</b></div>
          <div><span className="text-slate-500">NON-STRIKER:</span> <b className="text-slate-300">{nonStriker}</b></div>
          <div><span className="text-slate-500">BOWLER:</span> <b className="text-amber-300">{bowler}</b></div>
        </div>
        <div className="flex justify-between text-[10px] pb-1 border-b border-slate-800/80">
          <span className="text-slate-500">CURRENT STATE:</span>
          <span className="font-black text-purple-400">{match.status}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div><span className="text-slate-500">BATTER OWNER:</span> <b className="text-emerald-400">{battingCode}</b></div>
          <div><span className="text-slate-500">BOWLER OWNER:</span> <b className="text-amber-400">{bowlingCode}</b></div>
        </div>
      </div>

      {/* Control Audit Counters */}
      <div className="px-3 py-2 bg-slate-950 grid grid-cols-2 gap-1.5 border-b border-slate-800 text-[10px]">
        <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2 py-1 rounded">
          <User className="w-3 h-3 text-emerald-400" />
          <span className="text-slate-400">HUMAN:</span>
          <b className="text-white ml-auto">{humanCount}</b>
        </div>
        <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2 py-1 rounded">
          <Server className="w-3 h-3 text-blue-400" />
          <span className="text-slate-400">SERVER:</span>
          <b className="text-white ml-auto">{serverCount}</b>
        </div>
        <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2 py-1 rounded">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span className="text-slate-400">SYSTEM:</span>
          <b className={`ml-auto ${systemDecisions === 0 ? 'text-emerald-400 font-black' : 'text-red-400'}`}>{systemDecisions}</b>
        </div>
        <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2 py-1 rounded">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span className="text-slate-400">CPU:</span>
          <b className={`ml-auto ${cpuDecisions === 0 ? 'text-emerald-400 font-black' : 'text-red-400'}`}>{cpuDecisions}</b>
        </div>
      </div>

      {/* LAST EVENTS Stream */}
      <div className="p-3">
        <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-1.5 flex items-center justify-between">
          <span>LAST EVENTS (REALTIME)</span>
          <span className="text-[9px] text-slate-500 font-normal">{events.length} total</span>
        </div>
        <div className="max-h-56 overflow-y-auto space-y-1 divide-y divide-slate-900 pr-1">
          {recentEvents.length === 0 ? (
            <div className="text-slate-600 text-center py-4 text-[10px]">Awaiting owner interactions...</div>
          ) : (
            recentEvents.map((evt, idx) => {
              const isOwner = evt.actor.startsWith('OWNER');
              return (
                <div key={idx} className="pt-1 flex items-start space-x-2 text-[10px]">
                  <span className="text-slate-500 font-mono text-[9px] w-12 flex-shrink-0">{evt.timestamp}</span>
                  <span className={`font-black flex-shrink-0 w-16 truncate ${
                    isOwner ? (evt.actor.includes('OWNER_A') ? 'text-yellow-400' : 'text-sky-400') : 'text-indigo-400'
                  }`}>
                    {evt.actor}
                  </span>
                  <span className="text-slate-300 font-medium truncate flex-1" title={evt.action}>
                    {evt.action}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
