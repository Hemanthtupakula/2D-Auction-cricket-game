import React, { useState, useEffect, useMemo } from 'react';
import { Player } from '../types';
import { X, Search, Star } from 'lucide-react';
import { resolvePlayerPhoto, handleImageFallback } from '../services/mediaResolver';
import { loadProgressionStates } from '../services/playerProgression';
import { PlayerProfileModal } from './PlayerProfileModal';

interface PlayerGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  myFranchiseCode?: string;
}

export const PlayerGalleryModal: React.FC<PlayerGalleryModalProps> = ({
  isOpen,
  onClose,
  myFranchiseCode: _myFranchiseCode
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'BAT' | 'AR' | 'BOWL' | 'WK' | 'MY_TEAM'>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [progressionMap, setProgressionMap] = useState(loadProgressionStates());

  // Load canonical 369 players from public data or API
  useEffect(() => {
    if (!isOpen) return;
    setProgressionMap(loadProgressionStates());
    fetch('/data/players_369.json')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPlayers(data);
      })
      .catch((err) => console.warn('Failed to load canonical player gallery:', err));
  }, [isOpen]);

  const filteredPlayers = useMemo(() => {
    return players.filter((pl) => {
      // Search query filter
      const matchesSearch =
        !searchQuery ||
        searchQuery.trim() === '' ||
        pl.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pl.country || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pl.shortName || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Role filter
      const r = (pl.role || '').toLowerCase();
      if (roleFilter === 'BAT') return r.includes('bat') && !r.includes('all');
      if (roleFilter === 'BOWL') return r.includes('bowl') && !r.includes('all');
      if (roleFilter === 'AR') return r.includes('all') || r.includes('ar');
      if (roleFilter === 'WK') return r.includes('wk') || r.includes('keeper');

      return true;
    });
  }, [players, searchQuery, roleFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl h-[92vh] bg-[#0c1220] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Gallery Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-[#101930] to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>AUCTION XI PLAYER GALLERY</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold">
                  369 CANONICAL PLAYERS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Persistent roster, derived capabilities, match XP & rating progression history
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by player name or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'ALL (369)' },
              { id: 'BAT', label: '🏏 BATTERS' },
              { id: 'AR', label: '⚡ ALL-ROUNDERS' },
              { id: 'BOWL', label: '🎯 BOWLERS' },
              { id: 'WK', label: '🧤 KEEPERS' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                  roleFilter === tab.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 369 Player Card Grid */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {filteredPlayers.map((player) => {
            const photo = resolvePlayerPhoto(player, 'card');
            const pState = progressionMap[player.id];

            const batRating = pState?.batRating || player.basePrice >= 150000000 ? 75 : player.basePrice >= 50000000 ? 65 : 55;
            const bowlRating = pState?.bowlRating || ((player.role || '').toLowerCase().includes('bowl') ? 70 : 35);
            const batProgress = pState?.batProgress || batRating;

            const formDelta = pState?.form || 0;
            const formColor = formDelta > 0 ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' : formDelta < 0 ? 'text-rose-400 bg-rose-500/20 border-rose-500/40' : 'text-slate-400 bg-slate-800 border-slate-700';

            return (
              <div
                key={player.id}
                onClick={() => {
                  setSelectedPlayer(player);
                  setProfileOpen(true);
                }}
                className="group relative bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-3 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 cursor-pointer shadow-lg overflow-hidden"
              >
                {/* Form Badge */}
                <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full border text-[9px] font-black ${formColor}`}>
                  FORM {formDelta > 0 ? `+${formDelta}` : formDelta}
                </div>

                {/* Player Photo Container */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-950 mb-2 border border-slate-800 group-hover:border-amber-500/40 transition">
                  <img
                    src={photo.url}
                    alt={player.fullName}
                    className="w-full h-full object-cover transition transform group-hover:scale-105"
                    onError={handleImageFallback}
                  />
                  {player.isOverseas && (
                    <span className="absolute bottom-1 right-1 text-[8px] px-1.5 py-0.5 rounded bg-purple-950/90 text-purple-300 font-extrabold border border-purple-500/40">
                      ✈ OVERSEAS
                    </span>
                  )}
                </div>

                {/* Info & Name */}
                <div>
                  <h3 className="text-xs font-black text-white truncate group-hover:text-amber-400 transition">
                    {player.fullName}
                  </h3>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                    <span className="truncate">{player.country || 'International'}</span>
                    <span className="font-semibold text-indigo-400 truncate">{player.role}</span>
                  </div>
                </div>

                {/* Ratings & Progression Bar */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-black">
                    <span className="text-emerald-400 flex items-center space-x-1">
                      <span>🏏 BAT {batProgress.toFixed(1)}</span>
                    </span>
                    <span className="text-sky-400 flex items-center space-x-1">
                      <span>🎯 BOWL {bowlRating}</span>
                    </span>
                  </div>

                  {/* XP Bar */}
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400"
                      style={{ width: `${Math.min(100, ((pState?.xp || 120) / (pState?.xpMax || 500)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Player Profile Modal */}
      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
        />
      )}
    </div>
  );
};
