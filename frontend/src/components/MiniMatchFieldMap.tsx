import React from 'react';
import { Shield } from 'lucide-react';

export type FieldPreset = 'ATTACKING' | 'BALANCED' | 'DEFENSIVE' | 'DEEP_BOUNDARIES';

export interface FielderPosition {
  id: string;
  name: string;
  x: number; // Percentage on field (-50 to 50)
  y: number; // Percentage on field (-50 to 50)
  isBoundary?: boolean;
}

export const FIELD_PRESETS: Record<FieldPreset, FielderPosition[]> = {
  ATTACKING: [
    { id: 'keeper', name: 'WK', x: 0, y: 40 },
    { id: 'slip1', name: 'Slip 1', x: 8, y: 38 },
    { id: 'slip2', name: 'Slip 2', x: 15, y: 36 },
    { id: 'gully', name: 'Gully', x: 22, y: 28 },
    { id: 'point', name: 'Point', x: 35, y: 10 },
    { id: 'cover', name: 'Cover', x: 38, y: -10 },
    { id: 'midoff', name: 'Mid Off', x: 15, y: -30 },
    { id: 'midon', name: 'Mid On', x: -15, y: -30 },
    { id: 'sqleg', name: 'Sq Leg', x: -35, y: 10 },
    { id: 'fineleg', name: 'Fine Leg', x: -20, y: 38 },
    { id: 'deepthird', name: 'Third Man', x: 38, y: 42, isBoundary: true }
  ],
  BALANCED: [
    { id: 'keeper', name: 'WK', x: 0, y: 40 },
    { id: 'slip1', name: 'Slip 1', x: 10, y: 37 },
    { id: 'point', name: 'Point', x: 35, y: 10 },
    { id: 'cover', name: 'Cover', x: 38, y: -10 },
    { id: 'midoff', name: 'Mid Off', x: 15, y: -28 },
    { id: 'midon', name: 'Mid On', x: -15, y: -28 },
    { id: 'sqleg', name: 'Sq Leg', x: -35, y: 10 },
    { id: 'fineleg', name: 'Fine Leg', x: -22, y: 38 },
    { id: 'longoff', name: 'Long Off', x: 25, y: -45, isBoundary: true },
    { id: 'longon', name: 'Long On', x: -25, y: -45, isBoundary: true },
    { id: 'deepthird', name: 'Third Man', x: 38, y: 42, isBoundary: true }
  ],
  DEFENSIVE: [
    { id: 'keeper', name: 'WK', x: 0, y: 40 },
    { id: 'point', name: 'Point', x: 35, y: 10 },
    { id: 'cover', name: 'Cover', x: 38, y: -10 },
    { id: 'sqleg', name: 'Sq Leg', x: -35, y: 10 },
    { id: 'deepcover', name: 'Deep Cover', x: 44, y: -20, isBoundary: true },
    { id: 'longoff', name: 'Long Off', x: 22, y: -46, isBoundary: true },
    { id: 'longon', name: 'Long On', x: -22, y: -46, isBoundary: true },
    { id: 'deepmidwkt', name: 'Deep Midwkt', x: -44, y: -20, isBoundary: true },
    { id: 'deepsqleg', name: 'Deep Sq Leg', x: -44, y: 20, isBoundary: true },
    { id: 'fineleg', name: 'Fine Leg', x: -25, y: 40, isBoundary: true },
    { id: 'deepthird', name: 'Third Man', x: 38, y: 42, isBoundary: true }
  ],
  DEEP_BOUNDARIES: [
    { id: 'keeper', name: 'WK', x: 0, y: 40 },
    { id: 'midoff', name: 'Mid Off', x: 12, y: -25 },
    { id: 'midon', name: 'Mid On', x: -12, y: -25 },
    { id: 'deepcover', name: 'Deep Cover', x: 45, y: -15, isBoundary: true },
    { id: 'deepextra', name: 'Deep Extra', x: 35, y: -42, isBoundary: true },
    { id: 'longoff', name: 'Long Off', x: 15, y: -46, isBoundary: true },
    { id: 'longon', name: 'Long On', x: -15, y: -46, isBoundary: true },
    { id: 'deepmidwkt', name: 'Deep Midwkt', x: -35, y: -42, isBoundary: true },
    { id: 'deepsqleg', name: 'Deep Sq Leg', x: -45, y: 15, isBoundary: true },
    { id: 'fineleg', name: 'Fine Leg', x: -25, y: 42, isBoundary: true },
    { id: 'deepthird', name: 'Third Man', x: 35, y: 42, isBoundary: true }
  ]
};

