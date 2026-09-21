import React, { useState, useMemo, useEffect } from 'react';
import { Player } from '../types';
import { Search, X, ChevronRight } from 'lucide-react';
import { resolvePlayerPhoto, handleImageFallback } from '../services/mediaResolver';

interface PlayerPoolProps {
  players: Player[];
  snapshot?: import('../types').RoomStateSnapshot;
  currentMemberId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectPlayer: (player: Player) => void;
  onPreSkipPlayer?: (franchiseCode: string, playerId: string) => Promise<void>;
}

export const PlayerPool: React.FC<PlayerPoolProps> = ({
  players,
  snapshot,
  currentMemberId,
  isOpen,
  onClose,
  onSelectPlayer,
  onPreSkipPlayer,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [originFilter, setOriginFilter] = useState<string>('ALL'); // ALL, IND, OS
  const [capFilter, setCapFilter] = useState<string>('ALL'); // ALL, CAPPED, UNCAPPED

  // Virtualized rendering: mount the 369-row pool in scroll chunks instead of all at once
  const [visibleCount, setVisibleCount] = useState(60);
  useEffect(() => { setVisibleCount(60); }, [search, roleFilter, originFilter, capFilter]);
  const [statusFilter] = useState<string>('ALL'); // ALL, REMAINING, SOLD, UNSOLD
  const [selectedSet, setSelectedSet] = useState<string>('ALL');

  // Unique sets
  const availableSets = useMemo(() => {
    const sets = new Set<string>();
    players.forEach((p) => sets.add(p.auctionSet));
    return ['ALL', ...Array.from(sets)];
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.fullName.toLowerCase().includes(q) || (p.shortName && p.shortName.toLowerCase().includes(q));
        const matchesCountry = p.country.toLowerCase().includes(q);
        const matchesRole = p.role.toLowerCase().includes(q);
        if (!matchesName && !matchesCountry && !matchesRole) return false;
      }

      // Role
      if (roleFilter !== 'ALL' && p.role !== roleFilter) return false;

      // Origin
      if (originFilter === 'IND' && p.isOverseas) return false;
      if (originFilter === 'OS' && !p.isOverseas) return false;

      // Cap
      if (capFilter === 'CAPPED' && !p.isCapped) return false;
      if (capFilter === 'UNCAPPED' && p.isCapped) return false;

      // Status
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;

      // Set
      if (selectedSet !== 'ALL' && p.auctionSet !== selectedSet) return false;

      return true;
    });
  }, [players, search, roleFilter, originFilter, capFilter, statusFilter, selectedSet]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0b101d] border-l border-slate-800 shadow-2xl flex flex-col animate-slideInRight text-slate-100">
      {/* Top Header */}
      <div className="p-4 px-6 border-b border-slate-800 bg-[#0e1424] flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-base font-black tracking-tight text-white uppercase">
              Player Pool Registry
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Showing <strong className="text-amber-400">{filteredPlayers.length}</strong> of {players.length} canonical players
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, country, or role..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips: Origin & Cap */}
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <button
            onClick={() => setOriginFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg border font-semibold transition-all ${
              originFilter === 'ALL'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Countries
          </button>
          <button
            onClick={() => setOriginFilter('IND')}
            className={`px-2.5 py-1 rounded-lg border font-semibold transition-all ${
              originFilter === 'IND'
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Indian
          </button>
          <button
            onClick={() => setOriginFilter('OS')}
            className={`px-2.5 py-1 rounded-lg border font-semibold transition-all ${
              originFilter === 'OS'
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Overseas
          </button>

          <span className="text-slate-700 self-center">|</span>

          <button
            onClick={() => setCapFilter(capFilter === 'CAPPED' ? 'ALL' : 'CAPPED')}
            className={`px-2.5 py-1 rounded-lg border font-semibold transition-all ${
              capFilter === 'CAPPED'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Capped
          </button>
          <button
            onClick={() => setCapFilter(capFilter === 'UNCAPPED' ? 'ALL' : 'UNCAPPED')}
            className={`px-2.5 py-1 rounded-lg border font-semibold transition-all ${
              capFilter === 'UNCAPPED'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Uncapped
          </button>
        </div>

        {/* Roles Filter Tabs */}
        <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800 text-[11px] font-bold">
          {['ALL', 'Batter', 'Bowler', 'All-Rounder', 'Wicketkeeper'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`flex-1 py-1 rounded transition-all text-center ${
                roleFilter === role
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {role === 'All-Rounder' ? 'AR' : role === 'Wicketkeeper' ? 'WK' : role}
            </button>
          ))}
        </div>

        {/* Set Filter Dropdown */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">Auction Set:</span>
          <select
            value={selectedSet}
            onChange={(e) => setSelectedSet(e.target.value)}
            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-400 text-xs font-mono font-bold focus:outline-none"
          >
            {availableSets.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All Sets (369)' : `Set ${s}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Player List */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-800/40"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 320) {
            setVisibleCount((c) => Math.min(c + 60, filteredPlayers.length));
          }
        }}
      >
        {filteredPlayers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No players match the selected filters.
          </div>
        ) : (
          filteredPlayers.slice(0, visibleCount).map((player) => {
            const priceLakh = player.basePrice / 100000;
            const priceCrore = (player.basePrice / 10000000).toFixed(2);
            const priceStr =
              player.basePrice >= 10000000 ? `₹${priceCrore} Cr` : `₹${priceLakh} L`;

            const myOwnedFranchises = Object.values(snapshot?.franchises || {})
              .filter((f) => f.active && f.ownerMemberId === currentMemberId)
              .map((f) => f.franchiseCode);
            const preSkips = snapshot?.playerPreSkips?.[player.id] || [];
            const myPreSkipped = myOwnedFranchises.length > 0 && myOwnedFranchises.every((code) => preSkips.includes(code));
            const activeHumanCount = snapshot?.franchises ? Object.values(snapshot.franchises).filter(f => f.active).length : 0;
            const isBypassed = player.status === 'UNSOLD' || (activeHumanCount > 0 && preSkips.length >= activeHumanCount);

            return (
              <div
                key={player.id}
                onClick={() => onSelectPlayer(player)}
                className="pt-2 first:pt-0 group flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#131b2e] border border-transparent hover:border-slate-800 cursor-pointer transition-all"
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 flex-shrink-0">
                    <img
                      src={resolvePlayerPhoto(player, 'pool').url}
                      alt={player.fullName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={handleImageFallback}
                    />
                    <span className="absolute bottom-0 right-0 text-[8px] px-1 bg-black/80 text-amber-300 font-mono font-bold">
                      #{player.lotNumber}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="font-bold text-xs text-white group-hover:text-amber-400 transition-colors truncate">
                        {player.fullName}
                      </span>
                      {player.isOverseas ? (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold flex-shrink-0">
                          OS
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5 truncate">
                      <span className="truncate">{player.country}</span>
                      <span>•</span>
                      <span className="text-slate-300 font-medium">{player.role}</span>
                      <span>•</span>
                      <span className="font-mono text-amber-300/80">{player.auctionSet}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Reserve Price, Pre-Skip Button & Status */}
                <div className="flex items-center space-x-2 flex-shrink-0 text-right">
                  {onPreSkipPlayer && player.status !== 'SOLD' && !isBypassed && myOwnedFranchises.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        myOwnedFranchises.forEach((code) => {
                          onPreSkipPlayer(code, player.id);
                        });
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center space-x-1 cursor-pointer ${
                        myPreSkipped
                          ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title={myPreSkipped ? 'Your franchise voted to skip this player' : 'Vote to skip this player from category draw'}
                    >
                      <span>{myPreSkipped ? '✓ SKIPPED' : 'SKIP'}</span>
                      {activeHumanCount > 0 && (
                        <span className="text-[9px] font-mono opacity-75">
                          ({preSkips.length}/{activeHumanCount})
                        </span>
                      )}
                    </button>
                  )}

                  <div>
                    <span className="block font-mono font-bold text-xs text-amber-400">
                      {priceStr}
                    </span>
                    <span
                      className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        player.status === 'SOLD'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : player.status === 'ON_BLOCK'
                          ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                          : isBypassed || player.status === 'UNSOLD'
                          ? 'bg-slate-800 text-slate-500 border border-slate-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {isBypassed ? 'BYPASSED' : player.status}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
