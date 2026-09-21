import React from 'react';
import { Player } from '../types';

interface AuctionScreenKeyStatsProps {
  player: Player | null;
}

export const AuctionScreenKeyStats: React.FC<AuctionScreenKeyStatsProps> = ({ player }) => {
  if (!player) return null;

  const ipl = player.ipl;

  if (!ipl) {
    return (
      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-center">
        <span className="text-xs font-semibold text-slate-400 italic">
          No IPL career appearance recorded • Debut Player
        </span>
      </div>
    );
  }

  const role = player.role;

  return (
    <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 space-y-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 pb-1.5">
        <span>Verified IPL Career Metrics</span>
        <span className="text-amber-400 font-mono">{role}</span>
      </div>

      {role === 'Batter' && (
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center text-xs">
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Matches</span>
            <span className="font-bold text-white font-mono">{ipl.matches ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Runs</span>
            <span className="font-bold text-amber-400 font-mono">{ipl.runs ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Avg</span>
            <span className="font-bold text-white font-mono">{ipl.battingAverage ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">SR</span>
            <span className="font-bold text-emerald-400 font-mono">{ipl.strikeRate ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">50s</span>
            <span className="font-bold text-white font-mono">{ipl.fifties ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">100s</span>
            <span className="font-bold text-amber-300 font-mono">{ipl.hundreds ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">HS</span>
            <span className="font-bold text-white font-mono">{ipl.highestScore ?? 'N/A'}</span>
          </div>
        </div>
      )}

      {role === 'Bowler' && (
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Matches</span>
            <span className="font-bold text-white font-mono">{ipl.matches ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Wickets</span>
            <span className="font-bold text-blue-400 font-mono">{ipl.wickets ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Economy</span>
            <span className="font-bold text-emerald-400 font-mono">{ipl.economy ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Bowl SR</span>
            <span className="font-bold text-white font-mono">{ipl.bowlingStrikeRate ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Best</span>
            <span className="font-bold text-amber-400 font-mono">{ipl.bestBowling ?? 'N/A'}</span>
          </div>
        </div>
      )}

      {role === 'All-Rounder' && (
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Matches</span>
            <span className="font-bold text-white font-mono">{ipl.matches ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Runs</span>
            <span className="font-bold text-amber-400 font-mono">{ipl.runs ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Bat SR</span>
            <span className="font-bold text-emerald-400 font-mono">{ipl.strikeRate ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Wickets</span>
            <span className="font-bold text-blue-400 font-mono">{ipl.wickets ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Economy</span>
            <span className="font-bold text-white font-mono">{ipl.economy ?? 'N/A'}</span>
          </div>
        </div>
      )}

      {role === 'Wicketkeeper' && (
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Matches</span>
            <span className="font-bold text-white font-mono">{ipl.matches ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Runs</span>
            <span className="font-bold text-amber-400 font-mono">{ipl.runs ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Strike Rate</span>
            <span className="font-bold text-emerald-400 font-mono">{ipl.strikeRate ?? 'N/A'}</span>
          </div>
          <div className="p-1.5 bg-slate-950 rounded-lg">
            <span className="block text-[9px] text-slate-500">Dismissals</span>
            <span className="font-bold text-blue-400 font-mono">
              {((ipl.catches || 0) + (ipl.stumpings || 0)) || 'N/A'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