interface MiniMatchFieldMapProps {
  currentPreset: FieldPreset;
  onPresetChange?: (preset: FieldPreset) => void;
  isBowlingPlayer?: boolean;
  isFieldLocked?: boolean;
  onConfirmField?: () => void;
}

export const MiniMatchFieldMap: React.FC<MiniMatchFieldMapProps> = ({
  currentPreset,
  onPresetChange,
  isBowlingPlayer = false,
  isFieldLocked = false,
  onConfirmField
}) => {
  const fielders = FIELD_PRESETS[currentPreset] || FIELD_PRESETS.BALANCED;

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2 sm:p-2.5 rounded-2xl shadow-2xl flex flex-col space-y-2 select-none w-44 sm:w-48">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
        <div className="flex items-center space-x-1">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-black uppercase text-slate-200 tracking-wider">
            {isBowlingPlayer ? 'TACTICAL FIELD' : 'FIELD GAPS'}
          </span>
        </div>
        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-950 text-emerald-400 border border-emerald-500/30">
          {currentPreset}
        </span>
      </div>

      {/* Field Map SVG Oval */}
      <div className="relative w-full aspect-square bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center p-1">
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
          {/* Outfield boundary */}
          <ellipse cx="50" cy="50" rx="46" ry="46" fill="none" stroke="#059669" strokeWidth="1.5" strokeDasharray="2,2" />

          {/* 30-yard inner circle */}
          <ellipse cx="50" cy="50" rx="26" ry="26" fill="none" stroke="#10b981" strokeWidth="0.8" opacity="0.6" />

          {/* Pitch rect */}
          <rect x="47" y="36" width="6" height="28" fill="#d97706" rx="1" opacity="0.8" />

          {/* Batter Icon (Center) */}
          <circle cx="50" cy="50" r="2.5" fill="#facc15" />

          {/* 11 Fielder Dots */}
          {fielders.map((f) => {
            const cx = 50 + f.x * 0.85;
            const cy = 50 + f.y * 0.85;

            return (
              <g key={f.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={f.isBoundary ? "2.2" : "1.8"}
                  fill={f.isBoundary ? "#38bdf8" : "#34d399"}
                  stroke="#0284c7"
                  strokeWidth="0.5"
                />
              </g>
            );
          })}
        </svg>

        {/* Lock Overlay when field is locked */}
        {isFieldLocked && (
          <div className="absolute top-1.5 right-1.5 bg-slate-950/90 text-slate-300 text-[8px] font-black px-1.5 py-0.5 rounded border border-slate-700/80">
            🔒 LOCKED
          </div>
        )}
      </div>

      {/* Field Editor for Bowling Owner during Pre-ball window */}
      {isBowlingPlayer && !isFieldLocked && onPresetChange && (
        <div className="space-y-1 pt-0.5">
          <div className="grid grid-cols-2 gap-1">
            {(['ATTACKING', 'BALANCED', 'DEFENSIVE', 'DEEP_BOUNDARIES'] as FieldPreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => onPresetChange(preset)}
                className={`py-1 text-[8px] font-black rounded uppercase border transition ${
                  currentPreset === preset
                    ? 'bg-sky-600 text-white border-sky-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                {preset === 'DEEP_BOUNDARIES' ? 'DEEP' : preset}
              </button>
            ))}
          </div>

          {onConfirmField && (
            <button
              onClick={onConfirmField}
              className="w-full py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded text-[9px] font-black tracking-wider uppercase transition active:scale-95"
            >
              ✓ CONFIRM FIELD
            </button>
          )}
        </div>
      )}
    </div>
  );
};
