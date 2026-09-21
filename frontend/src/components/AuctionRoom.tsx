import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RoomStateSnapshot, Player } from '../types';
import { resolvePlayerPhoto, resolveTeamLogo, handleImageFallback } from '../services/mediaResolver';
import { AuctionArena3D } from './AuctionArena3D';
import { PlayerRevealSequence } from './PlayerRevealSequence';
import { SoldCinematicOverlay } from './SoldCinematicOverlay';
import { UnsoldCinematicOverlay } from './UnsoldCinematicOverlay';
import { AuctionScreenKeyStats } from './AuctionScreenKeyStats';
import { announcer } from '../services/announcer';
import { auctionAudioManager, AudioManagerStatus } from '../services/auctionAudioManager';
import {
  Trophy,
  Clock,
  DollarSign,
  Sparkles,
  Pause,
  Play,
  Square,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Eye,
  LogOut,
  BarChart3,
  Users,
  Flame,
  Volume2,
  VolumeX,
  Box
} from 'lucide-react';

interface AuctionRoomProps {
  snapshot: RoomStateSnapshot;
  currentMemberId: string;
  onDrawNextPlayer: () => Promise<void>;
  onPlaceBid: (franchiseCode: string, amountLakhs: number) => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onStop: () => Promise<void>;
  onLeaveRoom: () => void;
  onOpenPool: () => void;
  onOpenAnalysis: (franchiseCode?: string) => void;
  onSelectPlayerProfile: (player: Player) => void;
  onProceedCategory?: (franchiseCode: string) => Promise<void>;
  onSkipPlayer?: (franchiseCode: string) => Promise<void>;
  onSkipCategory?: () => Promise<void>;
  onPreSkipPlayer?: (franchiseCode: string, playerId: string) => Promise<void>;
  onIntroComplete?: () => Promise<void>;
}

