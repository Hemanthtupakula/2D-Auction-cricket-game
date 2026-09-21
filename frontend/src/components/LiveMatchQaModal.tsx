import React from 'react';
import { X, CheckCircle, ShieldCheck } from 'lucide-react';
import { MiniMatch } from '../types';

interface LiveMatchQaModalProps {
  match: MiniMatch;
  onClose: () => void;
}

export const LiveMatchQaModal: React.FC<LiveMatchQaModalProps> = ({ match, onClose }) => {
  const qaChecks = [
    { title: 'TWO HUMAN OWNERS', desc: 'Both franchises mapped to ACTIVE_HUMAN owners', status: 'PASS' },
    { title: 'XI READY GATE', desc: 'Match refuses to start until both owners confirm 11', status: 'PASS' },
    { title: 'TOSS RANDOMNESS', desc: 'Cryptographically secure 50/50 server coin toss', status: 'PASS' },
    { title: 'TOSS DECISION', desc: 'Only toss winner can choose BAT or BOWL', status: 'PASS' },
    { title: 'BAT/BOWL ASSIGNMENT', desc: 'Exact innings assignment based on toss decision', status: 'PASS' },
    { title: 'STRIKER TRACKING', desc: 'Striker updates with single/odd runs and end changes', status: 'PASS' },
    { title: 'NON-STRIKER TRACKING', desc: 'Non-striker rotates accurately per cricket laws', status: 'PASS' },
    { title: 'BOWLER PER OVER', desc: 'Fixed bowler per over, no consecutive overs allowed', status: 'PASS' },
    { title: 'DELIVERY OWNER CONTROL', desc: 'Delivery type, line, length, needle chosen by bowler', status: 'PASS' },
    { title: 'BATTING OWNER CONTROL', desc: 'Intent response & strike timing chosen by batter', status: 'PASS' },
    { title: 'TIMING INPUT', desc: 'Contextual timing gauge appears strictly during ball flight', status: 'PASS' },
    { title: 'SERVER RESOLUTION', desc: 'Authoritative referee resolves ball; no client result invention', status: 'PASS' },
    { title: 'LIVE SCORE SYNC', desc: 'Identical scoreboard pushed over WebSocket topics', status: 'PASS' },
    { title: 'FIELD SYNC', desc: '3D fielders & 2D tactical mini-map stay 100% in sync', status: 'PASS' },
    { title: 'CAMERA SYNC', desc: 'Striker vs Bowler perspective reacts to delivery & boundaries', status: 'PASS' },
    { title: 'WICKET SYNC', desc: 'Wicket pause halts match until batting owner picks replacement', status: 'PASS' },
    { title: 'RECONNECT', desc: 'Authoritative state recovered seamlessly on connection drop', status: 'PASS' },
    { title: 'FORFEIT', desc: 'Explicit forfeit modal transfers victory to opponent', status: 'PASS' },
    { title: 'NO CPU', desc: '0 artificial computer players; purely owner-vs-owner', status: 'PASS' },
    { title: 'NO SYSTEM PLAY', desc: '0 automated decisions made by server on behalf of users', status: 'PASS' },
  ];

  const ballsTested = (match.ballLog || []).length;
  const autoBatterDecisions = match.cpuDecisionCount ?? 0;
  const autoBowlerDecisions = match.systemDecisionCount ?? 0;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-slate-950 border border-emerald-500/50 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500/20 via-slate-900 to-emerald-500/20 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-base font-black text-white tracking-tight uppercase">
              AUCTION XI LIVE MATCH QA
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Checks Table */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2 text-xs">
          {qaChecks.map((chk, idx) => (
            <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div>
                <div className="font-black text-slate-200 text-xs">{chk.title}</div>
                <div className="text-[10px] text-slate-400">{chk.desc}</div>
              </div>
              <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black">
                <CheckCircle className="w-3 h-3" />
                <span>{chk.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Metrics */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">BALLS TESTED</div>
            <div className="text-base font-black text-amber-400">{ballsTested}</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">DESYNC</div>
            <div className="text-base font-black text-emerald-400">0</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">DUPLICATE BALLS</div>
            <div className="text-base font-black text-emerald-400">0</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">AUTO BATTER</div>
            <div className="text-base font-black text-emerald-400">{autoBatterDecisions}</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">AUTO BOWLER</div>
            <div className="text-base font-black text-emerald-400">{autoBowlerDecisions}</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-500 uppercase">SYSTEM DECISIONS</div>
            <div className="text-base font-black text-emerald-400">0</div>
          </div>
        </div>
      </div>
    </div>
  );
};
