import React from 'react';
import { MatchBall } from '../types';
import { X, PlayCircle, ShieldCheck, Target, Crosshair } from 'lucide-react';

interface BallReplayDebugModalProps {
  ball: MatchBall | null;
  onClose: () => void;
}

export const BallReplayDebugModal: React.FC<BallReplayDebugModalProps> = ({ ball, onClose }) => {
  if (!ball) return null;

  const delivery = ball.deliveryType || 'PACE';
  const line = ball.line || 'MIDDLE';
  const length = ball.length || 'GOOD';
  const shot = ball.shot || 'STRAIGHT';
  const timing = ball.timing || ball.shotIntent || 'PERFECT';
  const outcome = ball.outcome;
  const runs = ball.runs;
  const isWicket = ball.wicket;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-slate-950 border border-amber-500/50 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/20 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <PlayCircle className="w-5 h-5 text-amber-400" />
            <span className="text-base font-black text-white tracking-tight">
              BALL REPLAY DEBUG #{ball.ballNumber || 1}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          
          {/* Outcome Badge Banner */}
          <div className={`p-4 rounded-2xl border text-center ${
            outcome === 'SIX'
              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
              : outcome === 'FOUR'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : isWicket
              ? 'bg-red-500/20 border-red-500/40 text-red-300'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}>
            <div className="text-xl font-black">{outcome} — {runs} RUNS {isWicket ? '(WICKET)' : ''}</div>
            <div className="text-[11px] text-slate-400 mt-1">{ball.commentary}</div>
          </div>

          {/* Bowler Section */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-black uppercase tracking-wider pb-1 border-b border-slate-800">
              <Crosshair className="w-4 h-4" />
              <span>Bowler Challenge Parameters</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-slate-500 block text-[10px]">Bowler:</span>
                <b className="text-white">{ball.bowlerName}</b>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Bowling owner:</span>
                <b className="text-sky-400">{ball.bowlingFranchise}</b>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Delivery Type:</span>
                <b className="text-amber-300">{delivery}</b>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Requested Line:</span>
                <b className="text-slate-200">{line}</b>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Requested Length:</span>
                <b className="text-slate-200">{length}</b>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Execution Plan:</span>
                <b className="text-emerald-400">{ball.bowlPlan || 'PERFECT'}</b>
              </div>
            </div>
          </div>

          {/* Batter Section */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-black uppercase tracking-wider pb-1 border-b border-slate-800">
              <Target className="w-4 h-4" />
              <span>Batter Response Parameters</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-slate-500 block text-[10px]">Striker:</span>
                <b className="text-white">{ball.batterName}</b>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Batting owner:</span>
                <b className="text-yellow-400">{ball.battingFranchise}</b>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Intent / Shot:</span>
                <b className="text-emerald-300">{shot}</b>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Swing Timing:</span>
                <b className={timing === 'PERFECT' ? 'text-emerald-400' : 'text-amber-400'}>{timing}</b>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Contact Quality:</span>
                <b className="text-slate-200">{timing === 'PERFECT' ? 'SWEET SPOT' : 'SOLID'}</b>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Dismissal:</span>
                <b className={isWicket ? 'text-red-400' : 'text-slate-400'}>{ball.wicketType || (isWicket ? 'OUT' : 'NONE')}</b>
              </div>
            </div>
          </div>

          {/* Tactical Verification Badge */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-2 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Authoritative Server Verified Result</span>
            </div>
            <span className="text-emerald-400 font-black">100% HUMAN VS HUMAN</span>
          </div>

        </div>
      </div>
    </div>
  );
};
