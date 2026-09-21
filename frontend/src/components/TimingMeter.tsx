/**
 * Skill timing meter for mini matches.
 *
 * A marker sweeps left<->right across a bar. The batting/bowling owner presses
 * SPACE or taps to lock their timing. Zone widths (PERFECT/GOOD/OKAY/POOR) are
 * sent by the server per ball and genuinely scale with the current batter's or
 * bowler's rating — better players get a wider PERFECT zone.
 */
import React, { useEffect, useRef, useState } from 'react';

export function zoneOf(position: number, perfect: number, good: number, okay: number): string {
  const d = Math.abs(position - 500);
  if (d <= perfect) return 'PERFECT';
  if (d <= good) return 'GOOD';
  if (d <= okay) return 'OKAY';
  return 'POOR';
}

interface TimingMeterProps {
  title: string;
  active: boolean;            // this user controls this meter
  lockedZone: string | null;  // set once this user locked
  perfect: number;            // zone half-widths (bar is 0..1000, center 500)
  good: number;
  okay: number;
  deadlineEpochMillis: number; // re-arms the sweep for each new ball
  onLock: (position: number) => void;
}

const ZONE_COLORS: Record<string, string> = {
  PERFECT: 'text-emerald-300',
  GOOD: 'text-lime-300',
  OKAY: 'text-amber-300',
  POOR: 'text-red-400',
};

export const TimingMeter: React.FC<TimingMeterProps> = ({
  title,
  active,
  lockedZone,
  perfect,
  good,
  okay,
  deadlineEpochMillis,
  onLock,
}) => {
  const [pos, setPos] = useState(500);
  const posRef = useRef(500);
  const lockedRef = useRef(false);

  // Sweep the marker each new ball (ping-pong, ~0.9s per half sweep)
  useEffect(() => {
    lockedRef.current = false;
    let raf = 0;
    const start = performance.now();
    const sweep = 550; // faster sweep = more excitement
    const tick = (t: number) => {
      if (lockedRef.current) return;
      const phase = ((t - start) % (sweep * 2)) / (sweep * 2);
      const p = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      posRef.current = Math.round(p * 1000);
      setPos(posRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [deadlineEpochMillis]);

  const lock = () => {
    if (lockedRef.current || !active) return;
    lockedRef.current = true;
    onLock(posRef.current);
  };

  // SPACE key locks the timing (only when this meter belongs to me)
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        lock();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const pct = (halfWidth: number) => (halfWidth / 1000) * 100;
  const pw = pct(perfect);
  const gw = pct(good);
  const ow = pct(okay);
  const liveZone = zoneOf(pos, perfect, good, okay);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{title}</span>
        <span
          className={`text-[10px] font-black ${
            lockedZone ? ZONE_COLORS[lockedZone] || 'text-emerald-300' : active ? 'text-indigo-300 animate-pulse' : 'text-slate-600'
          }`}
        >
          {lockedZone ? `LOCKED: ${lockedZone}` : active ? 'SPACE / TAP TO TIME IT' : 'opponent deciding…'}
        </span>
      </div>
      <button
        type="button"
        onClick={lock}
        disabled={!active || lockedZone != null}
        className={`relative w-full h-8 rounded-lg overflow-hidden border transition-all ${
          active && !lockedZone ? 'border-indigo-400 cursor-pointer' : 'border-slate-700 cursor-default opacity-80'
        }`}
      >
        {/* POOR zone (edges) */}
        <div className="absolute inset-y-0 left-0 bg-red-500/25" style={{ width: '50%' }} />
        <div className="absolute inset-y-0 right-0 bg-red-500/25" style={{ width: '50%' }} />
        {/* OKAY / GOOD / PERFECT centered zones */}
        <div className="absolute inset-y-0 bg-amber-500/30" style={{ left: `${50 - ow}%`, width: `${ow * 2}%` }} />
        <div className="absolute inset-y-0 bg-lime-500/35" style={{ left: `${50 - gw}%`, width: `${gw * 2}%` }} />
        <div className="absolute inset-y-0 bg-emerald-400/60" style={{ left: `${50 - pw}%`, width: `${pw * 2}%` }} />
        {/* sweeping marker */}
        <div
          className="absolute inset-y-0 w-[3px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
          style={{ left: `${pos / 10}%` }}
        />
        {active && !lockedZone && (
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white/80 pointer-events-none">
            {liveZone}
          </span>
        )}
      </button>
    </div>
  );
};

export default TimingMeter;