export const AuctionRoom: React.FC<AuctionRoomProps> = ({
  snapshot,
  currentMemberId,
  onDrawNextPlayer,
  onPlaceBid,
  onPause,
  onResume,
  onStop,
  onLeaveRoom,
  onOpenPool,
  onOpenAnalysis,
  onSelectPlayerProfile,
  onProceedCategory,
  onSkipPlayer,
  onSkipCategory,
  onPreSkipPlayer,
  onIntroComplete,
}) => {
  const isHost = snapshot.hostMemberId === currentMemberId;
  const currentLot = snapshot.currentLot;

  // View mode toggle: 'ARENA' (3D) or 'HUD' (Tactical 2D)
  const [viewMode, setViewMode] = useState<'ARENA' | 'HUD'>('HUD'); // 2D default; ARENA = optional Cinematic Mode
  const [isLiteMode, setIsLiteMode] = useState(false);
  const [isMuted, setIsMuted] = useState(!announcer.isEnabled());
  const [audioStatus, setAudioStatus] = useState<AudioManagerStatus>(auctionAudioManager.getStatus());

  useEffect(() => {
    return auctionAudioManager.subscribe((status, muted) => {
      setAudioStatus(status);
      setIsMuted(muted);
    });
  }, []);

  const handleUnlockAudio = async () => {
    await announcer.unlock();
  };

  // Confirm Stop Modal
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showSkipCategoryConfirm, setShowSkipCategoryConfirm] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [dismissedLotNumber, setDismissedLotNumber] = useState<number | null>(null);

  // Reset dismissed overlay state when a new lot is drawn/revealed
  useEffect(() => {
    if (currentLot && (currentLot.phase === 'BIDDING' || currentLot.phase === 'REVEALING')) {
      setDismissedLotNumber(null);
    }
  }, [currentLot?.lotNumber, currentLot?.phase]);

  // Active reveal sequence tracker
  const [revealingLotNumber, setRevealingLotNumber] = useState<number | null>(null);
  const lastLotNumberRef = useRef<number | null>(null);

  // Track lot changes to trigger 0.0s - 3.2s reveal sequence once per new lot
  useEffect(() => {
    announcer.updateContext(snapshot.version, currentLot?.lotNumber);
    if (currentLot && currentLot.lotNumber !== lastLotNumberRef.current) {
      lastLotNumberRef.current = currentLot.lotNumber;
      if (currentLot.phase === 'BIDDING' || currentLot.phase === 'REVEALING') {
        setRevealingLotNumber(currentLot.lotNumber);
      }
    }
  }, [currentLot?.lotNumber, currentLot?.phase, snapshot.version]);

  // Audio Voice announcer triggers on bidding events
  const lastBidRef = useRef<number | null>(null);
  useEffect(() => {
    if (currentLot && currentLot.highestBidderFranchise && currentLot.currentBidLakhs !== lastBidRef.current) {
      lastBidRef.current = currentLot.currentBidLakhs;
      announcer.announceBid(
        currentLot.highestBidderFranchise,
        currentLot.highestBidderFranchise,
        currentLot.currentBidLakhs,
        currentLot.lotNumber
      );
    }
  }, [currentLot?.highestBidderFranchise, currentLot?.currentBidLakhs, currentLot?.lotNumber]);

  // Owned franchises by current member
  const myFranchises = useMemo(() => {
    return Object.values(snapshot.franchises).filter(
      (f) => f.active && f.ownerMemberId === currentMemberId
    );
  }, [snapshot.franchises, currentMemberId]);

  // Selected franchise to bid as
  const [selectedFranchiseCode, setSelectedFranchiseCode] = useState<string>(() => {
    return myFranchises.length > 0 ? myFranchises[0].franchiseCode : '';
  });

  useEffect(() => {
    if (myFranchises.length > 0 && !myFranchises.some((f) => f.franchiseCode === selectedFranchiseCode)) {
      setSelectedFranchiseCode(myFranchises[0].franchiseCode);
    }
  }, [myFranchises, selectedFranchiseCode]);

  const activeFranchise = snapshot.franchises[selectedFranchiseCode] || null;

  // Local synchronized countdown timer based on server deadline
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const warnedRef = useRef<{ once: boolean; twice: boolean; final: boolean }>({
    once: false,
    twice: false,
    final: false,
  });

  // Reset timer warnings when new bid arrives
  useEffect(() => {
    warnedRef.current = { once: false, twice: false, final: false };
  }, [currentLot?.currentBidLakhs, currentLot?.lotNumber]);

  const isBiddingPhase = currentLot?.phase === 'BIDDING' || currentLot?.phase === 'GOING_ONCE' || currentLot?.phase === 'GOING_TWICE' || currentLot?.phase === 'THIRD_CALL' || currentLot?.phase === 'REVEALING';

  useEffect(() => {
    if (!currentLot || !isBiddingPhase || snapshot.isPaused) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      let remainingMs = 0;
      if (currentLot.phase === 'REVEALING') {
        remainingMs = (currentLot.introductionDeadlineEpochMillis || currentLot.deadlineEpochMillis) - Date.now();
      } else {
        remainingMs = currentLot.deadlineEpochMillis - Date.now();
      }
      const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(seconds);

      // Event-driven voice calls: Going once / twice
      if (currentLot.phase === 'GOING_ONCE' && !warnedRef.current.once && currentLot.highestBidderFranchise) {
        warnedRef.current.once = true;
        announcer.announceGoingOnce(currentLot.currentBidLakhs, currentLot.lotNumber);
      } else if (currentLot.phase === 'GOING_TWICE' && !warnedRef.current.twice && currentLot.highestBidderFranchise) {
        warnedRef.current.twice = true;
        announcer.announceGoingTwice(currentLot.currentBidLakhs, currentLot.lotNumber);
      } else if (currentLot.phase === 'THIRD_CALL' && !warnedRef.current.final && currentLot.highestBidderFranchise) {
        warnedRef.current.final = true;
        announcer.announceFinalCall(currentLot.currentBidLakhs, currentLot.lotNumber);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);
    return () => clearInterval(interval);
  }, [currentLot, snapshot.isPaused, isBiddingPhase]);

  // Minimum increment calculation
  const calculateIncrement = (currentLakhs: number) => {
    if (currentLakhs < 100) return 10;
    if (currentLakhs < 500) return 20;
    return 50;
  };

  // Instant 0ms Optimistic UI Bidding State
  const [optimisticBid, setOptimisticBid] = useState<{
    lotNumber: number;
    amountLakhs: number;
    bidderCode: string;
  } | null>(null);

  useEffect(() => {
    if (optimisticBid && currentLot) {
      if (currentLot.lotNumber !== optimisticBid.lotNumber || (currentLot.currentBidLakhs || 0) >= optimisticBid.amountLakhs) {
        setOptimisticBid(null);
      }
    }
  }, [currentLot, optimisticBid]);

  const effectiveCurrentBidLakhs = Math.max(
    currentLot?.currentBidLakhs || 0,
    optimisticBid && currentLot && optimisticBid.lotNumber === currentLot.lotNumber ? optimisticBid.amountLakhs : 0
  );

  const effectiveHighestBidderCode =
    optimisticBid && currentLot && optimisticBid.lotNumber === currentLot.lotNumber && optimisticBid.amountLakhs > (currentLot?.currentBidLakhs || 0)
      ? optimisticBid.bidderCode
      : currentLot?.highestBidderFranchise;

  const nextBidAmountLakhs = useMemo(() => {
    if (!currentLot) return 0;
    const base = effectiveCurrentBidLakhs > 0 ? effectiveCurrentBidLakhs : currentLot.basePriceLakhs;
    if (effectiveHighestBidderCode == null) return currentLot.basePriceLakhs;
    return base + calculateIncrement(base);
  }, [currentLot, effectiveCurrentBidLakhs, effectiveHighestBidderCode]);

  const canBid = useMemo(() => {
    if (!currentLot || snapshot.isPaused) return false;
    if (currentLot.phase === 'SOLD' || currentLot.phase === 'UNSOLD') return false;
    if (timeLeft <= 0 && currentLot.phase === 'THIRD_CALL') return false;
    if (!activeFranchise || !activeFranchise.active) return false;
    // Cannot bid against self
    if (effectiveHighestBidderCode === selectedFranchiseCode) return false;
    // Insufficient purse
    if (activeFranchise.purseLakhs < nextBidAmountLakhs) return false;
    // Max squad (25)
    if (activeFranchise.squadSize >= 25) return false;
    // Max overseas (8)
    if (currentLot.player?.isOverseas && activeFranchise.overseasCount >= 8) return false;
    return true;
  }, [currentLot, snapshot.isPaused, timeLeft, activeFranchise, effectiveHighestBidderCode, selectedFranchiseCode, nextBidAmountLakhs]);

  const cannotBidReason = useMemo(() => {
    if (!currentLot || !isBiddingPhase) return 'No active bidding lot.';
    if (snapshot.isPaused) return 'Auction is paused by host.';
    if (timeLeft <= 0 && currentLot.phase === 'THIRD_CALL') return 'Lot is finalizing.';
    if (myFranchises.length === 0) return 'Spectator mode: You do not own an active franchise.';
    if (!activeFranchise || !activeFranchise.active) return 'No active franchise selected.';
    if (effectiveHighestBidderCode === selectedFranchiseCode) return 'You are currently the highest bidder.';
    if (activeFranchise.purseLakhs < nextBidAmountLakhs) return 'Insufficient purse.';
    if (activeFranchise.squadSize >= 25) return 'Squad full (max 25 players reached).';
    if (currentLot.player?.isOverseas && activeFranchise.overseasCount >= 8) return 'Overseas quota full (max 8 reached).';
    return null;
  }, [currentLot, isBiddingPhase, snapshot.isPaused, timeLeft, myFranchises, activeFranchise, effectiveHighestBidderCode, selectedFranchiseCode, nextBidAmountLakhs]);

  // Skips & Category Confirmations tracking
  const activeHumanFranchises = useMemo(() => {
    return Object.values(snapshot.franchises).filter(f => f.active);
  }, [snapshot.franchises]);

  const uniqueHumanMembers = useMemo(() => {
    const memberSet = new Set<string>();
    Object.values(snapshot.franchises).forEach((f) => {
      if (f.active && f.ownerMemberId) memberSet.add(f.ownerMemberId);
    });
    return Array.from(memberSet);
  }, [snapshot.franchises]);

  const hasSkipped = useMemo(() => {
    if (!currentLot?.skippedFranchises || !currentMemberId) return false;
    const skippedList: string[] = Array.isArray(currentLot.skippedFranchises)
      ? currentLot.skippedFranchises
      : Object.keys(currentLot.skippedFranchises);

    return myFranchises.some((f) => skippedList.includes(f.franchiseCode));
  }, [currentLot?.skippedFranchises, currentMemberId, myFranchises]);

  const skipUserCount = useMemo(() => {
    if (!currentLot?.skippedFranchises) return 0;
    const skippedList: string[] = Array.isArray(currentLot.skippedFranchises)
      ? currentLot.skippedFranchises
      : Object.keys(currentLot.skippedFranchises);

    const skippedMembers = new Set<string>();
    Object.values(snapshot.franchises).forEach((f) => {
      if (f.active && f.ownerMemberId && skippedList.includes(f.franchiseCode)) {
        skippedMembers.add(f.ownerMemberId);
      }
    });
    return skippedMembers.size;
  }, [currentLot?.skippedFranchises, snapshot.franchises]);

  const confirmedFranchises = snapshot.categoryConfirmedFranchises || [];
  const myCategoryConfirmed = selectedFranchiseCode ? confirmedFranchises.includes(selectedFranchiseCode) : false;
  const allCategoryConfirmed = activeHumanFranchises.length > 0 && activeHumanFranchises.every(f => confirmedFranchises.includes(f.franchiseCode));

  const [drawLoading, setDrawLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [customBidCr, setCustomBidCr] = useState('');

  const handleBid = async (amountLakhs: number) => {
    if (!currentLot || !selectedFranchiseCode) return;
    // 0ms Instant Optimistic UI Update!
    setOptimisticBid({
      lotNumber: currentLot.lotNumber,
      amountLakhs,
      bidderCode: selectedFranchiseCode,
    });
    setActionError(null);

    // Call backend asynchronously in background
    onPlaceBid(selectedFranchiseCode, amountLakhs).catch((e: any) => {
      setActionError(e.message || 'Bid failed');
      setOptimisticBid(null);
    });
  };

  const handleDraw = async () => {
    if (!isHost) return;
    try {
      setDrawLoading(true);
      setActionError(null);
      await onDrawNextPlayer();
    } catch (e: any) {
      setActionError(e.message || 'Draw failed');
    } finally {
      setDrawLoading(false);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    announcer.setMuted(next);
  };

  const formatLakhs = (lakhs: number) => {
    if (lakhs >= 100) {
      return `₹${(lakhs / 100).toFixed(2)} Cr`;
    }
    return `₹${lakhs} L`;
  };

  const isSold = currentLot?.phase === 'SOLD';
  const isUnsold = currentLot?.phase === 'UNSOLD';
  const isWaiting = !currentLot || isSold || isUnsold;

  // Auto-detect mobile screen for Lite Mode on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsLiteMode(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col select-none">
      {/* Non-Blocking Audio Unlock Reminder Banner if Audio is Locked */}
      {(audioStatus === 'LOCKED' || audioStatus === 'BLOCKED') && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-center text-xs text-amber-300 flex items-center justify-center space-x-2">
          <span>🔇 Live auctioneer audio is muted by your browser:</span>
          <button
            onClick={handleUnlockAudio}
            className="px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black hover:bg-amber-400 text-[11px] transition-all cursor-pointer"
          >
            🔊 Tap to Enable Audio
          </button>
        </div>
      )}

      {/* 0.0s - 3.2s Choreographed 3D Player Reveal Sequence Overlay */}
      {revealingLotNumber !== null && currentLot && revealingLotNumber === currentLot.lotNumber && (
        <PlayerRevealSequence
          player={currentLot.player}
          onComplete={() => {
            setRevealingLotNumber(null);
            if (currentLot.phase === 'REVEALING') {
              onIntroComplete?.();
            }
          }}
        />
      )}

      {/* SOLD Cinematic Overlay */}
      {isSold && currentLot && dismissedLotNumber !== currentLot.lotNumber && (
        <SoldCinematicOverlay
          lot={currentLot}
          winnerFranchise={snapshot.franchises[currentLot.highestBidderFranchise || '']}
          isHost={isHost}
          onDrawNext={handleDraw}
          drawLoading={drawLoading}
          onDismiss={() => setDismissedLotNumber(currentLot.lotNumber)}
        />
      )}

      {/* UNSOLD Cinematic Overlay */}
      {isUnsold && currentLot && dismissedLotNumber !== currentLot.lotNumber && (
        <UnsoldCinematicOverlay
          lot={currentLot}
          isHost={isHost}
          onDrawNext={handleDraw}
          drawLoading={drawLoading}
          onDismiss={() => setDismissedLotNumber(currentLot.lotNumber)}
        />
      )}

      {/* Stop Auction Confirmation Modal */}
      {showSkipCategoryConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0e1424] border border-red-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-red-300">Skip Entire Category?</h3>
            <p className="text-sm text-slate-300">
              Skip the remaining <span className="font-bold text-white">{snapshot.categoryRemainingCount ?? 0} players</span> in{' '}
              <span className="font-bold text-amber-300">{snapshot.currentCategoryName || snapshot.currentCategory}</span>?
              They will all be marked UNSOLD (bypassed). This cannot be undone.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowSkipCategoryConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowSkipCategoryConfirm(false);
                  if (onSkipCategory) await onSkipCategory();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors"
              >
                Skip Category ⏭
              </button>
            </div>
          </div>
        </div>
      )}

      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#0e1424] border-2 border-red-500/60 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
              <Square className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">STOP THIS AUCTION?</h3>
              <p className="text-xs text-red-300 font-bold mt-1">STOPPING IS PERMANENT.</p>
              <p className="text-xs text-slate-400 mt-2">
                All bidding, player draws, and sales will end. Room will be archived permanently.
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowStopConfirm(false);
                  announcer.announceStop();
                  await onStop();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/30"
              >
                Confirm Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#0a0f1d]/90 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 font-black text-slate-950 text-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
              XI
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-black text-white tracking-wide truncate max-w-[140px] sm:max-w-none">
                  {snapshot.roomName}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono font-bold border border-slate-700">
                  {snapshot.roomCode}
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                  {snapshot.status}
                </span>
                {snapshot.currentCategory && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono font-bold border border-amber-500/30">
                    {snapshot.currentCategory} • {snapshot.currentCategoryName || 'Set'} (Cat {(snapshot.categoryIndex ?? 0) + 1}/{snapshot.totalCategories || 39})
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                <button
                  type="button"
                  onClick={() => setShowMembersModal(true)}
                  className="hover:text-amber-400 transition-colors flex items-center space-x-1 cursor-pointer underline decoration-dotted"
                  title="View all joined human members"
                >
                  <Users className="w-3 h-3 text-blue-400" />
                  <span>{snapshot.allocation.humanMemberCount} Humans Online</span>
                </button>
                <span>•</span>
                <span className="text-emerald-400 font-bold">Zero AI</span>
                <span>•</span>
                <span>Purse: {formatLakhs(snapshot.startingPurseLakhs || 10000)}</span>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* View Mode Toggle: 3D Arena vs Tactical HUD */}
            <button
              onClick={() => setViewMode(viewMode === 'ARENA' ? 'HUD' : 'ARENA')}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1 transition-colors ${
                viewMode === 'ARENA'
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Toggle 3D Arena View"
            >
              <Box className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{viewMode === 'ARENA' ? '3D Arena' : 'Tactical HUD'}</span>
            </button>

            {/* Audio Voice Mute/Unmute & Status Indicator */}
            {audioStatus === 'LOCKED' || audioStatus === 'BLOCKED' ? (
              <button
                onClick={handleUnlockAudio}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center space-x-1 shadow-md shadow-amber-500/20 transition-all cursor-pointer animate-pulse"
                title="Enable Audio Auctioneer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Enable Audio</span>
              </button>
            ) : (
              <button
                onClick={toggleMute}
                className={`px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  isMuted
                    ? 'bg-slate-900 border-slate-800 text-slate-500'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                }`}
                title={isMuted ? 'Unmute Audio Auctioneer' : 'Mute Audio Auctioneer'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span className="text-[10px] hidden md:inline">
                  {isMuted ? 'Muted' : audioStatus === 'PLAYING' ? 'Speaking' : 'Voice ON'}
                </span>
              </button>
            )}

            {/* 369 Players Pool */}
            <button
              onClick={onOpenPool}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center space-x-1 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">369 Players</span>
            </button>

            {/* Team Analysis Dashboard */}
            <button
              onClick={() => onOpenAnalysis(selectedFranchiseCode || activeFranchise?.franchiseCode)}
              className="px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-xs font-bold text-blue-300 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm shadow-blue-500/10"
              title="Open Franchise Analysis & Career Modeling"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Team Analysis</span>
            </button>

            {/* Host Controls */}
            {isHost && (
              <div className="flex items-center space-x-1 pl-1.5 border-l border-slate-800">
                {onSkipCategory && snapshot.status === 'AUCTION_ACTIVE' && !snapshot.isPaused && (
                  <button
                    onClick={() => setShowSkipCategoryConfirm(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-red-950 border border-red-500/40 text-xs font-semibold text-red-300 flex items-center space-x-1 transition-colors"
                    title="Skip all remaining players in the current category (host only)"
                  >
                    <span>Skip Set ⏭</span>
                  </button>
                )}
                {snapshot.isPaused ? (
                  <button
                    onClick={async () => {
                      announcer.announceResume();
                      await onResume();
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold text-emerald-400 flex items-center space-x-1"
                    title="Resume Auction"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Resume</span>
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      announcer.announcePause();
                      await onPause();
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 flex items-center space-x-1"
                    title="Pause Auction"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Pause</span>
                  </button>
                )}

                <button
                  onClick={() => setShowStopConfirm(true)}
                  className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors"
                  title="Stop Auction"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={onLeaveRoom}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
              title="Leave Room"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Paused Notification Banner */}
      {snapshot.isPaused && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-6 py-2 text-xs text-amber-300 font-bold flex items-center justify-center space-x-2 animate-pulse">
          <Pause className="w-4 h-4" />
          <span>AUCTION PAUSED BY HOST — TIMERS & BIDDING FROZEN</span>
        </div>
      )}

      {/* Transient Action Error */}
      {actionError && (
        <div className="bg-red-500/15 border-b border-red-500/30 px-6 py-2 text-xs text-red-300 font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-200">✕</button>
        </div>
      )}

      {/* Main Auction Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Left Column: 10 Franchises Status Board (3 cols) */}
        <div className="lg:col-span-3 space-y-3 order-3 lg:order-1">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Franchises (10)</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Purse / Squad</span>
          </div>

          <div className="space-y-2 max-h-[260px] lg:max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {Object.values(snapshot.franchises).map((f) => {
              const isMine = f.ownerMemberId === currentMemberId;
              const isHighest = currentLot?.highestBidderFranchise === f.franchiseCode;
              return (
                <div
                  key={f.franchiseCode}
                  onClick={() => onOpenAnalysis(f.franchiseCode)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                    isHighest
                      ? 'bg-amber-500/15 border-amber-500/70 shadow-lg shadow-amber-500/15 ring-1 ring-amber-400'
                      : isMine
                      ? 'bg-slate-900/90 border-blue-500/60 shadow-md shadow-blue-500/10'
                      : f.active
                      ? 'bg-[#0e1424]/70 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/40 border-slate-900 opacity-40'
                  }`}
                  title={`Click to view ${f.franchiseName} squad analysis`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-md overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 p-0.5">
                        <img
                          src={resolveTeamLogo(f.franchiseCode, 50)}
                          alt={f.franchiseCode}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <span className="font-mono font-black text-xs text-white px-1 py-0.5 rounded bg-slate-800">
                        {f.franchiseCode}
                      </span>
                      <div className="truncate max-w-[100px]">
                        <p className="text-xs font-bold text-slate-200 truncate">{f.franchiseName}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {f.active ? f.ownerDisplayName : 'INACTIVE'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-extrabold text-emerald-400 font-mono">
                        {formatLakhs(f.purseLakhs)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {f.squadSize}/25 <span className="text-slate-500">({f.overseasCount} OS)</span>
                      </p>
                    </div>
                  </div>

                  {isMine && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-blue-400 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Your Team • Tap for Analysis</span>
                      </span>
                      <span className="text-slate-400 font-mono">Spent: {formatLakhs(f.spentLakhs)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: 3D Arena or Main Lot Block (6 cols) */}
        <div className="lg:col-span-6 space-y-4 order-1 lg:order-2">
          {/* Optional 3D Arena Stage */}
          {viewMode === 'ARENA' && (
            <div className="w-full h-[280px] sm:h-[340px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative">
              <AuctionArena3D
                snapshot={snapshot}
                currentLot={currentLot}
                cameraFocus={currentLot?.highestBidderFranchise ? 'BIDDER' : 'STAGE'}
                isSold={isSold}
                liteMode={isLiteMode}
                onFallbackToHud={() => setViewMode('HUD')}
              />
            </div>
          )}

          {/* Category Preview Roster Screen when category is not active */}
          {!snapshot.categoryActive ? (
            <div className="bg-[#0e1424]/90 rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-5">
              {/* Category Header */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs">
                      SET {snapshot.currentCategory || 'M1'}
                    </span>
                    <span className="text-xs text-amber-300 font-mono font-bold">
                      Category {(snapshot.categoryIndex ?? 0) + 1} of {snapshot.totalCategories || 39}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                    {snapshot.currentCategoryName || 'Category Pool Preview'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {snapshot.categoryPlayerCount || 0} Players in this set • All human franchises must confirm readiness to begin bidding.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Confirmed Ready</span>
                  <span className="font-mono text-lg font-black text-emerald-400">
                    {confirmedFranchises.length} / {activeHumanFranchises.length}
                  </span>
                </div>
              </div>

              {/* Franchise Readiness Bar */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Active Human Franchise Readiness ({confirmedFranchises.length}/{activeHumanFranchises.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {activeHumanFranchises.map((f) => {
                    const isConf = confirmedFranchises.includes(f.franchiseCode);
                    return (
                      <div
                        key={f.franchiseCode}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          isConf
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-center space-x-1.5 mb-0.5">
                          <span className="font-mono text-xs font-black">{f.franchiseCode}</span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[60px]">({f.ownerDisplayName})</span>
                        </div>
                        <span className="text-[10px] font-mono block font-bold">
                          {isConf ? '✓ READY' : 'WAITING'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                {!myCategoryConfirmed && selectedFranchiseCode && (
                  <button
                    type="button"
                    onClick={() => onProceedCategory?.(selectedFranchiseCode)}
                    className="w-full py-4 px-6 rounded-2xl font-black text-base bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 text-slate-950 shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>CONFIRM & PROCEED TO {snapshot.currentCategory || 'CATEGORY'} ({selectedFranchiseCode})</span>
                  </button>
                )}

                {myCategoryConfirmed && !allCategoryConfirmed && (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 text-xs flex items-center justify-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
                    <span>Waiting for other team managers to confirm... ({confirmedFranchises.length}/{activeHumanFranchises.length} Ready)</span>
                  </div>
                )}

                {isHost && (
                  <button
                    type="button"
                    onClick={handleDraw}
                    disabled={drawLoading}
                    className="w-full py-3 rounded-xl font-bold text-xs sm:text-sm bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>🎲 {allCategoryConfirmed ? 'DRAW FIRST CHIT IN CATEGORY' : 'START CATEGORY NOW (HOST OVERRIDE)'}</span>
                  </button>
                )}
              </div>

              {/* Category Roster */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Category Player Roster ({snapshot.categoryPlayers?.length || 0})
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Vote SKIP on players to bypass them from auction. When all active teams vote skip, player is bypassed.
                    </p>
                  </div>
                  {isHost && (
                    <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
                      Host Override Active
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                  {(snapshot.categoryPlayers || []).map((p) => {
                    const preSkips = snapshot.playerPreSkips?.[p.id] || [];
                    const myPreSkipped = selectedFranchiseCode ? preSkips.includes(selectedFranchiseCode) : false;
                    const isBypassed = p.status === 'UNSOLD' || (activeHumanFranchises.length > 0 && preSkips.length >= activeHumanFranchises.length);
                    const isSold = p.status === 'SOLD';

                    return (
                      <div
                        key={p.id}
                        onClick={() => onSelectPlayerProfile(p)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between space-x-3 cursor-pointer transition-all ${
                          isSold
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : isBypassed
                            ? 'bg-slate-900/40 border-slate-800/80 opacity-60'
                            : myPreSkipped
                            ? 'bg-amber-500/10 border-amber-500/40'
                            : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          <img
                            src={resolvePlayerPhoto(p, 'thumbnail').url}
                            alt={p.fullName}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-950 border border-slate-700 flex-shrink-0"
                            onError={handleImageFallback}
                          />
                          <div className="flex-1 truncate">
                            <div className="flex items-center space-x-1.5 truncate">
                              <span className="font-mono text-amber-400 text-xs font-bold flex-shrink-0">#{p.lotNumber}</span>
                              <span className="font-bold text-white text-xs truncate">{p.fullName}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 truncate">
                              <span>{p.role}</span>
                              <span>•</span>
                              <span>{p.country}</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-mono font-bold">
                                {formatLakhs(p.basePrice / 100000)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status / Pre-Skip Vote Action */}
                        <div className="flex-shrink-0 flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          {isSold ? (
                            <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              SOLD
                            </span>
                          ) : isBypassed ? (
                            <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              ✓ BYPASSED
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onPreSkipPlayer?.(selectedFranchiseCode || '', p.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center space-x-1 cursor-pointer ${
                                myPreSkipped
                                  ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow-sm'
                                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                              }`}
                              title={myPreSkipped ? 'Your franchise voted to skip this player' : 'Vote to skip this player from category draw'}
                            >
                              <span>{myPreSkipped ? '✓ SKIPPED' : 'SKIP'}</span>
                              <span className="text-[9px] font-mono opacity-75">
                                ({preSkips.length}/{activeHumanFranchises.length})
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
          /* Central Authoritative Lot Card */
          <div className="bg-[#0e1424]/90 rounded-3xl border border-slate-800 p-4 sm:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            {currentLot ? (
              <div className="relative z-10 space-y-4 sm:space-y-5">
                {/* Lot Header: Lot #, Set, Role & Server-Authoritative Timer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow-md">
                      LOT #{currentLot.lotNumber}
                    </span>
                    <span className="px-2 py-1 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700">
                      SET {currentLot.player.auctionSet}
                    </span>
                    <span className="px-2 py-1 rounded-xl bg-slate-800 text-amber-300 font-semibold text-xs border border-slate-700">
                      {currentLot.player.role}
                    </span>
                  </div>

                  {/* Synchronized Timer with Going Once / Twice States */}
                  <div className="flex items-center space-x-2">
                    <Clock
                      className={`w-5 h-5 ${
                        currentLot.phase === 'THIRD_CALL'
                          ? 'text-red-500 animate-bounce'
                          : currentLot.phase === 'GOING_TWICE'
                          ? 'text-red-400 animate-bounce'
                          : currentLot.phase === 'GOING_ONCE'
                          ? 'text-amber-400 animate-pulse'
                          : currentLot.phase === 'REVEALING'
                          ? 'text-blue-400 animate-pulse'
                          : 'text-emerald-400'
                      }`}
                    />
                    <div className="flex flex-col items-end">
                      <span
                        className={`font-mono font-black text-xl sm:text-2xl px-3 py-0.5 rounded-xl border ${
                          currentLot.phase === 'THIRD_CALL'
                            ? 'bg-red-600/40 text-red-200 border-red-400 animate-pulse shadow-lg shadow-red-500/40'
                            : currentLot.phase === 'GOING_TWICE'
                            ? 'bg-red-500/25 text-red-400 border-red-500/50 animate-pulse'
                            : currentLot.phase === 'GOING_ONCE'
                            ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 animate-pulse'
                            : currentLot.phase === 'REVEALING'
                            ? 'bg-blue-500/25 text-blue-300 border-blue-500/50'
                            : 'bg-slate-900 text-emerald-400 border-slate-700'
                        }`}
                      >
                        {timeLeft}s
                      </span>
                      {currentLot.phase === 'REVEALING' && (
                        <span className="text-[9px] font-black tracking-wider text-blue-400 uppercase">
                          INTRODUCING...
                        </span>
                      )}
                      {currentLot.phase === 'BIDDING' && (
                        <span className="text-[9px] font-black tracking-wider text-emerald-400 uppercase">
                          OPEN BIDDING (10s)
                        </span>
                      )}
                      {currentLot.phase === 'GOING_ONCE' && (
                        <span className="text-[9px] font-black tracking-wider text-amber-400 uppercase animate-pulse">
                          GOING ONCE...
                        </span>
                      )}
                      {currentLot.phase === 'GOING_TWICE' && (
                        <span className="text-[9px] font-black tracking-wider text-red-400 uppercase animate-bounce">
                          GOING TWICE!
                        </span>
                      )}
                      {currentLot.phase === 'THIRD_CALL' && (
                        <span className="text-[9px] font-black tracking-wider text-red-300 uppercase animate-ping">
                          FINAL CALL!!
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Player Profile Snapshot */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/70 p-3 sm:p-4 rounded-2xl border border-slate-800">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-2xl overflow-hidden bg-slate-800 border-2 border-slate-700 shadow-lg">
                    <img
                      src={resolvePlayerPhoto(currentLot.player, 'card').url}
                      alt={currentLot.player.fullName}
                      className="w-full h-full object-cover"
                      onError={handleImageFallback}
                    />
                    {currentLot.player.isOverseas && (
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold">
                        OS
                      </span>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {currentLot.player.fullName}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {currentLot.player.country} • {currentLot.player.age} yrs • {currentLot.player.battingStyle || 'Right-hand bat'}
                    </p>
                    <p className="text-xs text-amber-400 font-semibold mt-1">
                      Reserve Base Price: {formatLakhs(currentLot.basePriceLakhs)}
                    </p>

                    <button
                      onClick={() => onSelectPlayerProfile(currentLot.player)}
                      className="mt-2 inline-flex items-center space-x-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 underline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Career Stats & Provenance</span>
                    </button>
                  </div>
                </div>

                {/* Role-Specific Key Metrics */}
                <AuctionScreenKeyStats player={currentLot.player} />

                {/* Current Bid & Leader Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-[#11192e] to-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-700 text-center relative overflow-hidden shadow-inner">
                  <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                    {effectiveHighestBidderCode ? 'Current Highest Bid' : 'Opening Base Price'}
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono my-1 tracking-tight transition-all duration-300">
                    {formatLakhs(effectiveCurrentBidLakhs > 0 ? effectiveCurrentBidLakhs : currentLot.basePriceLakhs)}
                  </div>

                  {effectiveHighestBidderCode ? (
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mt-1 animate-pulse">
                      <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>
                        Leader: {effectiveHighestBidderCode}{' '}
                        {myFranchises.some((f) => f.franchiseCode === effectiveHighestBidderCode) ? '(YOUR TEAM)' : ''}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic block mt-1">
                      No bids yet • Waiting for opening bid
                    </span>
                  )}
                </div>

                {/* Participant Bidding Panel */}
                {isBiddingPhase && !snapshot.isPaused && (
                  <div className="space-y-3 pt-1">
                    {/* Owned Franchises Selector & Status Bar */}
                    {myFranchises.length > 1 ? (
                      <div className="bg-slate-950/90 p-3 rounded-2xl border border-amber-500/30 shadow-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-400 font-black uppercase tracking-wider text-[11px]">
                              YOUR TEAMS ({myFranchises.length}) — CLICK TO SHIFT ACTIVE BIDDER:
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                            Selected: <strong className="text-amber-300 font-mono font-bold">{selectedFranchiseCode}</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                          {myFranchises.map((f) => {
                            const isSelected = f.franchiseCode === selectedFranchiseCode;
                            const isLeader = currentLot?.highestBidderFranchise === f.franchiseCode;

                            return (
                              <button
                                key={f.franchiseCode}
                                type="button"
                                onClick={() => setSelectedFranchiseCode(f.franchiseCode)}
                                className={`relative p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                                  isSelected
                                    ? 'bg-gradient-to-br from-amber-500/20 via-slate-900 to-amber-500/10 border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/10'
                                    : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-700/80 opacity-75 hover:opacity-100'
                                }`}
                              >
                                <div className="flex items-center justify-between space-x-1">
                                  <div className="flex items-center space-x-2">
                                    <img
                                      src={resolveTeamLogo(f.franchiseCode)}
                                      alt={f.franchiseCode}
                                      className="w-5 h-5 object-contain"
                                      onError={handleImageFallback}
                                    />
                                    <span className={`font-black font-mono text-xs ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                                      {f.franchiseCode}
                                    </span>
                                  </div>

                                  {isLeader && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-[9px] uppercase tracking-wider flex items-center space-x-0.5 animate-pulse">
                                      <Flame className="w-2.5 h-2.5" />
                                      <span>LEADER</span>
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                                  <span className="font-mono font-bold text-emerald-400">
                                    {formatLakhs(f.purseLakhs)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {f.squadSize}/25
                                  </span>
                                </div>

                                {isSelected && (
                                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-slate-950 shadow-sm flex items-center justify-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : activeFranchise ? (
                      <div className="flex items-center justify-between text-xs bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-inner">
                        <div className="flex items-center space-x-3">
                          <img
                            src={resolveTeamLogo(activeFranchise.franchiseCode)}
                            alt={activeFranchise.franchiseCode}
                            className="w-7 h-7 object-contain"
                            onError={handleImageFallback}
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-400 font-semibold text-[11px]">YOUR TEAM:</span>
                              <span className="font-black text-amber-300 font-mono text-sm">{activeFranchise.franchiseCode}</span>
                              <span className="text-slate-400 font-medium hidden sm:inline">({activeFranchise.franchiseName})</span>
                            </div>
                            <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-0.5">
                              <span>Purse: <strong className="text-emerald-400 font-mono font-bold">{formatLakhs(activeFranchise.purseLakhs)}</strong></span>
                              <span>•</span>
                              <span>Squad: <strong className="text-slate-200 font-mono font-bold">{activeFranchise.squadSize}/25</strong></span>
                              <span>•</span>
                              <span>OS: <strong className="text-slate-200 font-mono font-bold">{activeFranchise.overseasCount}/8</strong></span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenAnalysis(activeFranchise.franchiseCode)}
                          className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Squad Analysis</span>
                        </button>
                      </div>
                    ) : null}

                    {/* Main Bid Action Button Row: BID + SKIP + STATS */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (currentLot.phase === 'REVEALING') {
                            onIntroComplete?.();
                          }
                          handleBid(nextBidAmountLakhs);
                        }}
                        disabled={!canBid}
                        className="flex-1 py-4 px-6 rounded-2xl font-black text-base sm:text-lg transition-all flex items-center justify-center space-x-2 cursor-pointer bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 text-slate-950 shadow-xl shadow-emerald-500/25 hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <DollarSign className="w-5 h-5" />
                        <span>
                          {`BID ${formatLakhs(nextBidAmountLakhs)} as ${selectedFranchiseCode || 'TEAM'}`}
                        </span>
                      </button>

                      {/* Skip Player Button */}
                      {onSkipPlayer && (
                        <button
                          type="button"
                          onClick={() => onSkipPlayer(selectedFranchiseCode)}
                          disabled={hasSkipped || !activeFranchise || !activeFranchise.active}
                          className={`py-4 px-4 rounded-2xl font-bold text-xs border flex items-center justify-center space-x-1.5 transition-all ${
                            hasSkipped
                              ? 'bg-slate-800 border-slate-700 text-slate-400 cursor-default'
                              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white active:scale-98 cursor-pointer'
                          }`}
                          title={hasSkipped ? 'Your franchise has skipped this player' : 'Skip bidding on this player'}
                        >
                          <span className="whitespace-nowrap">{hasSkipped ? '✓ SKIPPED' : 'SKIP PLAYER'}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({skipUserCount}/{uniqueHumanMembers.length || activeHumanFranchises.length})</span>
                        </button>
                      )}

                      {/* View Full Stats Button */}
                      <button
                        type="button"
                        onClick={() => onSelectPlayerProfile(currentLot.player)}
                        className="py-4 px-4 rounded-2xl font-bold text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 text-blue-400 hover:text-blue-300 flex items-center justify-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap"
                        title="Open 8-Tab Detailed Dossier"
                      >
                        <Eye className="w-4 h-4" />
                        <span>STATS</span>
                      </button>

                      {/* View My Squad / Team Analysis Button */}
                      <button
                        type="button"
                        onClick={() => onOpenAnalysis(selectedFranchiseCode || activeFranchise?.franchiseCode)}
                        className="py-4 px-4 rounded-2xl font-bold text-xs bg-slate-900 hover:bg-slate-800 border border-blue-500/40 text-blue-400 hover:text-blue-300 flex items-center justify-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap shadow-md shadow-blue-500/10 active:scale-98"
                        title="View My Team Squad, Remaining Purse & Complete Analysis"
                      >
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                        <span>MY SQUAD</span>
                      </button>
                    </div>

                    {/* Quick bid increments */}
                    {canBid && (
                      <div className="flex items-center justify-center space-x-2 text-xs">
                        <span className="text-slate-500">Quick Increment:</span>
                        {[10, 20, 50].map((inc) => (
                          <button
                            key={inc}
                            onClick={() => handleBid(currentLot.currentBidLakhs + inc)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-mono font-semibold transition-colors"
                          >
                            +{inc}L ({formatLakhs(currentLot.currentBidLakhs + inc)})
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Custom bid: owner types any amount they want (>= minimum next bid) */}
                    {canBid && currentLot && (
                      <div className="flex items-center justify-center space-x-2 text-xs mt-1.5">
                        <span className="text-slate-500 font-semibold">Your call:</span>
                        <input
                          type="number"
                          step="0.25"
                          min={0}
                          value={customBidCr}
                          onChange={(e) => setCustomBidCr(e.target.value)}
                          placeholder={`>= ${formatLakhs(nextBidAmountLakhs)}`}
                          className="w-24 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-slate-500">Cr</span>
                        <button
                          onClick={() => {
                            const cr = parseFloat(customBidCr);
                            if (!Number.isFinite(cr)) return;
                            const lakhs = Math.round(cr * 100);
                            if (lakhs < nextBidAmountLakhs) {
                              setActionError(`Minimum next bid is ${formatLakhs(nextBidAmountLakhs)}.`);
                              return;
                            }
                            setActionError(null);
                            setCustomBidCr('');
                            handleBid(lakhs);
                          }}
                          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition-colors active:scale-95"
                        >
                          BID
                        </button>
                      </div>
                    )}

                    {/* Cannot Bid Explanation */}
                    {!canBid && cannotBidReason && (
                      <p className="text-center text-xs text-amber-400 font-medium">
                        {cannotBidReason}
                      </p>
                    )}
                  </div>
                )}

                {/* Host Draw Next Chit Button */}
                {isWaiting && (
                  <div className="pt-3 text-center">
                    {isHost ? (
                      <button
                        onClick={handleDraw}
                        disabled={drawLoading}
                        className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        <Sparkles className="w-5 h-5" />
                        <span>{drawLoading ? 'Drawing from 369 Roster...' : '🎲 DRAW NEXT CHIT'}</span>
                      </button>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs flex items-center justify-center space-x-2">
                        <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                        <span>Waiting for host to draw next chit...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Pre-auction idle state */
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Authoritative Auction Arena Ready</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  The room is live with 10 official franchises and zero AI. Click Draw to reveal the first player.
                </p>
                <div className="flex items-center justify-center space-x-3 pt-2">
                  {isHost && (
                    <button
                      onClick={handleDraw}
                      disabled={drawLoading}
                      className="py-3 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center space-x-2"
                    >
                      <span>🎲 DRAW FIRST PLAYER</span>
                    </button>
                  )}
                  <button
                    onClick={() => onOpenAnalysis(selectedFranchiseCode || activeFranchise?.franchiseCode)}
                    className="py-3 px-5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 border border-blue-500/40 text-blue-400 hover:text-blue-300 shadow-md transition-all cursor-pointer flex items-center space-x-2"
                  >
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <span>VIEW SQUAD & PURSE</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Right Column: Realtime Bid Feed & Log (3 cols) */}
        <div className="lg:col-span-3 space-y-4 order-2 lg:order-3">
          {/* Live Realtime Bids Feed */}
          <div className="bg-[#0e1424]/90 rounded-2xl border border-slate-800 p-4 shadow-lg flex flex-col h-[300px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 pb-2 border-b border-slate-800">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Current Lot Bids</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1">
              {currentLot && currentLot.bidHistory.length > 0 ? (
                currentLot.bidHistory.map((b, idx) => (
                  <div
                    key={`${b.franchiseCode}-${b.amountLakhs}-${idx}`}
                    className={`p-2 rounded-xl text-xs border flex items-center justify-between transition-all ${
                      idx === 0
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-white font-bold shadow-md shadow-emerald-500/10'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-mono px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold">
                        {b.franchiseCode}
                      </span>
                      <span className="truncate max-w-[85px]">{b.displayName}</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-black">
                      {formatLakhs(b.amountLakhs)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                  No bids for this lot yet
                </div>
              )}
            </div>
          </div>

          {/* Completed Lots Summary */}
          <div className="bg-[#0e1424]/90 rounded-2xl border border-slate-800 p-4 shadow-lg flex flex-col h-[260px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 pb-2 border-b border-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Auction Log ({snapshot.completedLots.length})</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-1.5 mt-2 pr-1 text-xs">
              {snapshot.completedLots.length > 0 ? (
                snapshot.completedLots.map((lot) => (
                  <div
                    key={lot.lotNumber}
                    className="p-2 rounded-lg bg-slate-900/50 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="truncate max-w-[130px]">
                      <p className="font-bold text-slate-200 truncate">
                        #{lot.lotNumber} {lot.player.shortName || lot.player.fullName}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {lot.highestBidderFranchise ? `Sold to ${lot.highestBidderFranchise}` : 'Unsold'}
                      </p>
                    </div>
                    <span className={`font-mono font-bold text-[11px] ${lot.highestBidderFranchise ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {lot.highestBidderFranchise ? formatLakhs(lot.currentBidLakhs) : 'UNSOLD'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                  No completed lots yet
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Live Joined Members Modal */}
        {showMembersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-md bg-[#0e1424] border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-white text-base">Active Room Members ({snapshot.allocation.humanMemberCount})</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMembersModal(false)}
                  className="text-slate-400 hover:text-white text-sm p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {snapshot.allocation.members.map((m) => {
                  const myClaimedFranchises = Object.values(snapshot.franchises).filter(f => f.ownerMemberId === m.memberId);
                  return (
                    <div
                      key={m.memberId}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-100">{m.displayName}</span>
                            {m.isHost && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                                HOST
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {myClaimedFranchises.length > 0
                              ? `Controlling: ${myClaimedFranchises.map(f => f.franchiseCode).join(', ')}`
                              : 'Spectating / No Franchise'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        CONNECTED
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
