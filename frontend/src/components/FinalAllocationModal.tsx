import React from 'react';
import { FranchiseSeat } from '../types';
import { Lock, User, ShieldCheck, PowerOff } from 'lucide-react';

interface FinalAllocationModalProps {
  isOpen: boolean;
  seats: FranchiseSeat[];
  onConfirmLockStart: () => void;
  onCancel: () => void;
}

export const FinalAllocationModal: React.FC<FinalAllocationModalProps> = ({
  isOpen,
  seats,
  onConfirmLockStart,
  onCancel,
}) => {
  if (!isOpen) return null;

  const selectedSeats = seats.filter((s) => s.isHuman || s.ownerMemberId);
  const unselectedSeats = seats.filter((s) => !s.isHuman && !s.ownerMemberId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0e1424] border border-amber-500/50 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4 flex-shrink-0">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Confirm Franchise Allocation</h2>
            <div className="flex items-center space-x-3 text-xs mt-1">
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Selected: {selectedSeats.length} Active Human</span>
              </span>
              <span className="text-slate-400 font-semibold flex items-center space-x-1">
                <PowerOff className="w-3.5 h-3.5 text-slate-500" />
                <span>Unselected: {unselectedSeats.length} Inactive</span>
              </span>
              <span className="text-amber-400 font-mono font-bold">
                AI: 0
              </span>
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start space-x-2.5 mb-4 flex-shrink-0">
          <User className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
          <span>
            <strong>PERMANENT LOCK:</strong> {selectedSeats.length} franchise(s) are controlled by active human members. The remaining {unselectedSeats.length} unselected franchise(s) will remain completely <strong>INACTIVE</strong> (no bidding, zero AI). Allocations become immutable upon confirmation.
          </span>
        </div>

        {/* Teams Scroll Container */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1 mb-5">
          {/* Selected Human Franchises */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Active Human Franchises ({selectedSeats.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedSeats.map((s) => (
                <div
                  key={s.code}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 border border-emerald-500/40 text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow"
                      style={{ backgroundColor: `${s.primaryColor}30`, color: s.primaryColor === '#FFFF00' ? '#eab308' : s.primaryColor }}
                    >
                      {s.code}
                    </div>
                    <div>
                      <span className="font-bold text-slate-100 block">{s.name}</span>
                      <span className="text-[11px] text-slate-400">Owner: <strong className="text-amber-400">{s.ownerDisplayName}</strong></span>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    HUMAN
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Unselected Inactive Franchises */}
          {unselectedSeats.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                <PowerOff className="w-4 h-4 text-slate-500" />
                <span>Unselected Inactive Franchises ({unselectedSeats.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unselectedSeats.map((s) => (
                  <div
                    key={s.code}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-800 text-xs opacity-60"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] bg-slate-800 text-slate-400"
                      >
                        {s.code}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-300 block text-xs">{s.name}</span>
                        <span className="text-[10px] text-slate-500 italic">No owner — Non-bidding</span>
                      </div>
                    </div>

                    <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      INACTIVE
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center space-x-3 flex-shrink-0 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="w-1/3 py-3 px-4 rounded-xl font-semibold text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 transition-all border border-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmLockStart}
            className="w-2/3 py-3 px-4 rounded-xl font-black text-sm tracking-wide uppercase bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-xl shadow-amber-500/30 hover:brightness-110 active:scale-[0.99] transition-all"
          >
            LOCK TEAMS & START AUCTION
          </button>
        </div>
      </div>
    </div>
  );
};
