import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { AllocationState, RoomMember, Player, RoomStateSnapshot } from './types';
import * as api from './services/api';
import { AuthModal } from './components/AuthModal';
import { ResultsScreen } from './components/ResultsScreen';
import { realtimeManager, AuctionEventMessage } from './services/websocket';
import { FranchiseCard } from './components/FranchiseCard';
import { LobbyHeader } from './components/LobbyHeader';
import { MemberList } from './components/MemberList';
import { HostRebalanceModal } from './components/HostRebalanceModal';
import { FinalAllocationModal } from './components/FinalAllocationModal';
import { ActivityFeed } from './components/ActivityFeed';
import { PlayerPool } from './components/PlayerPool';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { PlayerGalleryModal } from './components/PlayerGalleryModal';
import { RandomChitReveal } from './components/RandomChitReveal';
// Phase 5: heavy screens are code-split out of the initial bundle
const TeamAnalysis = React.lazy(() => import('./components/TeamAnalysis').then((m) => ({ default: m.TeamAnalysis })));
const MatchScreen = React.lazy(() => import('./components/MatchScreen').then((m) => ({ default: m.MatchScreen })));
const SeasonScreen = React.lazy(() => import('./components/SeasonScreen').then((m) => ({ default: m.SeasonScreen })));
import { AuctionRoom } from './components/AuctionRoom';
import { Trophy, Shield, AlertCircle, ArrowRight, Sparkles, CheckCircle2, Users } from 'lucide-react';

export type AppRoute = 'HOME' | 'CREATE' | 'JOIN' | 'ROOM';
export type AppMode = 'INITIALIZING' | 'HOME' | 'ROOM_JOIN_CREATE' | 'LOBBY' | 'AUCTION' | 'STOPPED' | 'COMPLETED';

function parseRoute(): { route: AppRoute; roomCode?: string } {
  if (typeof window === 'undefined') return { route: 'HOME' };
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

  if (pathname === '/' || pathname === '/home') {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      return { route: 'ROOM', roomCode: roomParam.trim().toUpperCase() };
    }
    return { route: 'HOME' };
  }

  if (pathname === '/create') {
    return { route: 'CREATE' };
  }

  if (pathname === '/join') {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') || '';
    return { route: 'JOIN', roomCode: code.trim().toUpperCase() };
  }

  if (pathname.startsWith('/room/')) {
    const code = pathname.replace('/room/', '').split('/')[0].trim().toUpperCase();
    if (code) {
      return { route: 'ROOM', roomCode: code };
    }
  }

  return { route: 'HOME' };
}

