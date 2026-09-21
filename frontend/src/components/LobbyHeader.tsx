import React from 'react';
import { AllocationState, RoomMember } from '../types';
import { Users, Shield, Copy, Check, Radio, Volume2, LogOut, BarChart3 } from 'lucide-react';
import { announcer } from '../services/announcer';

interface LobbyHeaderProps {
  state: AllocationState;
  currentMember: RoomMember | null;
  onOpenFinalModal: () => void;
  onOpenPool?: () => void;
  onOpenAnalysis?: () => void;
  onOpenGallery?: () => void;
  onOpenMediaDashboard?: () => void;
  onDrawChit?: () => void;
  onLeaveRoom?: () => void;
}

export const LobbyHeader: React.FC<LobbyHeaderProps> = ({
  state,
  currentMember,
  onOpenFinalModal,
  onOpenPool,
  onOpenAnalysis,
  onOpenGallery,
  onOpenMediaDashboard,
  onDrawChit,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [isAudioReady, setIsAudioReady] = React.useState(announcer.isUnlocked());

  const handleEnableAudio = async () => {
    const ok = await announcer.unlock();
    if (ok) setIsAudioReady(true);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(state.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost = currentMember?.isHost || false;
  const isRoomActive = state.status === 'AUCTION_ACTIVE';

  return (
    <header className="bg-[#0b101d]/90 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & Room Info */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
              XI
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-lg tracking-tight text-white">AUCTION XI</h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  HUMAN ALLOCATION
                </span>
              </div>
              <p className="text-xs text-slate-400">{state.roomName}</p>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-slate-800 hidden md:block" />

          {/* Room Code Badge */}
          <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-1.5">
            <span className="text-xs text-slate-400 font-medium">ROOM:</span>
            <span className="font-mono font-black text-base text-amber-400 tracking-wider">
              {state.roomCode}
            </span>
            <button
              onClick={copyCode}
              title="Copy Room Code"
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Dynamic Metrics & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Human Players */}
          <div className="flex items-center space-x-1.5 bg-slate-900/70 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">HUMAN PLAYERS:</span>
            <span className="font-bold text-slate-200">{state.humanMemberCount}</span>
          </div>

          {/* Selected Franchises */}
          <div className="flex items-center space-x-1.5 bg-slate-900/70 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">SELECTED:</span>
            <span className="font-bold text-emerald-400">{state.claimedTeamCount} / 10</span>
          </div>

          {/* Unselected Franchises */}
          <div className="flex items-center space-x-1.5 bg-slate-900/70 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400">UNSELECTED:</span>
            <span className="font-bold text-amber-300">{state.openTeamCount}</span>
          </div>

          {/* Zero AI Badge */}
          <div className="flex items-center space-x-1.5 bg-slate-900/70 border border-slate-800 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-400">
            <span>AI:</span>
            <span className="text-emerald-400">0</span>
          </div>

          {/* Live Status Indicator */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-800 bg-slate-900/60">
            <Radio className={`w-3.5 h-3.5 ${isRoomActive ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
            <span className={isRoomActive ? 'text-emerald-400' : 'text-amber-400'}>
              {state.status}
            </span>
          </div>

          {/* Audio Unlock Button */}
          <button
            onClick={handleEnableAudio}
            className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all ${
              isAudioReady
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 font-black'
            }`}
            title={isAudioReady ? 'Auction Audio Ready' : 'Enable Mobile & Desktop Auction Audio'}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isAudioReady ? '🔊 Audio Ready' : '🔊 Enable Audio'}</span>
          </button>

          {/* Player Pool Toggle Button */}
          {onOpenPool && (
            <button
              onClick={onOpenPool}
              className="py-1.5 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 shadow-md transition-all flex items-center space-x-1.5"
            >
              <span>369 Players</span>
            </button>
          )}

          {/* Player Gallery Button */}
          {onOpenGallery && (
            <button
              onClick={onOpenGallery}
              className="py-1.5 px-3.5 rounded-xl font-extrabold text-xs bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 text-amber-300 border border-amber-500/40 shadow-md shadow-amber-500/10 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
              title="Persistent 369 Player Roster, Derived Capabilities & Rating Progression"
            >
              <span>⭐ Player Gallery</span>
            </button>
          )}

          {/* Team Analysis Button */}
          {onOpenAnalysis && (
            <button
              onClick={onOpenAnalysis}
              className="py-1.5 px-3.5 rounded-xl font-bold text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/40 hover:border-blue-500/70 shadow-md shadow-blue-500/10 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
              title="View Squad, Purse & Career Analytics for all 10 Franchises"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Team Analysis</span>
            </button>
          )}

          {/* Quality Dashboard Button */}
          {onOpenMediaDashboard && (
            <button
              onClick={onOpenMediaDashboard}
              className="py-1.5 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-purple-400 border border-purple-500/30 shadow-md transition-all flex items-center space-x-1.5"
              title="Media Quality, OverGraph & Voice Dashboard"
            >
              <span>📊 Quality</span>
            </button>
          )}

          {/* Random Chit Draw Button */}
          {onDrawChit && (
            <button
              onClick={onDrawChit}
              className="py-1.5 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center space-x-1.5"
            >
              <span>🎲 Draw Chit</span>
            </button>
          )}

          {/* Host Start Button */}
          {isHost && !isRoomActive && (
            <div className="flex flex-col items-end">
              <button
                onClick={onOpenFinalModal}
                disabled={!state.canStartAuction}
                title={
                  state.canStartAuction
                    ? `Lock ${state.claimedTeamCount} selected human franchises and start auction (${state.openTeamCount} unselected remain inactive)`
                    : state.validationMessage || (state.humanMemberCount < 2 ? 'At least 2 human members are required to start an auction.' : 'Every participating human member must have at least one selected franchise.')
                }
                className="py-2 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Lock & Start Auction
              </button>
              {!state.canStartAuction ? (
                <span className="text-[10px] text-amber-400/90 font-medium mt-1">
                  {state.humanMemberCount < 2
                    ? 'Min 2 Humans Required'
                    : state.validationMessage || 'Each human must select >= 1 team'}
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 font-medium mt-1">
                  Ready to Start ({state.claimedTeamCount} active, {state.openTeamCount} inactive)
                </span>
              )}
            </div>
          )}

          {/* Exit Room Button */}
          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors cursor-pointer"
              title="Exit Room"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
