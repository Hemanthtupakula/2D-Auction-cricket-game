import React, { useState } from 'react';
import { FranchiseSeat } from '../types';
import { AlertTriangle, Check, Shield } from 'lucide-react';

interface HostRebalanceModalProps {
  isOpen: boolean;
  oldMax: number;
  newMax: number;
  hostSeats: FranchiseSeat[];
  onConfirmRebalance: (franchisesToKeep: string[]) => void;
}

export const HostRebalanceModal: React.FC<HostRebalanceModalProps> = ({
  isOpen,
  oldMax,
  newMax,
  hostSeats,
  onConfirmRebalance,
}) => {
  const [selected, setSelected] = useState<string[]>(() =>
    hostSeats ? hostSeats.slice(0, newMax).map((s) => s.code) : []
  );

  if (!isOpen) return null;

  const toggleSelect = (code: string) => {
    if (selected.includes(code)) {
      setSelected(selected.filter((c) => c !== code));
    } else {
      if (selected.length < newMax) {
        setSelected([...selected, code]);
      }
    }
  };

  const isExactCount = selected.length === newMax;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#0f172a] border border-amber-500/40 p-6 shadow-2xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Host Capacity Rebalance</h2>
            <p className="text-xs text-amber-400/90 font-medium">Action required to proceed</p>
          </div>
        </div>

        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 mb-5">
          <p className="text-sm text-slate-300 leading-relaxed">
            As more human participants joined the lobby, your maximum permitted franchise ownership has changed from{' '}
            <span className="font-bold text-amber-400">{oldMax}</span> to{' '}
            <span className="font-bold text-amber-400">{newMax}</span>.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Please choose exactly <span className="font-bold text-emerald-400">{newMax}</span> franchise(s) you wish to keep. The unselected franchises will be released back to the open pool.
          </p>
        </div>

        <div className="space-y-2 mb-6">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Your Current Franchises ({selected.length}/{newMax} Selected)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {hostSeats.map((seat) => {
              const isSelected = selected.includes(seat.code);
              return (
                <button
                  key={seat.code}
                  type="button"
                  onClick={() => toggleSelect(seat.code)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500/80 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Shield
                      className="w-4 h-4"
                      style={{ color: seat.primaryColor }}
                    />
                    <div>
                      <span className="font-bold text-sm text-slate-200">{seat.code}</span>
                      <span className="text-xs text-slate-400 block truncate max-w-[100px]">{seat.name}</span>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-400 text-black'
                        : 'border-slate-700 bg-slate-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => onConfirmRebalance(selected)}
          disabled={!isExactCount}
          className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/40 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isExactCount
            ? `Confirm & Keep ${selected.join(', ')}`
            : `Select Exactly ${newMax} Franchises (${newMax - selected.length} remaining)`}
        </button>
      </div>
    </div>
  );
};