export const App: React.FC = () => {
  // Application Mode & Routing
  const [appMode, setAppMode] = useState<AppMode>('INITIALIZING');
  const [roomCode, setRoomCode] = useState<string>('');
  const [currentMemberId, setCurrentMemberId] = useState<string>('');
  const [allocationState, setAllocationState] = useState<AllocationState | null>(null);
  const [snapshot, setSnapshot] = useState<RoomStateSnapshot | null>(null);
  const [savedSession, setSavedSession] = useState<{ roomCode: string; memberId: string; status: string } | null>(null);
  // Optional account auth: logged-in players get a stable identity + room resume across devices
  const [auth, setAuth] = useState<api.AuthResult | null>(() => {
    try {
      const raw = localStorage.getItem('ax_auth');
      return raw ? (JSON.parse(raw) as api.AuthResult) : null;
    } catch {
      return null;
    }
  });
  const [showAuth, setShowAuth] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  const handleAuthSuccess = (result: api.AuthResult) => {
    setAuth(result);
    setShowAuth(false);
    localStorage.setItem('ax_auth', JSON.stringify(result));
    // Resume as the stable account member id — works across devices
    const savedCode = localStorage.getItem('ax_room_code');
    if (savedCode && localStorage.getItem('ax_member_id') !== result.memberId) {
      localStorage.setItem('ax_member_id', result.memberId);
      window.location.reload();
    }
  };

  const handleSignOut = () => {
    setAuth(null);
    localStorage.removeItem('ax_auth');
  };

  // Signed-in accounts: list their rooms so a paused game can be resumed later
  const [myGames, setMyGames] = useState<Array<{ roomCode: string; roomName: string; status: string; isHost?: boolean }>>([]);

  useEffect(() => {
    if (!auth || roomCode) return;
    api.myRooms(auth.token).then(setMyGames).catch(() => {});
  }, [auth, roomCode]);

  const handleResumeGame = async (g: { roomCode: string; status: string }) => {
    if (!auth) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const state = await api.joinRoom(g.roomCode, auth.displayName, auth.token);
      setRoomCode(g.roomCode);
      setCurrentMemberId(auth.memberId);
      setAllocationState(state);
      localStorage.setItem('ax_room_code', g.roomCode);
      localStorage.setItem('ax_member_id', auth.memberId);
      window.history.pushState(null, '', `/room/${g.roomCode}`);
      setAppMode(g.status === 'AUCTION_ACTIVE' || g.status === 'PAUSED' ? 'AUCTION' : g.status === 'STOPPED' ? 'STOPPED' : 'LOBBY');
      loadRoomState(g.roomCode);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveGame = async (g: { roomCode: string }) => {
    if (!auth) return;
    if (!window.confirm(`Remove room ${g.roomCode} permanently?`)) return;
    await api.deleteRoom(g.roomCode, auth.memberId, auth.token);
    setMyGames((prev) => prev.filter((x) => x.roomCode !== g.roomCode));
  };

  // Forms
  const [createName, setCreateName] = useState('IPL Mega Auction 2026');
  const [hostName, setHostName] = useState('Hemanth');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [systemAlert, setSystemAlert] = useState<string | null>(null);
  const [isFinalModalOpen, setIsFinalModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Phase 4 Player Data & Media States
  const [players, setPlayers] = useState<Player[]>([]);
  const [isPoolOpen, setIsPoolOpen] = useState(false);
  const [isChitOpen, setIsChitOpen] = useState(false);
  const [activeChitPlayer, setActiveChitPlayer] = useState<Player | null>(null);
  const [selectedProfilePlayer, setSelectedProfilePlayer] = useState<Player | null>(null);
  const [isTeamAnalysisOpen, setIsTeamAnalysisOpen] = useState(false);
  const [analysisFranchiseCode, setAnalysisFranchiseCode] = useState<string | undefined>(undefined);
  // Phase 5: mini match & season mode
  const [lastEvent, setLastEvent] = useState<AuctionEventMessage | null>(null);
  const [isMatchOpen, setIsMatchOpen] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [activeFixtureLabel, setActiveFixtureLabel] = useState<string | undefined>(undefined);
  const [isSeasonOpen, setIsSeasonOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const handleOpenAnalysis = useCallback((code?: string) => {
    setAnalysisFranchiseCode(code);
    setIsTeamAnalysisOpen(true);
  }, []);

  const handleSkipCategory = useCallback(async () => {
    if (!roomCode || !currentMemberId) return;
    try {
      const snap = await api.skipCategory(roomCode, currentMemberId);
      setSnapshot(snap);
      setAllocationState(snap.allocation);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to skip category');
    }
  }, [roomCode, currentMemberId]);

  const handleOpenMatch = useCallback((matchId: string | null, fixtureLabel?: string) => {
    setActiveMatchId(matchId);
    setActiveFixtureLabel(fixtureLabel);
    setIsMatchOpen(true);
  }, []);

  // Load 369 player roster on mount
  useEffect(() => {
    api.getPlayers()
      .then((data) => setPlayers(data))
      .catch((e) => console.warn('Could not load player roster:', e));
  }, []);

  // Clear transient error after 5s
  useEffect(() => {
    if (errorMessage) {
      const t = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMessage]);

  // Authoritative state loader
  const loadRoomState = useCallback(async (code: string) => {
    try {
      const snap = await api.getRoomState(code);
      setSnapshot(snap);
      setAllocationState(snap.allocation);
      if (snap.status === 'AUCTION_ACTIVE' || snap.status === 'PAUSED') {
        setAppMode('AUCTION');
      } else if (snap.status === 'STOPPED') {
        setAppMode('STOPPED');
      } else if (snap.status === 'COMPLETED') {
        setAppMode('COMPLETED');
      } else if (snap.status === 'LOBBY' || snap.status === 'READY') {
        setAppMode('LOBBY');
      }
    } catch (e: any) {
      try {
        const alloc = await api.getAllocationState(code);
        setAllocationState(alloc);
        setAppMode('LOBBY');
      } catch (err: any) {
        console.warn('Failed to load state', err);
      }
    }
  }, []);

  // Initial Route parsing & Session validation (Zero Flash of Stale Content)
  useEffect(() => {
    let isMounted = true;
    const initRouteAndSession = async () => {
      const initialRoute = parseRoute();
      const savedCode = localStorage.getItem('ax_room_code') || '';
      const savedMember = localStorage.getItem('ax_member_id') || '';

      const checkMemberValid = (snap: RoomStateSnapshot, memberId: string) => {
        if (!memberId) return false;
        const inMembers = snap.allocation?.members?.some((m) => m.memberId === memberId);
        const inFranchises = Object.values(snap.franchises || {}).some((f) => f.ownerMemberId === memberId);
        const isHost = snap.hostMemberId === memberId;
        return Boolean(inMembers || inFranchises || isHost);
      };

      const determineAppMode = (status: string): AppMode => {
        if (status === 'AUCTION_ACTIVE' || status === 'PAUSED') return 'AUCTION';
        if (status === 'STOPPED') return 'STOPPED';
        if (status === 'COMPLETED') return 'COMPLETED';
        return 'LOBBY';
      };

      // Case 1: Opened Root "/" or "/home" -> AUTOMATICALLY RESUME ACTIVE SESSION IF VALID
      if (initialRoute.route === 'HOME') {
        if (savedCode && savedMember) {
          try {
            const state = await api.getRoomState(savedCode);
            if (isMounted && state && checkMemberValid(state, savedMember)) {
              if (state.status === 'AUCTION_ACTIVE' || state.status === 'PAUSED' || state.status === 'LOBBY' || state.status === 'READY') {
                setRoomCode(savedCode);
                setCurrentMemberId(savedMember);
                setSnapshot(state);
                setAllocationState(state.allocation);
                const mode = determineAppMode(state.status);
                setAppMode(mode);
                window.history.replaceState(null, '', `/room/${savedCode}`);
                return;
              } else {
                setSavedSession({ roomCode: savedCode, memberId: savedMember, status: state.status });
              }
            } else if (state) {
              localStorage.removeItem('ax_room_code');
              localStorage.removeItem('ax_member_id');
            }
          } catch (e: any) {
            if (e?.status === 404) {
              localStorage.removeItem('ax_room_code');
              localStorage.removeItem('ax_member_id');
            }
          }
        }
        if (isMounted) setAppMode('HOME');
        return;
      }

      // Case 2: Opened "/create"
      if (initialRoute.route === 'CREATE') {
        if (isMounted) {
          setActiveTab('create');
          setAppMode('ROOM_JOIN_CREATE');
        }
        return;
      }

      // Case 3: Opened "/join"
      if (initialRoute.route === 'JOIN') {
        if (isMounted) {
          if (initialRoute.roomCode) setJoinCode(initialRoute.roomCode);
          setActiveTab('join');
          setAppMode('ROOM_JOIN_CREATE');
        }
        return;
      }

      // Case 4: Opened "/room/:roomCode" -> REFRESH OR DIRECT LINK
      if (initialRoute.route === 'ROOM' && initialRoute.roomCode) {
        const code = initialRoute.roomCode;
        try {
          console.log('[APP_START] Validating room ' + code + ' from authoritative server...');
          const snap = await api.getRoomState(code);
          if (!isMounted) return;

          const isMember = savedMember && (checkMemberValid(snap, savedMember) || savedCode === code);
          if (isMember) {
            setRoomCode(code);
            setCurrentMemberId(savedMember);
            setSnapshot(snap);
            setAllocationState(snap.allocation);
            localStorage.setItem('ax_room_code', code);
            localStorage.setItem('ax_member_id', savedMember);

            const targetMode = determineAppMode(snap.status);
            setAppMode(targetMode);
          } else {
            // Room exists, but visitor is not an existing member -> prompt to join
            setJoinCode(code);
            setActiveTab('join');
            setAppMode('ROOM_JOIN_CREATE');
            window.history.replaceState(null, '', `/join?code=${code}`);
            setErrorMessage(`Please enter your display name to join room ${code}`);
          }
        } catch (err: any) {
          if (!isMounted) return;
          if (err?.status === 404) {
            localStorage.removeItem('ax_room_code');
            localStorage.removeItem('ax_member_id');
            window.history.replaceState(null, '', '/');
            setErrorMessage(`Room ${code} was not found or has been closed.`);
            setAppMode('HOME');
          } else {
            // Network glitch / server starting -> keep session, retry connection!
            if (savedMember && savedCode === code) {
              setRoomCode(code);
              setCurrentMemberId(savedMember);
              setAppMode('AUCTION');
              setSystemAlert(`Reconnecting to room ${code}...`);
            } else {
              setAppMode('HOME');
            }
          }
        }
      }
    };

    initRouteAndSession();
    return () => { isMounted = false; };
  }, []);

  // Popstate listener for browser Back/Forward navigation
  useEffect(() => {
    const onPopState = () => {
      const r = parseRoute();
      if (r.route === 'HOME') {
        setAppMode('HOME');
      } else if (r.route === 'CREATE') {
        setActiveTab('create');
        setAppMode('ROOM_JOIN_CREATE');
      } else if (r.route === 'JOIN') {
        if (r.roomCode) setJoinCode(r.roomCode);
        setActiveTab('join');
        setAppMode('ROOM_JOIN_CREATE');
      } else if (r.route === 'ROOM' && r.roomCode && r.roomCode !== roomCode) {
        setAppMode('INITIALIZING');
        loadRoomState(r.roomCode);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [roomCode, loadRoomState]);

  // Synchronize appMode when snapshot updates
  useEffect(() => {
    if (!snapshot || !roomCode) return;
    if (snapshot.status === 'AUCTION_ACTIVE' || snapshot.status === 'PAUSED') {
      if (appMode !== 'AUCTION') setAppMode('AUCTION');
    } else if (snapshot.status === 'STOPPED') {
      if (appMode !== 'STOPPED') setAppMode('STOPPED');
    } else if (snapshot.status === 'COMPLETED') {
      if (appMode !== 'COMPLETED') setAppMode('COMPLETED');
    } else if (snapshot.status === 'LOBBY' || snapshot.status === 'READY') {
      if (appMode !== 'LOBBY') setAppMode('LOBBY');
    }
  }, [snapshot?.status, roomCode, appMode]);

  // Realtime subscription & polling fallback
  useEffect(() => {
    if (!roomCode || appMode === 'HOME' || appMode === 'INITIALIZING') return;

    loadRoomState(roomCode);

    realtimeManager.connect(roomCode, {
      onAllocation: (newAlloc) => {
        setAllocationState(newAlloc);
      },
      onSnapshot: (newSnap) => {
        setSnapshot(newSnap);
        setAllocationState(newSnap.allocation);
      },
      onAuctionEvent: (event) => {
        setLastEvent(event);
        if (event.eventType === 'AUCTION_STARTED') {
          setSystemAlert('Auction has started! All participants are entering the Auction Room.');
        } else if (event.eventType === 'PLAYER_SOLD') {
          setSystemAlert(`SOLD! ${event.payload?.winner || 'Team'} won lot #${event.payload?.lot?.lotNumber}!`);
        } else if (event.eventType === 'PLAYER_UNSOLD') {
          setSystemAlert(`UNSOLD! Lot #${event.payload?.lotNumber || ''} went unsold.`);
        } else if (event.eventType === 'PLAYER_PRE_SKIPPED') {
          setSystemAlert(`PRE-SKIPPED! ${event.payload?.playerName || 'Player'} was bypassed by all teams.`);
        } else if (event.eventType === 'AUCTION_STOPPED') {
          setAppMode('STOPPED');
        }
      },
      onBid: (_bid) => {
        // Realtime bid notification
      },
      onAlert: (alertMsg) => {
        setSystemAlert(alertMsg);
      },
    });

    // Fallback polling only if WS is disconnected / slow (10s interval)
    const interval = setInterval(() => {
      if (!realtimeManager.isConnected()) {
        loadRoomState(roomCode);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      realtimeManager.disconnect();
    };
  }, [roomCode, appMode, loadRoomState]);

  // Handle Create Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.createRoom(createName, hostName, auth?.token);
      setRoomCode(res.roomCode);
      setCurrentMemberId(res.hostMemberId);
      setAllocationState(res.state);
      localStorage.setItem('ax_room_code', res.roomCode);
      localStorage.setItem('ax_member_id', res.hostMemberId);
      window.history.pushState(null, '', `/room/${res.roomCode}`);
      setAppMode('LOBBY');
      loadRoomState(res.roomCode);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Join Room
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !joinName.trim()) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const state = await api.joinRoom(joinCode.toUpperCase(), joinName, auth?.token);
      const me = state.members.find((m) => m.displayName === joinName);
      if (me) {
        setCurrentMemberId(me.memberId);
        localStorage.setItem('ax_member_id', me.memberId);
      }
      setRoomCode(state.roomCode);
      setAllocationState(state);
      localStorage.setItem('ax_room_code', state.roomCode);
      window.history.pushState(null, '', `/room/${state.roomCode}`);
      if (state.status === 'AUCTION_ACTIVE' || state.status === 'PAUSED') {
        setAppMode('AUCTION');
      } else {
        setAppMode('LOBBY');
      }
      loadRoomState(state.roomCode);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Leave Room
  const handleLeaveRoom = async () => {
    if (roomCode && currentMemberId) {
      try {
        await api.leaveRoom(roomCode, currentMemberId);
      } catch (e) {
        // ignore
      }
    }
    realtimeManager.disconnect();
    setRoomCode('');
    setCurrentMemberId('');
    setSnapshot(null);
    setAllocationState(null);
    setSavedSession(null);
    localStorage.removeItem('ax_room_code');
    localStorage.removeItem('ax_member_id');
    window.history.pushState(null, '', '/');
    setAppMode('HOME');
  };

  // Claim franchise
  const handleClaim = async (franchiseCode: string) => {
    if (!roomCode || !currentMemberId) return;
    try {
      setErrorMessage(null);
      const state = await api.claimFranchise(roomCode, currentMemberId, franchiseCode);
      setAllocationState(state);
      loadRoomState(roomCode);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Release franchise
  const handleRelease = async (franchiseCode: string) => {
    if (!roomCode || !currentMemberId) return;
    try {
      setErrorMessage(null);
      const state = await api.releaseFranchise(roomCode, currentMemberId, franchiseCode);
      setAllocationState(state);
      loadRoomState(roomCode);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Switch franchise
  const handleSwitch = async (oldCode: string, newCode: string) => {
    if (!roomCode || !currentMemberId) return;
    try {
      setErrorMessage(null);
      const state = await api.switchFranchise(roomCode, currentMemberId, oldCode, newCode);
      setAllocationState(state);
      loadRoomState(roomCode);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Rebalance member teams
  const handleConfirmRebalance = async (franchisesToKeep: string[]) => {
    if (!roomCode || !currentMemberId) return;
    try {
      setErrorMessage(null);
      const state = await api.rebalanceHostTeams(roomCode, currentMemberId, franchisesToKeep);
      setAllocationState(state);
      loadRoomState(roomCode);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Set member requested quota
  const handleSetQuota = async (memberId: string, requestedQuota: number) => {
    if (!roomCode) return;
    try {
      setErrorMessage(null);
      const state = await api.setMemberQuota(roomCode, memberId, requestedQuota);
      setAllocationState(state);
      loadRoomState(roomCode);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Apply recommended quota distribution
  const handleApplyRecommended = async () => {
    if (!roomCode) return;
    try {
      setErrorMessage(null);
      const state = await api.applyRecommended(roomCode);
      setAllocationState(state);
      loadRoomState(roomCode);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Lock and Start Auction
  const handleLockAndStart = async () => {
    if (!roomCode || !currentMemberId) return;
    try {
      setErrorMessage(null);
      setIsFinalModalOpen(false);
      const state = await api.lockAndStartAuction(roomCode, currentMemberId);
      setAllocationState(state);
      await loadRoomState(roomCode);
      setAppMode('AUCTION');
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // --- Phase 5: Live Auction Engine Callbacks ---

  const handleDrawNextPlayer = async () => {
    if (!roomCode || !currentMemberId) return;
    try {
      const snap = await api.drawNextPlayer(roomCode, currentMemberId);
      setSnapshot(snap);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handlePlaceBid = async (franchiseCode: string, amountLakhs: number) => {
    if (!roomCode || !currentMemberId) return;
    const snap = await api.placeBid(roomCode, currentMemberId, franchiseCode, amountLakhs);
    setSnapshot(snap);
  };

  const handlePause = async () => {
    if (!roomCode || !currentMemberId) return;
    const snap = await api.pauseAuction(roomCode, currentMemberId);
    setSnapshot(snap);
  };

  const handleResume = async () => {
    if (!roomCode || !currentMemberId) return;
    const snap = await api.resumeAuction(roomCode, currentMemberId);
    setSnapshot(snap);
  };

  const handleStop = async () => {
    if (!roomCode || !currentMemberId) return;
    const snap = await api.stopAuction(roomCode, currentMemberId);
    setSnapshot(snap);
    setAppMode('STOPPED');
  };

  const handleProceedCategory = async (franchiseCode: string) => {
    if (!roomCode || !currentMemberId) return;
    try {
      const snap = await api.proceedCategory(roomCode, currentMemberId, franchiseCode);
      setSnapshot(snap);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleSkipPlayer = async (franchiseCode: string) => {
    if (!roomCode || !currentMemberId) return;
    try {
      const snap = await api.skipPlayer(roomCode, currentMemberId, franchiseCode);
      setSnapshot(snap);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleIntroComplete = async () => {
    if (!roomCode || !currentMemberId) return;
    try {
      const snap = await api.introComplete(roomCode, currentMemberId);
      setSnapshot(snap);
    } catch (err: any) {
      // ignore
    }
  };

  const handlePreSkipPlayer = async (franchiseCode: string, playerId: string) => {
    if (!roomCode || !currentMemberId) return;
    try {
      const snap = await api.preSkipPlayer(roomCode, currentMemberId, franchiseCode, playerId);
      setSnapshot(snap);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const currentMember: RoomMember | null =
    allocationState?.members.find((m) => m.memberId === currentMemberId) || null;

  // 1. INITIALIZING SKELETON SCREEN (Prevents flash of stale content)
  if (appMode === 'INITIALIZING') {
    return (
      <div className="min-h-screen bg-[#070a12] flex flex-col justify-center items-center p-4 select-none relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 font-black text-slate-950 text-3xl flex items-center justify-center shadow-xl shadow-amber-500/30 mb-6 animate-pulse">
            XI
          </div>
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            Connecting to Auction Arena...
          </p>
        </div>
      </div>
    );
  }

  // 2. HOME SCREEN (Pure Landing Page for fresh visitors opening "/")
  if (appMode === 'HOME') {
    return (
      <div className="min-h-screen bg-[#070a12] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md text-center">
          {/* Logo Crest */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-400 font-black text-slate-950 text-4xl shadow-2xl shadow-amber-500/40 mb-6 ring-4 ring-amber-400/20">
            XI
          </div>

          {/* Primary Typography */}
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
            AUCTION XI
          </h1>
          <p className="text-base sm:text-lg font-bold text-amber-400/90 tracking-wide uppercase">
            Premium Indian Cricket Auction
          </p>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 font-medium tracking-widest uppercase">
            Real-time • Multiplayer • 3D
          </p>

          {errorMessage && (
            <div className="mt-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center justify-center space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Optional Resume Saved Session Pill */}
          {savedSession && (
            <div className="mt-6 p-3.5 rounded-2xl bg-slate-900/95 border border-amber-500/40 flex items-center justify-between text-xs backdrop-blur-xl shadow-xl animate-fadeIn">
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-medium">Active Room Session:</span>
                <span className="text-amber-400 font-mono font-bold tracking-wider">{savedSession.roomCode}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    setAppMode('INITIALIZING');
                    window.history.pushState(null, '', `/room/${savedSession.roomCode}`);
                    setRoomCode(savedSession.roomCode);
                    setCurrentMemberId(savedSession.memberId);
                    await loadRoomState(savedSession.roomCode);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-transform active:scale-95 cursor-pointer shadow-md shadow-amber-500/20"
                >
                  Resume →
                </button>
                <button
                  type="button"
                  title="Dismiss session"
                  onClick={() => {
                    localStorage.removeItem('ax_room_code');
                    localStorage.removeItem('ax_member_id');
                    setSavedSession(null);
                  }}
                  className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="mt-8 space-y-3.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                setAppMode('ROOM_JOIN_CREATE');
                window.history.pushState(null, '', '/create');
              }}
              className="w-full py-4 px-6 rounded-2xl font-black text-base uppercase tracking-wider bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>CREATE ROOM</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('join');
                setAppMode('ROOM_JOIN_CREATE');
                window.history.pushState(null, '', '/join');
              }}
              className="w-full py-4 px-6 rounded-2xl font-black text-base uppercase tracking-wider bg-[#0e1424]/90 hover:bg-[#141e34] text-white border-2 border-slate-700/80 hover:border-amber-500/50 shadow-xl active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Users className="w-5 h-5 text-amber-400" />
              <span>JOIN ROOM</span>
            </button>
          </div>

          {/* Core Feature Badges */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Real Players</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center space-x-1">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Zero AI Franchises</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Authoritative Engine</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. ROOM JOIN / CREATE FORM SCREEN
  if (appMode === 'ROOM_JOIN_CREATE' || !roomCode) {
    return (
      <div className="min-h-screen bg-[#070a12] flex flex-col justify-center items-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-md">
          {/* Top Bar with Back to Home navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setAppMode('HOME');
                window.history.pushState(null, '', '/');
              }}
              className="text-xs font-bold text-slate-400 hover:text-amber-400 flex items-center space-x-1 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-900"
            >
              <span>← Back to Home</span>
            </button>
            <span className="text-xs font-mono font-bold text-amber-400">AUCTION XI</span>
          </div>

          {/* Form Card */}
          <div className="bg-[#0e1424]/90 rounded-3xl border border-slate-800/90 p-6 shadow-2xl backdrop-blur-xl">
            {/* Tab switch */}
            <div className="flex rounded-xl bg-slate-900/90 p-1 mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('create');
                  window.history.pushState(null, '', '/create');
                }}
                className={`w-1/2 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'create'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CREATE ROOM
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('join');
                  window.history.pushState(null, '', '/join');
                }}
                className={`w-1/2 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'join'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                JOIN ROOM
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {activeTab === 'create' ? (
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Host Display Name
                  </label>
                  <input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    required
                    placeholder="e.g. Hemanth"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Creating...' : 'Create Auction Room'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    6-Character Room Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="e.g. ABC123"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm uppercase tracking-widest focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Your Display Name
                  </label>
                  <input
                    type="text"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    required
                    placeholder="e.g. Virat"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Joining...' : 'Join Auction Room'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
            {/* My saved games (signed-in accounts): resume a paused game or remove it */}
            {auth && myGames.length > 0 && (
              <div className="mt-4 rounded-2xl border border-indigo-500/40 bg-indigo-500/5 p-4 space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-300">🎮 My games</h3>
                {myGames.map((g) => (
                  <div key={g.roomCode} className="flex items-center justify-between rounded-xl bg-slate-900/70 border border-slate-800 px-3 py-2">
                    <div>
                      <span className="font-bold text-white text-sm">{g.roomName}</span>
                      <span className="text-[10px] text-slate-500 ml-2">{g.roomCode} • {g.status === 'PAUSED' ? '⏸ paused' : g.status === 'AUCTION_ACTIVE' ? '🔴 live' : g.status.toLowerCase()}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleResumeGame(g)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black transition-colors"
                      >
                        ▶ RESUME
                      </button>
                      {g.isHost && (
                        <button
                          onClick={() => handleRemoveGame(g)}
                          className="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-black hover:bg-red-500/30 transition-colors"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. LIVE AUCTION ROOM VIEW: Triggered when appMode is AUCTION
  const currentStatus = snapshot?.status || allocationState?.status;
  if (appMode === 'AUCTION' && snapshot && (currentStatus === 'AUCTION_ACTIVE' || currentStatus === 'PAUSED')) {
    return (
      <>
        <AuctionRoom
          snapshot={snapshot}
          currentMemberId={currentMemberId}
          onDrawNextPlayer={handleDrawNextPlayer}
          onPlaceBid={handlePlaceBid}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onLeaveRoom={handleLeaveRoom}
          onOpenPool={() => setIsPoolOpen(true)}
          onOpenAnalysis={handleOpenAnalysis}
          onSkipCategory={handleSkipCategory}
          onSelectPlayerProfile={(p) => setSelectedProfilePlayer(p)}
          onProceedCategory={handleProceedCategory}
          onSkipPlayer={handleSkipPlayer}
          onPreSkipPlayer={handlePreSkipPlayer}
          onIntroComplete={handleIntroComplete}
        />

        {/* Permanent Side Player Pool Drawer */}
        <PlayerPool
          players={players}
          snapshot={snapshot}
          currentMemberId={currentMemberId}
          isOpen={isPoolOpen}
          onClose={() => setIsPoolOpen(false)}
          onSelectPlayer={(p) => setSelectedProfilePlayer(p)}
          onPreSkipPlayer={handlePreSkipPlayer}
        />

        {/* Full Player Profile Modal */}
        <PlayerProfileModal
          player={selectedProfilePlayer}
          isOpen={Boolean(selectedProfilePlayer)}
          onClose={() => setSelectedProfilePlayer(null)}
        />

        {/* Franchise Team Analysis Modal */}
        {/* Optional sign-in (account resume across devices) */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuth={handleAuthSuccess}
        />
      )}
      {!roomCode && (
        <button
          onClick={() => (auth ? handleSignOut() : setShowAuth(true))}
          className="fixed top-4 right-4 z-50 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-bold text-slate-200 hover:border-indigo-400 transition-all"
          title={auth ? 'Signed in — click to sign out' : 'Optional: sign in to save your game'}
        >
          {auth ? `👤 ${auth.displayName}` : '🔐 Sign in (optional)'}
        </button>
      )}

      <Suspense fallback={null}>
          <TeamAnalysis
            state={allocationState || snapshot.allocation}
            snapshot={snapshot}
            isOpen={isTeamAnalysisOpen}
            onClose={() => setIsTeamAnalysisOpen(false)}
            initialFranchiseCode={analysisFranchiseCode}
            currentMemberId={currentMemberId}
            onSelectPlayerProfile={(p) => setSelectedProfilePlayer(p)}
          />
        </Suspense>

              {/* Results gallery — real persisted data, visible to everyone */}
      {isResultsOpen && roomCode && (
        <ResultsScreen roomCode={roomCode} isOpen={isResultsOpen} onClose={() => setIsResultsOpen(false)} />
      )}

{/* Phase 5: Mini Match & Season Mode launchers */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          <button
            onClick={() => handleOpenMatch(null)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-black shadow-xl shadow-red-500/25 hover:brightness-110 active:scale-95 transition-all"
            title="2-over mini match between two human squads"
          >
            ⚡ Mini Match
          </button>
          <button
            onClick={() => setIsSeasonOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all"
            title="League -> Playoffs -> Final with mini matches"
          >
            🏆 Season
          </button>
                  <button
            onClick={() => setIsResultsOpen(true)}
            className="px-3 py-1.5 rounded-full bg-amber-500/90 hover:bg-amber-400 text-slate-950 text-[11px] font-black shadow-lg transition-all"
          >
            🏆 Results
          </button>
</div>

        <Suspense fallback={null}>
          <MatchScreen
            onNewMatch={() => setActiveMatchId(null)}
            roomCode={roomCode}
            currentMemberId={currentMemberId}
            snapshot={snapshot}
            isOpen={isMatchOpen}
            onClose={() => setIsMatchOpen(false)}
            matchId={activeMatchId}
            fixtureLabel={activeFixtureLabel}
            lastEvent={lastEvent}
            onMatchStarted={(id) => setActiveMatchId(id)}
          />
          <SeasonScreen
            roomCode={roomCode}
            currentMemberId={currentMemberId}
            snapshot={snapshot}
            isOpen={isSeasonOpen}
            onClose={() => setIsSeasonOpen(false)}
            lastEvent={lastEvent}
            onOpenMatch={(id, label) => {
              setIsSeasonOpen(false);
              handleOpenMatch(id, label);
            }}
          />
        </Suspense>
      </>
    );
  }

  // 4. STOPPED AUCTION VIEW
  if (appMode === 'STOPPED' || currentStatus === 'STOPPED') {
    return (
      <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-xl">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-white">AUCTION STOPPED</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-md">
          The auctioneer has officially stopped the auction session for room {roomCode}.
        </p>
        <button
          onClick={handleLeaveRoom}
          className="mt-6 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all cursor-pointer"
        >
          Return to Home Screen
        </button>
      </div>
    );
  }

  // 5. COMPLETED AUCTION VIEW
  if (appMode === 'COMPLETED' || currentStatus === 'COMPLETED') {
    return (
      <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
          <Trophy className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-white">AUCTION COMPLETED</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-md">
          All lots have been auctioned! The auction session for room {roomCode} is complete.
        </p>
        <button
          onClick={handleLeaveRoom}
          className="mt-6 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all cursor-pointer"
        >
          Return to Home Screen
        </button>
      </div>
    );
  }

  // 7. LOBBY VIEW (When appMode is LOBBY and room is active)
  if (appMode === 'LOBBY' && !allocationState) {
    return (
      <div className="min-h-screen bg-[#070a12] flex items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mr-3" />
        <span>Loading room...</span>
      </div>
    );
  }

  // Final Safety Fallback: NEVER default to AUCTION
  if (appMode !== 'LOBBY' || !allocationState) {
    return (
      <div className="min-h-screen bg-[#070a12] flex flex-col items-center justify-center text-white p-4 select-none">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 font-bold text-lg">
            XI
          </div>
          <h3 className="text-lg font-bold text-slate-200">Session Context Idle</h3>
          <p className="text-xs text-slate-400">
            No active auction room in this context. Return to the main landing page to create or join a room.
          </p>
          <button
            onClick={() => {
              setAppMode('HOME');
              window.history.replaceState(null, '', '/');
            }}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const isRoomMutable = allocationState.status === 'LOBBY' || allocationState.status === 'READY';

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col">
      {/* Lobby Header */}
      <LobbyHeader
        state={allocationState}
        currentMember={currentMember}
        onOpenFinalModal={() => setIsFinalModalOpen(true)}
        onOpenPool={() => setIsPoolOpen(true)}
        onOpenAnalysis={() => handleOpenAnalysis()}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onLeaveRoom={handleLeaveRoom}
        onDrawChit={() => {
          if (players.length > 0) {
            const randomDemo = players[Math.floor(Math.random() * players.length)];
            setActiveChitPlayer(randomDemo);
            setIsChitOpen(true);
          }
        }}
      />

      {/* Member count warning */}
      {allocationState.humanMemberCount < 2 && isRoomMutable && (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-2.5 text-xs text-blue-300 font-medium flex items-center space-x-2">
          <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>
            <strong>LOBBY / TEST MODE:</strong> At least 2 human members are required to start the auction. Share room code <strong className="text-amber-400 font-mono tracking-widest">{allocationState.roomCode}</strong> with friends to join.
          </span>
        </div>
      )}

      {systemAlert && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 text-xs text-amber-300 font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>{systemAlert}</span>
          </div>
          <button onClick={() => setSystemAlert(null)} className="text-amber-400 hover:text-amber-200 font-bold">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-500/15 border-b border-red-500/30 px-6 py-2.5 text-xs text-red-300 font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200 font-bold">✕</button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center 10 Franchise Grid */}
        <section className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0e1424]/60 p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>10 Official Franchises (100% Human)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentMember
                  ? `Your assigned quota: ${currentMember.targetQuota} teams (Holding ${currentMember.heldCount}/${currentMember.targetQuota})`
                  : 'Select an OPEN franchise to claim for the auction'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                SELECTED: {allocationState.claimedTeamCount} / 10
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                UNSELECTED: {allocationState.openTeamCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                HUMAN PLAYERS: {allocationState.humanMemberCount}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-400 border border-slate-700 font-mono font-bold">
                AI: 0
              </span>
            </div>
          </div>

          {/* 10 Franchise Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allocationState.seats.map((seat) => (
              <FranchiseCard
                key={seat.code}
                seat={seat}
                currentMember={currentMember}
                isRoomMutable={isRoomMutable}
                rebalancePending={allocationState.rebalanceRequired}
                onClaim={handleClaim}
                onRelease={handleRelease}
                onSwitch={handleSwitch}
                onOpenAnalysis={handleOpenAnalysis}
              />
            ))}
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-[#0e1424]/90 rounded-2xl border border-slate-800 p-5 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2 mb-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Fair Human Allocation Model</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              All 10 franchises are distributed among active human members. Remainder distributed to Host first, then members in join order:
            </p>

            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              {[
                { members: 1, split: '10' },
                { members: 2, split: '5 / 5' },
                { members: 3, split: '4 / 3 / 3' },
                { members: 4, split: '3 / 3 / 2 / 2' },
                { members: 5, split: '2 / 2 / 2 / 2 / 2' },
                { members: 6, split: '2 / 2 / 2 / 2 / 1 / 1' },
                { members: 7, split: '2 / 2 / 2 / 1 / 1 / 1 / 1' },
                { members: 8, split: '2 / 2 / 1 / 1 / 1 / 1 / 1 / 1' },
                { members: 9, split: '2 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1' },
                { members: 10, split: '1 each (10 humans)' },
              ].map((row) => {
                const isCurrentCount = row.members === allocationState.humanMemberCount;
                return (
                  <div
                    key={row.members}
                    className={`flex items-center justify-between p-1.5 px-2 rounded-lg border ${
                      isCurrentCount
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>{row.members} {row.members === 1 ? 'Human' : 'Humans'}</span>
                    <span className="truncate max-w-[90px]">{row.split}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Every human member must own ≥ 1 franchise</span>
              </div>
              <div className="flex items-center space-x-1.5 text-amber-300 font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Unselected franchises remain inactive (Zero AI)</span>
              </div>
            </div>
          </div>

          <MemberList
            members={allocationState.members}
            currentMemberId={currentMemberId}
            isHost={currentMember?.isHost || false}
            isRoomMutable={isRoomMutable}
            totalRequestedQuota={allocationState.totalRequestedQuota}
            onSetQuota={handleSetQuota}
            onApplyRecommended={handleApplyRecommended}
          />

          <ActivityFeed events={allocationState.activityFeed} />
        </aside>
      </main>

      {/* Member Rebalance Dialog */}
      {currentMember && allocationState.rebalanceRequired && currentMember.heldCount > currentMember.targetQuota && (
        <HostRebalanceModal
          isOpen={true}
          oldMax={currentMember.heldCount}
          newMax={currentMember.targetQuota}
          hostSeats={allocationState.seats.filter(
            (s) => s.ownerMemberId === currentMemberId
          )}
          onConfirmRebalance={handleConfirmRebalance}
        />
      )}

      {/* Final Allocation Review Modal */}
      <FinalAllocationModal
        isOpen={isFinalModalOpen}
        seats={allocationState.seats}
        onConfirmLockStart={handleLockAndStart}
        onCancel={() => setIsFinalModalOpen(false)}
      />

      {/* Phase 4 Modals */}
      <PlayerPool
        players={players}
        isOpen={isPoolOpen}
        onClose={() => setIsPoolOpen(false)}
        onSelectPlayer={(p) => setSelectedProfilePlayer(p)}
      />

      <PlayerGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />

      <RandomChitReveal
        player={activeChitPlayer}
        isOpen={isChitOpen}
        onClose={() => setIsChitOpen(false)}
        actionButtonLabel={
          currentMember?.isHost
            ? allocationState.canStartAuction
              ? "Lock & Start Auction"
              : "Cannot Start Yet"
            : undefined
        }
        canStart={currentMember?.isHost ? allocationState.canStartAuction : false}
        disabledReason={
          allocationState.humanMemberCount < 2
            ? "At least 2 human members are required to start the auction."
            : allocationState.validationMessage || "Allocation must be ready to start."
        }
        onStartBidding={
          currentMember?.isHost && allocationState.canStartAuction
            ? () => {
                setIsChitOpen(false);
                setIsFinalModalOpen(true);
              }
            : undefined
        }
      />

      <PlayerProfileModal
        player={selectedProfilePlayer}
        isOpen={Boolean(selectedProfilePlayer)}
        onClose={() => setSelectedProfilePlayer(null)}
      />

      <Suspense fallback={null}>
        <TeamAnalysis
          state={allocationState}
          snapshot={snapshot || undefined}
          isOpen={isTeamAnalysisOpen}
          onClose={() => setIsTeamAnalysisOpen(false)}
          initialFranchiseCode={analysisFranchiseCode}
          currentMemberId={currentMemberId}
          onSelectPlayerProfile={(p) => setSelectedProfilePlayer(p)}
        />
      </Suspense>
    </div>
  );
};
