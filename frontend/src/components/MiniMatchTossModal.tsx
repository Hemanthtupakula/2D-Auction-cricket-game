import React, { useState } from 'react';
import { MiniMatch } from '../types';
import { submitMiniMatchTossCall2D, submitMiniMatchTossChoice2D } from '../services/api';
import { Coins, ShieldAlert, Sparkles } from 'lucide-react';

interface MiniMatchTossModalProps {
  match: MiniMatch;
  ownerId: string;
  myFranchiseCode: string;
  onTossCompleted: () => void;
}

export const MiniMatchTossModal: React.FC<MiniMatchTossModalProps> = ({
  match,
  ownerId,
  myFranchiseCode,
  onTossCompleted
}) => {
  const [selectedCall, setSelectedCall] = useState<'HEADS' | 'TAILS'>('HEADS');
  const [selectedChoice, setSelectedChoice] = useState<'BAT' | 'BOWL'>('BAT');
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const tossWinner = match.tossWinnerFranchise;
  const isTossWinner = tossWinner === myFranchiseCode;
  const isBatBowlPhase = match.status === 'BAT_OR_BOWL_SELECTION';

  const handleCallToss = async () => {
    setLoading(true);
    setError(null);
    setIsFlipping(true);
    try {
      setTimeout(async () => {
        await submitMiniMatchTossCall2D(match.matchId, ownerId, selectedCall);
        setIsFlipping(false);
        onTossCompleted();
      }, 1500);
    } catch (err: any) {
      setIsFlipping(false);
      setError(err.message || 'Failed to lock toss call.');
    } finally {
      setLoading(false);
    }
  };

  const handleChooseDecision = async () => {
    setLoading(true);
    setError(null);
    try {
      await submitMiniMatchTossChoice2D(match.matchId, ownerId, selectedChoice);
      onTossCompleted();
    } catch (err: any) {
      setError(err.message || 'Failed to submit toss decision.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl text-white text-center">
        <div className="flex items-center justify-center space-x-2 text-amber-400">
          <Coins className="w-8 h-8" />
          <h2 className="text-xl font-bold tracking-wide">Coin Toss Phase</h2>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2 text-left">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Coin Flip Visual Component */}
        <div className="py-6 flex flex-col items-center justify-center space-y-3">
          <div className={`w-24 h-24 rounded-full border-4 border-amber-400 bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/20 ${isFlipping ? 'animate-spin' : ''}`}>
            {tossWinner ? tossWinner.substring(0, 3) : selectedCall}
          </div>

          {tossWinner && (
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/30">
              <Sparkles className="w-4 h-4" />
              <span>{tossWinner} WON THE TOSS!</span>
            </div>
          )}
        </div>

        {/* Phase 1: Call Heads or Tails */}
        {!isBatBowlPhase ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">Lock your coin call (Heads / Tails). Flip resolves when both owners lock.</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedCall('HEADS')}
                className={`py-3 rounded-xl font-black text-sm border transition ${selectedCall === 'HEADS' ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'}`}
              >
                HEADS
              </button>
              <button
                type="button"
                onClick={() => setSelectedCall('TAILS')}
                className={`py-3 rounded-xl font-black text-sm border transition ${selectedCall === 'TAILS' ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'}`}
              >
                TAILS
              </button>
            </div>

            <button
              onClick={handleCallToss}
              disabled={loading || isFlipping}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl transition shadow-lg"
            >
              LOCK TOSS CALL
            </button>
          </div>
        ) : (
          /* Phase 2: Winner Choose Bat or Bowl */
          <div className="space-y-4">
            {isTossWinner ? (
              <>
                <p className="text-xs text-slate-300">You won the toss! Choose whether to Bat or Bowl first.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedChoice('BAT')}
                    className={`py-3 rounded-xl font-black text-sm border transition ${selectedChoice === 'BAT' ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md' : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'}`}
                  >
                    BAT FIRST
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedChoice('BOWL')}
                    className={`py-3 rounded-xl font-black text-sm border transition ${selectedChoice === 'BOWL' ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md' : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'}`}
                  >
                    BOWL FIRST
                  </button>
                </div>

                <button
                  onClick={handleChooseDecision}
                  disabled={loading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl transition shadow-lg"
                >
                  SUBMIT DECISION
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-400 animate-pulse">
                Waiting for toss winner ({tossWinner}) to choose Bat or Bowl...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
