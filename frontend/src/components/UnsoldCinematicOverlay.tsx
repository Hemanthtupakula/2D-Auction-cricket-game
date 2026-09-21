import React, { useEffect, useState } from 'react';
import { AuctionLot } from '../types';
import { announcer } from '../services/announcer';
import { AlertCircle, Sparkles, Clock, X, ArrowRight } from 'lucide-react';

interface UnsoldCinematicOverlayProps {
  lot: AuctionLot;
  isHost?: boolean;
  onDrawNext?: () => Promise<void> | void;
  drawLoading?: boolean;
  onDismiss?: () => void;
}

export const UnsoldCinematicOverlay: React.FC<UnsoldCinematicOverlayProps> = ({
  lot,
  isHost = false,
  onDrawNext,
  drawLoading = false,
  onDismiss,
}) => {
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    announcer.announceUnsold(lot.player.fullName, lot.lotNumber, lot.player.id);
  }, [lot.lotNumber]);

  // Auto-dismiss countdown timer so the screen never stays permanently locked
  useEffect(() => {
    if (countdown <= 0) {
      if (onDismiss) onDismiss();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, onDismiss]);

  const formatLakhs = (lakhs: number) => {
    if (lakhs >= 100) {
      return `₹${(lakhs / 100).toFixed(2)} Cr`;
    }
    return `₹${lakhs} L`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm bg-[#0e1424] border border-slate-700 rounded-3xl shadow-2xl p-6 text-center text-slate-100 flex flex-col items-center space-y-4 animate-zoomIn">
        {/* Quick Close Button */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            title="Close overlay"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shadow-lg">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-slate-800 text-slate-400 font-mono text-xs font-black tracking-widest uppercase mb-1">
            LOT #{lot.lotNumber} • UNSOLD
          </span>
          <h2 className="text-xl font-bold text-white">
            {lot.player.fullName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Base price of {formatLakhs(lot.basePriceLakhs)} received zero bids
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
          Player returns to unsold pool for subsequent accelerated rounds.
        </div>

        {/* Action Controls Container */}
        <div className="w-full space-y-2 pt-1">
          {/* Host primary Draw Next Chit button */}
          {isHost && onDrawNext && (
            <button
              type="button"
              onClick={() => onDrawNext()}
              disabled={drawLoading}
              className="w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-xl shadow-amber-500/30 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{drawLoading ? 'Drawing Next Player...' : '🎲 DRAW NEXT PLAYER'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Participant Waiting Indicator */}
          {!isHost && (
            <div className="w-full py-2 px-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs flex items-center justify-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Waiting for host to draw next chit...</span>
            </div>
          )}

          {/* Dismiss / View Board Button with live countdown */}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-2 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <span>View Tactical Board</span>
              <span className="text-slate-500 font-mono text-[11px]">({countdown}s)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
