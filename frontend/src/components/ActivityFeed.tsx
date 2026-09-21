import React from 'react';
import { Activity } from 'lucide-react';

interface ActivityFeedProps {
  events: string[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events }) => {
  if (!events || events.length === 0) return null;

  return (
    <div className="bg-[#0e1424]/90 rounded-2xl border border-slate-800 p-4 shadow-lg">
      <div className="flex items-center space-x-2 mb-3">
        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Live Room Activity</h3>
      </div>
      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 text-xs">
        {events.slice(-10).reverse().map((evt, idx) => (
          <div key={idx} className="flex items-start space-x-2 py-1 border-b border-slate-800/50 last:border-0 text-slate-300">
            <span className="text-[10px] text-amber-400 font-mono mt-0.5">•</span>
            <span className="leading-snug text-slate-300 text-xs">{evt}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
