import React, { useEffect, useState } from 'react';
import { AuctionLot, FranchiseAuctionState } from '../types';
import { announcer } from '../services/announcer';
import { Gavel, Sparkles, CheckCircle, Clock, X, ArrowRight } from 'lucide-react';

interface SoldCinematicOverlayProps {
  lot: AuctionLot;
  winnerFranchise?: FranchiseAuctionState | null;
  isHost?: boolean;
  onDrawNext?: () => Promise<void> | void;
  drawLoading?: boolean;
  onDismiss?: () => void;
}

export const SoldCinematicOverlay: React.FC<SoldCinematicOverlayProps> = ({
  lot,
  winnerFranchise,
  isHost = false,
  onDrawNext,
  drawLoading = false,
  onDismiss,
}) => {
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    announcer.announceSold(
      lot.player.fullName,
      lot.highestBidderFranchise || 'Winning Franchise',
      lot.currentBidLakhs,
      lot.lotNumber,
      lot.player.id
    );
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

  const winnerCode = lot.highestBidderFranchise || 'TEAM';
  const ownerName = winnerFranchise?.ownerDisplayName || lot.highestBidderName || 'Human Owner';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-fadeIn">
      {/* Light Burst Behind Modal */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#0b1326] border-2 border-emerald-500/70 rounded-3xl shadow-2xl p-6 text-center text-slate-100 flex flex-col items-center space-y-4 animate-zoomIn">
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

        {/* Animated 3D Hammer Strike Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20 animate-bounce">
          <Gavel className="w-8 h-8" />
        </div>

        {/* SOLD Header */}
        <div>
          <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-black tracking-widest uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>HAMMER DOWN — SOLD!</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {lot.player.fullName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Lot #{lot.lotNumber} • {lot.player.role} • {lot.player.country}
          </p>
        </div>

        {/* Winning Bid Card */}
        <div className="w-full p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-2">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block">
            Final Winning Bid
          </span>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
            {formatLakhs(lot.currentBidLakhs)}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-mono font-black text-sm text-white px-2 py-0.5 rounded bg-slate-800">
                {winnerCode}
              </span>
              <span className="text-slate-300 font-bold">{winnerFranchise?.franchiseName || winnerCode}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-[10px] block">Owner</span>
              <span className="text-amber-400 font-bold">{ownerName}</span>
            </div>
          </div>
        </div>

        {/* Status Confirmation Badge */}
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Purse deducted & added to franchise squad</span>
        </div>

        {/* Action Controls Container */}
        <div className="w-full space-y-2 pt-1">
          {/* Host primary Draw Next Chit button */}
          {isHost && onDrawNext && (
            <button
              type="button"
              onClick={() => onDrawNext()}
              disabled={drawLoading}
              className="w-full py-3.5 px-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-xl shadow-amber-500/30 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{drawLoading ? 'Drawing Next Player...' : '🎲 DRAW NEXT PLAYER'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Participant Waiting Indicator */}
          {!isHost && (
            <div className="w-full py-2.5 px-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs flex items-center justify-center space-x-2">
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
