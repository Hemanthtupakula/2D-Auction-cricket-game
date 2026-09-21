import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MatchAwaitInput, MiniMatch, MatchBall, Player, RoomStateSnapshot } from '../types';
import { TimingMeter, zoneOf } from './TimingMeter';
import { battingRating, bowlingRating } from './TeamAnalysis';
import * as api from '../services/api';
import { AuctionEventMessage } from '../services/websocket';
import { resolvePlayerPhoto, resolveTeamLogo, handleImageFallback } from '../services/mediaResolver';
import { MiniMatch2DArena } from './MiniMatch2DArena';
import { X, Swords, Play, Zap, Shield, CheckCircle, Lock, Coins, Trophy } from 'lucide-react';


interface MatchScreenProps {
  roomCode: string;
  currentMemberId: string;
  snapshot: RoomStateSnapshot;
  isOpen: boolean;
  onClose: () => void;
  matchId?: string | null;
  fixtureLabel?: string;
  lastEvent: AuctionEventMessage | null;
  onMatchStarted?: (matchId: string) => void;
  onNewMatch?: () => void;
}

const OUTCOME_STYLES: Record<string, string> = {
  DOT: 'bg-slate-700 text-slate-200',
  RUNS: 'bg-blue-600 text-white',
  FOUR: 'bg-emerald-500 text-slate-950 font-black',
  SIX: 'bg-purple-500 text-white font-black',
  WICKET: 'bg-red-600 text-white font-black',
  WIDE: 'bg-amber-500 text-slate-950 font-black',
  NO_BALL: 'bg-orange-500 text-white font-black',
};

const formatOvers = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

/** Playing-XI picker component */
const XiPicker: React.FC<{
  title: string;
  squad: Player[];
  pick: string[];
  setPick: (ids: string[]) => void;
}> = ({ title, squad, pick, setPick }) => {
  const overseas = squad.filter((pl) => pick.includes(pl.id) && pl.isOverseas).length;
  const toggle = (id: string) => {
    if (pick.includes(id)) {
      setPick(pick.filter((x) => x !== id));
    } else if (pick.length < 11) {
      const pl = squad.find((x) => x.id === id);
      if (pl?.isOverseas && overseas >= 4) return;
      setPick([...pick, id]);
    }
  };
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{title}</span>
        <span className="text-[9px] font-bold text-slate-500">
          {pick.length === 0 ? 'Auto Best XI' : `${pick.length}/11 picked • ${overseas}/4 overseas ✈`}
        </span>
      </div>
      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
        {squad.map((pl) => {
          const isBowler = (pl.role || '').toLowerCase().includes('bowl');
          const rating = Math.round(isBowler ? bowlingRating(pl) : battingRating(pl));
          const on = pick.includes(pl.id);
          return (
            <button
              key={pl.id}
              onClick={() => toggle(pl.id)}
              className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-left text-[11px] transition-all ${
                on ? 'bg-indigo-500/25 border border-indigo-400/60 text-white' : 'bg-slate-900/60 border border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="truncate">{on ? '✓ ' : ''}{pl.shortName || pl.fullName}{pl.isOverseas ? ' ✈' : ''}</span>
              <span className={`font-black ${rating >= 70 ? 'text-emerald-400' : rating >= 50 ? 'text-amber-300' : 'text-slate-500'}`}>
                {isBowler ? '🎯' : '🏏'} {rating}
              </span>
            </button>
          );
        })}
      </div>
      {pick.length > 0 && pick.length < 5 && (
        <p className="text-[9px] text-red-400 font-bold mt-1">Pick at least 5 players — or clear all for auto Best XI</p>
      )}
    </div>
  );
};

export const MatchScreen: React.FC<MatchScreenProps> = ({
  roomCode,
  currentMemberId,
  snapshot,
  isOpen,
  onClose,
  matchId,
  fixtureLabel,
  lastEvent,
  onMatchStarted,
  onNewMatch,
}) => {
  const [match, setMatch] = useState<MiniMatch | null>(null);
  const [balls, setBalls] = useState<MatchBall[]>([]);
  const [homeCode, setHomeCode] = useState('');
  const [awayCode, setAwayCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [awaitInput, setAwaitInput] = useState<MatchAwaitInput | null>(null);
  const [batLocked, setBatLocked] = useState<string | null>(null);
  const [bowlLocked, setBowlLocked] = useState<string | null>(null);
  const [pendingChallenges, setPendingChallenges] = useState<MiniMatch[]>([]);
  const [matchOvers, setMatchOvers] = useState(2);
  const [homePick, setHomePick] = useState<string[]>([]);
  const [awayPick, setAwayPick] = useState<string[]>([]);
  const [milestone, setMilestone] = useState<{ kind: string; playerName: string; franchise: string } | null>(null);

  // Opener selection state
  const [selectedStrikerId, setSelectedStrikerId] = useState<string>('');
  const [selectedNonStrikerId, setSelectedNonStrikerId] = useState<string>('');
  const [selectedBowlerId, setSelectedBowlerId] = useState<string>('');

  // 10s XI preview only. Post-wicket and next-over setup have NO timers.
  const [xiPreviewSeconds, setXiPreviewSeconds] = useState<number | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);
  const activeMatchId = matchId || match?.matchId || null;

  // Load match state on open
  useEffect(() => {
    if (!isOpen || !activeMatchId) return;
    api.getMatch(roomCode, activeMatchId)
      .then((m) => {
        setMatch(m);
        setBalls(m.ballLog || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load match'));
  }, [isOpen, activeMatchId, roomCode]);

  // 10-second XI preview timer trigger
  useEffect(() => {
    if (match?.status === 'XI_PREVIEW') {
      if (xiPreviewSeconds === null) {
        setXiPreviewSeconds(10);
      }
    } else {
      setXiPreviewSeconds(null);
    }
  }, [match?.status]);

  useEffect(() => {
    if (xiPreviewSeconds === null || xiPreviewSeconds <= 0) return;
    const t = setInterval(() => {
      setXiPreviewSeconds((prev) => (prev !== null && prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [xiPreviewSeconds]);

  // WebSocket event handler
  useEffect(() => {
    if (!isOpen || !lastEvent) return;
    if (lastEvent.eventType === 'MILESTONE') {
      const m = lastEvent.payload as { kind: string; playerName: string; franchise: string };
      setMilestone(m);
      return;
    }
    if (lastEvent.eventType === 'MATCH_AWAIT_INPUT') {
      const payload = lastEvent.payload as MatchAwaitInput;
      if (payload.matchId && payload.matchId === activeMatchId) {
        setAwaitInput(payload);
        setBatLocked(null);
        setBowlLocked(null);
      }
      return;
    }
    if (
      lastEvent.eventType === 'MATCH_CHALLENGE' ||
      lastEvent.eventType === 'MATCH_READY_UPDATE' ||
      lastEvent.eventType === 'MATCH_TOSS_RESULT' ||
      lastEvent.eventType === 'MATCH_STATE_UPDATE' ||
      lastEvent.eventType === 'MATCH_ACTION_LOCKED'
    ) {
      const summary = lastEvent.payload as { matchId?: string };
      if (!activeMatchId) {
        api.listMatches(roomCode)
          .then((ms) => setPendingChallenges((ms || []).filter((m) => m.status === 'AWAITING_READY' || m.status === 'TEAM_XI_SELECTION')))
          .catch(() => {});
      } else if (summary.matchId === activeMatchId) {
        api.getMatch(roomCode, summary.matchId).then(setMatch).catch(() => {});
      }
      return;
    }
    if (lastEvent.eventType === 'MATCH_BALL_RESOLVED') {
      const payload = lastEvent.payload as { matchId: string; ball: MatchBall };
      if (payload.matchId && payload.matchId === activeMatchId && payload.ball) {
        setAwaitInput(null);
        setBalls((prev) => {
          if (prev.some((b) => b.ballNumber === payload.ball.ballNumber && b.innings === payload.ball.innings)) return prev;
          const next = [...prev, payload.ball];
          return next;
        });
        api.getMatch(roomCode, activeMatchId).then(setMatch).catch(() => {});
      }
    } else if (lastEvent.eventType === 'MATCH_COMPLETE') {
      const summary = lastEvent.payload as Record<string, unknown> & { matchId?: string };
      if (summary.matchId && summary.matchId === activeMatchId) {
        api.getMatch(roomCode, summary.matchId).then(setMatch).catch(() => {});
      }
    } else if (lastEvent.eventType === 'MATCH_STARTED') {
      const summary = lastEvent.payload as { matchId?: string };
      if (summary.matchId && summary.matchId === activeMatchId) {
        api.getMatch(roomCode, summary.matchId).then(setMatch).catch(() => {});
      }
    }
  }, [lastEvent, isOpen, activeMatchId, roomCode]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [balls.length]);

  useEffect(() => {
    if (!milestone) return;
    const t = setTimeout(() => setMilestone(null), 2600);
    return () => clearTimeout(t);
  }, [milestone]);

  useEffect(() => {
    if (!isOpen || activeMatchId) return;
    api.listMatches(roomCode)
      .then((ms) => setPendingChallenges((ms || []).filter((m) => m.status === 'AWAITING_READY' || m.status === 'TEAM_XI_SELECTION')))
      .catch(() => {});
  }, [isOpen, activeMatchId, roomCode]);

  const humanFranchises = useMemo(
    () => Object.values(snapshot.franchises || {}).filter((f) => f.active && f.squadSize >= 5),
    [snapshot]
  );

  const isHost = snapshot.hostMemberId === currentMemberId;
  const myFranchiseCodes = useMemo(
    () => Object.values(snapshot.franchises || {}).filter((f) => f.ownerMemberId === currentMemberId).map((f) => f.franchiseCode),
    [snapshot, currentMemberId]
  );
  const lastBall = balls.length > 0 ? balls[balls.length - 1] : null;

  const startChallenge = async () => {
    if (!homeCode || !awayCode) return;
    setStarting(true);
    setError(null);
    try {
      const m = await api.startMatch(
        roomCode,
        currentMemberId,
        homeCode,
        awayCode,
        matchOvers,
        myFranchiseCodes.includes(homeCode) && homePick.length > 0 ? homePick : undefined,
        myFranchiseCodes.includes(awayCode) && awayPick.length > 0 ? awayPick : undefined
      );
      setMatch(m);
      setBalls([]);
      onMatchStarted?.(m.matchId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start match');
    } finally {
      setStarting(false);
    }
  };

  // Live Batting and Bowling Data Cards
  const liveBattingStats = useMemo(() => {
    if (!match) return null;
    const currentInningsBalls = balls.filter((b) => b.innings === match.innings);
    const strikerId = match.currentStrikerId || awaitInput?.batterId;
    const nonStrikerId = match.currentNonStrikerId;

    const computeBatter = (id: string | null | undefined) => {
      if (!id) return null;
      const name = match.playerNames?.[id] || id;
      const bBalls = currentInningsBalls.filter((b) => b.batterId === id);
      const runs = (match.runsByPlayer?.[id] ?? bBalls.reduce((s, b) => s + b.runs, 0));
      const faced = bBalls.filter((b) => b.outcome !== 'WIDE').length;
      const fours = bBalls.filter((b) => b.outcome === 'FOUR').length;
      const sixes = bBalls.filter((b) => b.outcome === 'SIX').length;
      const sr = faced > 0 ? ((runs / faced) * 100).toFixed(1) : '0.0';
      return { id, name, runs, faced, fours, sixes, sr, isOnStrike: id === strikerId };
    };

    const striker = computeBatter(strikerId);
    const nonStriker = computeBatter(nonStrikerId);

    return { striker, nonStriker };
  }, [match, awaitInput, balls]);

  const liveBowlingStats = useMemo(() => {
    if (!match) return null;
    const bowlerId = match.currentBowlerId || awaitInput?.bowlerId;
    if (!bowlerId) return null;
    const bowlerName = match.playerNames?.[bowlerId] || awaitInput?.bowlerName || bowlerId;
    const bowlerBalls = balls.filter((b) => b.bowlerId === bowlerId && b.innings === match.innings);
    const legalBalls = bowlerBalls.filter((b) => b.outcome !== 'WIDE' && b.outcome !== 'NO_BALL').length;
    const runsConceded = bowlerBalls.reduce((s, b) => s + b.runs, 0);
    const wickets = (match.wicketsByPlayer?.[bowlerId] ?? bowlerBalls.filter((b) => b.outcome === 'WICKET').length);
    const dots = bowlerBalls.filter((b) => b.outcome === 'DOT').length;
    const oversFormatted = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
    const econ = legalBalls > 0 ? (runsConceded / (legalBalls / 6)).toFixed(2) : '0.00';
    return {
      id: bowlerId,
      name: bowlerName,
      overs: oversFormatted,
      runs: runsConceded,
      wickets,
      dots,
      econ,
    };
  }, [match, awaitInput, balls]);

  const scorecard = useMemo(() => {
    if (!match) return null;
    const buildBatting = (inningsNo: number, franchise: string, xi: Player[]) => {
      const inningsBalls = balls.filter((b) => b.innings === inningsNo && b.battingFranchise === franchise);
      return xi.map((p) => {
        const facedBalls = inningsBalls.filter((b) => b.batterId === p.id && b.outcome !== 'WIDE').length;
        const runs = match.runsByPlayer?.[p.id] ?? inningsBalls.filter((b) => b.batterId === p.id).reduce((sum, b) => sum + b.runs, 0);
        const fours = inningsBalls.filter((b) => b.batterId === p.id && b.outcome === 'FOUR').length;
        const sixes = inningsBalls.filter((b) => b.batterId === p.id && b.outcome === 'SIX').length;
        const out = inningsBalls.some((b) => b.batterId === p.id && b.wicket);
        const isCurrent = p.id === match.currentStrikerId || p.id === match.currentNonStrikerId;
        return { id: p.id, name: p.shortName || p.fullName, runs, balls: facedBalls, fours, sixes, out, isCurrent, sr: facedBalls ? ((runs / facedBalls) * 100).toFixed(1) : '0.0' };
      }).filter((r) => r.balls > 0 || r.runs > 0 || r.out || r.isCurrent);
    };
    const buildBowling = (inningsNo: number, franchise: string, xi: Player[]) => {
      const inningsBalls = balls.filter((b) => b.innings === inningsNo && b.bowlingFranchise === franchise);
      return xi.map((p) => {
        const bowlerBalls = inningsBalls.filter((b) => b.bowlerId === p.id);
        const legal = bowlerBalls.filter((b) => b.outcome !== 'WIDE' && b.outcome !== 'NO_BALL').length;
        const runs = bowlerBalls.reduce((sum, b) => sum + b.runs, 0);
        const wickets = match.wicketsByPlayer?.[p.id] ?? bowlerBalls.filter((b) => b.wicket).length;
        return { id: p.id, name: p.shortName || p.fullName, overs: `${Math.floor(legal / 6)}.${legal % 6}`, runs, wickets, economy: legal ? (runs / (legal / 6)).toFixed(2) : '0.00' };
      }).filter((r) => r.overs !== '0.0' || r.runs > 0 || r.wickets > 0);
    };
    return {
      firstBatting: buildBatting(1, match.homeFranchise, match.homeXi || []),
      firstBowling: buildBowling(1, match.awayFranchise, match.awayXi || []),
      secondBatting: buildBatting(2, match.awayFranchise, match.awayXi || []),
      secondBowling: buildBowling(2, match.homeFranchise, match.homeXi || []),
    };
  }, [match, balls]);

  if (!isOpen) return null;

  const totalMatchOvers = match?.overs || matchOvers || 2;
  const totalMatchBalls = totalMatchOvers * 6;
  const chasing = match != null && match.innings === 2 && match.target != null;
  const currentBalls = match ? (match.innings === 1 ? match.homeBalls : match.awayBalls) : 0;
  const ballsRemaining = Math.max(0, totalMatchBalls - currentBalls);
  const runsNeeded = chasing && match ? Math.max(0, (match.target || 0) - match.awayRuns) : 0;
  const rrr = chasing && ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : null;
  
  const isUnclaimed = (code: string | null | undefined) => code ? !snapshot.franchises?.[code]?.ownerMemberId : false;

  const currentBattingFranchise = match?.battingFranchise || (match?.innings === 2 ? match?.awayFranchise : match?.homeFranchise);
  const currentBowlingFranchise = match?.bowlingFranchise || (match?.innings === 2 ? match?.homeFranchise : match?.awayFranchise);

  const iAmBatting = currentBattingFranchise != null && (myFranchiseCodes.includes(currentBattingFranchise) || (isHost && isUnclaimed(currentBattingFranchise)));
  const iAmBowling = currentBowlingFranchise != null && (myFranchiseCodes.includes(currentBowlingFranchise) || (isHost && isUnclaimed(currentBowlingFranchise)));
  const iAmSpectator = !iAmBatting && !iAmBowling;

  const iAmHomeOwner = match != null && (myFranchiseCodes.includes(match.homeFranchise) || (isHost && isUnclaimed(match.homeFranchise)));
  const iAmAwayOwner = match != null && (myFranchiseCodes.includes(match.awayFranchise) || (isHost && isUnclaimed(match.awayFranchise)));
  const phaseReadyForMe = iAmHomeOwner ? Boolean(match?.phaseReadyHome) : iAmAwayOwner ? Boolean(match?.phaseReadyAway) : false;
  const phaseReadyBoth = Boolean(match?.phaseReadyHome && match?.phaseReadyAway);

  const isBowlerDisabled = (pId: string) => {
    if (!match) return false;
    const isConsecutive = (match.status === 'NEXT_BOWLER_SELECTION' || match.status === 'OVER_SUMMARY') && pId === match.currentBowlerId;
    const maxOvers = totalMatchOvers <= 2 ? 1 : totalMatchOvers <= 10 ? 2 : 4;
    const bowlerBalls = balls.filter(b => b.bowlerId === pId && b.innings === match.innings && b.outcome !== 'WIDE' && b.outcome !== 'NO_BALL').length;
    const isMaxReached = bowlerBalls >= maxOvers * 6;
    return isConsecutive || isMaxReached;
  };

  const pressPhaseReady = async () => {
    if (!activeMatchId || phaseReadyForMe) return;
    try {
      const updated = await api.readyMatchPhase(roomCode, activeMatchId, currentMemberId);
      setMatch(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ready action failed');
    }
  };

  const restartCurrentMatch = async () => {
    if (!activeMatchId) return;
    if (!window.confirm('Restart this match from the beginning? Current score and ball history will be cleared.')) return;
    try {
      const updated = await api.restartMatch(roomCode, activeMatchId, currentMemberId);
      setMatch(updated);
      setBalls([]);
      setAwaitInput(null);
      setBatLocked(null);
      setBowlLocked(null);
      setSelectedStrikerId('');
      setSelectedNonStrikerId('');
      setSelectedBowlerId('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restart failed');
    }
  };

  const lockBat = (position: number) => {
    if (!awaitInput || !activeMatchId) return;
    setBatLocked(zoneOf(position, awaitInput.batPerfect, awaitInput.batGood, awaitInput.batOkay));
    void api.submitMatchIntent(roomCode, activeMatchId, currentMemberId, position);
  };
  const lockBowl = (position: number) => {
    if (!awaitInput || !activeMatchId) return;
    setBowlLocked(zoneOf(position, awaitInput.bowlPerfect, awaitInput.bowlGood, awaitInput.bowlOkay));
    void api.submitBowlPlan(roomCode, activeMatchId, currentMemberId, position);
  };

  const submitTossCallAction = async (call: 'HEADS' | 'TAILS') => {
    if (!activeMatchId) return;
    try {
      const updated = await api.submitTossCall(roomCode, activeMatchId, currentMemberId, call);
      setMatch(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toss call failed');
    }
  };

  const submitTossDecisionAction = async (call: 'BAT' | 'BOWL') => {
    if (!activeMatchId) return;
    try {
      const updated = await api.tossCall(roomCode, activeMatchId, currentMemberId, call);
      setMatch(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toss decision failed');
    }
  };

  const submitOpenersAction = async () => {
    if (!activeMatchId || !selectedStrikerId || !selectedNonStrikerId) return;
    try {
      const updated = await api.selectOpeners(roomCode, activeMatchId, currentMemberId, selectedStrikerId, selectedNonStrikerId);
      setMatch(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Selecting openers failed');
    }
  };

  const submitBowlerAction = async (playerId: string) => {
    if (!activeMatchId || !playerId) return;
    try {
      const updated = await api.selectMatchBowler(roomCode, activeMatchId, currentMemberId, playerId);
      setMatch(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Selecting bowler failed');
    }
  };

  const submitWicketReplacementAction = async (playerId: string) => {
    if (!activeMatchId || !playerId) return;
    try {
      const updated = await api.selectMatchBatter(roomCode, activeMatchId, currentMemberId, playerId);
      setMatch(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Selecting batter failed');
    }
  };

  const isArenaActive = match && (
    match.status === 'BALL_READY' ||
    match.status === 'BALL_EXECUTION' ||
    match.status === 'IN_PROGRESS' ||
    match.status === 'BALL_RESULT' ||
    match.status === 'OVER_SUMMARY' ||
    match.status === 'WICKET_PAUSE' ||
    match.status === 'NEXT_BOWLER_SELECTION'
  );

  if (isOpen && match && isArenaActive && match.status !== 'MATCH_COMPLETE' && match.status !== 'COMPLETED') {
    return (
      <div className="fixed inset-0 h-[100dvh] z-[70] bg-slate-950">
        <MiniMatch2DArena
          match={match}
          roomCode={roomCode}
          currentMemberId={currentMemberId}
          myFranchiseCode={myFranchiseCodes[0] || ''}
          myFranchiseCodes={myFranchiseCodes}
          onClose={onClose}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4" onClick={onClose}>
      <div
        className="bg-[#0a101f] border border-slate-700/60 rounded-3xl w-full max-w-4xl max-h-[94vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a101f]/95 backdrop-blur border-b border-slate-800 px-5 py-3.5 flex items-center justify-between">

          <div className="flex items-center space-x-2.5">
            <Swords className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-black text-white tracking-tight">
              {fixtureLabel ? `${fixtureLabel} — ` : ''}AUCTION XI Match <span className="text-slate-500 text-xs font-bold">{totalMatchOvers} overs a side</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {activeMatchId && (iAmHomeOwner || iAmAwayOwner) && (
              <button onClick={restartCurrentMatch} className="px-3 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/25 text-[10px] font-black" title="Restart match">
                ↻ RESTART
              </button>
            )}
            <button onClick={() => { if (window.confirm('Exit this match view? The match will remain on the server so you can re-open it later.')) onClose(); }} className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 text-[10px] font-black">
              EXIT MATCH
            </button>
            <button onClick={onClose} className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" aria-label="Close match">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Challenge Setup view */}
        {!activeMatchId ? (
          <div className="p-6 space-y-5">
            <p className="text-sm text-slate-400">
              Challenge any two human-owned squads to a real-time cricket match with the actual IPL players you bought.
              Both team owners must actively lock Playing XIs, toss calls, openers, and bowlers.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {(['home', 'away'] as const).map((side) => (
                <div key={side}>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {side === 'home' ? 'Team 1 (Home)' : 'Team 2 (Away)'}
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {humanFranchises.map((f) => {
                      const code = f.franchiseCode;
                      const sel = side === 'home' ? homeCode === code : awayCode === code;
                      const disabled = side === 'home' ? awayCode === code : homeCode === code;
                      return (
                        <button
                          key={code}
                          disabled={disabled}
                          onClick={() => (side === 'home' ? setHomeCode(code) : setAwayCode(code))}
                          className={`px-2 py-2 rounded-xl border text-xs font-black transition-all flex items-center space-x-1.5 ${
                            sel
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : disabled
                              ? 'bg-slate-950 text-slate-700 border-slate-800/50 cursor-not-allowed'
                              : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <img src={resolveTeamLogo(code)} alt="" className="w-4 h-4 rounded-full object-cover" onError={handleImageFallback} />
                          <span>{code}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="text-red-400 text-xs font-semibold">{error}</p>}
            
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Overs per side</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[2, 5, 10, 20].map((o) => (
                  <button
                    key={o}
                    onClick={() => setMatchOvers(o)}
                    className={`py-2 rounded-lg text-xs font-black border transition-all ${
                      matchOvers === o ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {o} ov
                  </button>
                ))}
              </div>
            </div>

            {myFranchiseCodes.includes(homeCode) && (snapshot.franchises[homeCode]?.squad?.length ?? 0) > 0 && (
              <XiPicker title={`${homeCode} Playing XI`} squad={snapshot.franchises[homeCode].squad} pick={homePick} setPick={setHomePick} />
            )}
            {myFranchiseCodes.includes(awayCode) && (snapshot.franchises[awayCode]?.squad?.length ?? 0) > 0 && (
              <XiPicker title={`${awayCode} Playing XI`} squad={snapshot.franchises[awayCode].squad} pick={awayPick} setPick={setAwayPick} />
            )}

            <button
              onClick={startChallenge}
              disabled={!homeCode || !awayCode || starting || !(isHost || humanFranchises.some((f) => f.ownerMemberId === currentMemberId && (f.franchiseCode === homeCode || f.franchiseCode === awayCode)))}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-black text-sm flex items-center justify-center space-x-2 disabled:opacity-40 disabled:pointer-events-none hover:brightness-110 transition-all shadow-lg"
            >
              <Play className="w-4 h-4" />
              <span>{starting ? 'Challenging...' : 'CHALLENGE TO A MATCH'}</span>
            </button>

            {pendingChallenges.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">Open Challenges</div>
                {pendingChallenges.map((m) => (
                  <div key={m.matchId} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs">
                    <span className="font-bold text-slate-200">{m.homeFranchise} vs {m.awayFranchise}</span>
                    <button
                      onClick={async () => {
                        const updated = await api.readyMatch(roomCode, m.matchId, currentMemberId);
                        setMatch(updated);
                        onMatchStarted?.(m.matchId);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black active:scale-95 transition-all"
                    >
                      OPEN MATCH ⚔
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 space-y-4">
            
            {/* STAGE 1: PLAYING XI LOCK STAGE */}
            {match && (match.status === 'MATCH_CREATED' || match.status === 'TEAM_XI_SELECTION' || match.status === 'AWAITING_READY') && (
              <div className="rounded-2xl bg-slate-900/90 border border-indigo-500/50 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-indigo-300">STAGE 1: LOCK PLAYING 11</span>
                  </div>
                  <span className="text-xs text-slate-400 font-bold">Both owners must lock Playing XI to proceed</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { code: match.homeFranchise, isLocked: match.homeXiLocked, isOwner: iAmHomeOwner },
                    { code: match.awayFranchise, isLocked: match.awayXiLocked, isOwner: iAmAwayOwner },
                  ].map((team) => (
                    <div key={team.code} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-center space-y-3">
                      <div className="flex items-center justify-center space-x-2">
                        <img src={resolveTeamLogo(team.code)} alt="" className="w-6 h-6 rounded-full object-cover" onError={handleImageFallback} />
                        <span className="font-black text-white text-sm">{team.code}</span>
                      </div>
                      {team.isLocked ? (
                        <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>YOU ✓ LOCKED</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-black">
                          <Lock className="w-3.5 h-3.5" />
                          <span>WAITING LOCK...</span>
                        </div>
                      )}
                      {team.isOwner && !team.isLocked && (
                        <button
                          onClick={async () => {
                            if (activeMatchId) {
                              const updated = await api.readyMatch(roomCode, activeMatchId, currentMemberId);
                              setMatch(updated);
                            }
                          }}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-md"
                        >
                          LOCK PLAYING 11 🔒
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STAGE 2: 10-SECOND PLAYING XI PREVIEW INTERFACE */}
            {match?.status === 'XI_PREVIEW' && (
              <div className="rounded-2xl bg-gradient-to-br from-indigo-900/80 via-slate-900 to-indigo-950 border border-indigo-500/60 p-5 space-y-4 shadow-2xl animate-[fadeIn_.3s_ease-out]">
                <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest text-indigo-300">
                      PLAYING XI PREVIEW (10 SECONDS)
                    </span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 text-xs font-black font-mono">
                    Toss starting in {xiPreviewSeconds ?? 10}s...
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { code: match.homeFranchise, xi: match.homeXi },
                    { code: match.awayFranchise, xi: match.awayXi },
                  ].map((team) => (
                    <div key={team.code} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                        <span className="font-black text-white text-xs flex items-center space-x-1.5">
                          <img src={resolveTeamLogo(team.code)} alt="" className="w-4 h-4 rounded-full object-cover" onError={handleImageFallback} />
                          <span>{team.code}</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">{team.xi?.length || 0} Players</span>
                      </div>
                      <div className="max-h-44 overflow-y-auto space-y-1">
                        {(team.xi || []).map((pl, idx) => (
                          <div key={pl.id} className="flex items-center justify-between text-[11px] px-2 py-0.5 rounded bg-slate-900/50">
                            <span className="text-slate-300 truncate">
                              {idx + 1}. {pl.shortName || pl.fullName}{pl.isOverseas ? ' ✈' : ''}
                            </span>
                            <span className="text-[10px] text-indigo-400 font-mono">{pl.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STAGE 3: INTERACTIVE COIN TOSS (BOTH OWNERS CALL HEADS OR TAILS & LOCK) */}
            {match && (match.status === 'TOSS_SELECTION' || match.status === 'TOSS_LOCKED' || match.status === 'TOSS') && (
              <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-amber-500/10 border border-amber-500/50 p-6 text-center space-y-4 shadow-xl">
                <div className="flex items-center justify-center space-x-2">
                  <Coins className="w-8 h-8 text-amber-400 animate-bounce" />
                  <div className="text-xs font-black uppercase tracking-widest text-amber-400">STAGE 3: COIN TOSS CALL</div>
                </div>

                <p className="text-xs text-slate-300">Both owners must select and lock HEADS or TAILS before the coin flip!</p>

                <div className="grid grid-cols-2 gap-4 my-2">
                  {[
                    { code: match.homeFranchise, call: match.homeTossCall, isOwner: iAmHomeOwner },
                    { code: match.awayFranchise, call: match.awayTossCall, isOwner: iAmAwayOwner },
                  ].map((t) => (
                    <div key={t.code} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="text-xs font-black text-white">{t.code}</div>
                      {t.call ? (
                        <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>LOCKED: 🪙 {t.call}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-amber-400 font-bold">SELECTING CALL...</div>
                      )}
                      {t.isOwner && !t.call && (
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            onClick={() => submitTossCallAction('HEADS')}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all"
                          >
                            🪙 HEADS
                          </button>
                          <button
                            onClick={() => submitTossCallAction('TAILS')}
                            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all"
                          >
                            🪙 TAILS
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STAGE 4: TOSS WINNER DECISION (BAT OR BOWL) */}
            {match && (match.status === 'BAT_OR_BOWL_SELECTION' || match.status === 'TOSS_RESULT') && (
              <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-amber-500/10 border border-amber-500/50 p-6 text-center space-y-4 shadow-xl">
                <div className="text-lg font-black text-white">
                  🪙 Toss Winner: <span className="text-amber-300 font-extrabold">{match.tossWinnerFranchise}</span>
                  {myFranchiseCodes.includes(match.tossWinnerFranchise || '') ? (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/40 animate-pulse">
                      (YOUR TEAM)
                    </span>
                  ) : null}
                </div>
                {myFranchiseCodes.includes(match.tossWinnerFranchise || '') ? (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-200 font-bold">You won the toss! Select your decision:</p>
                    <div className="flex items-center justify-center gap-4 pt-1">
                      <button
                        onClick={() => submitTossDecisionAction('BAT')}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg"
                      >
                        🏏 BAT FIRST
                      </button>
                      <button
                        onClick={() => submitTossDecisionAction('BOWL')}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg"
                      >
                        🎯 BOWL FIRST
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-semibold animate-pulse">
                    Waiting for {match.tossWinnerFranchise} to choose Batting or Bowling…
                  </p>
                )}
              </div>
            )}

            {/* STAGE 5: INITIAL BATTER & BOWLER LOCK (OPENERS + BOWLER) */}
            {match && (match.status === 'INITIAL_BATTER_SELECTION' || match.status === 'BOWLER_SELECTION' || (!match.currentStrikerId && match.status !== 'COMPLETED' && match.status !== 'MATCH_COMPLETE' && match.status !== 'AWAITING_READY' && match.status !== 'TEAM_XI_SELECTION' && match.status !== 'XI_PREVIEW' && match.status !== 'TOSS_SELECTION' && match.status !== 'BAT_OR_BOWL_SELECTION')) && (
              <div className="rounded-2xl bg-slate-900/90 border border-teal-500/50 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-teal-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-teal-300">STAGE 5: LOCK OPENERS & BOWLER</span>
                  </div>
                  <span className="text-xs text-slate-400 font-bold">Both owners must lock players before ball execution</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Batting side: Striker & Non-Striker selection */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-emerald-400 text-xs uppercase">🏏 BATTING TEAM ({currentBattingFranchise})</span>
                      {match.battersLocked ? (
                        <span className="text-emerald-400 font-black text-xs">✓ LOCKED</span>
                      ) : (
                        <span className="text-amber-400 font-bold text-xs">SELECTING...</span>
                      )}
                    </div>
                    {iAmBatting && !match.battersLocked ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">STRIKER</label>
                          <select
                            value={selectedStrikerId}
                            onChange={(e) => setSelectedStrikerId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold"
                          >
                            <option value="">-- Pick Striker --</option>
                            {(match.innings === 1 ? match.homeXi : match.awayXi).map((p) => (
                              <option key={p.id} value={p.id}>{p.shortName || p.fullName} ({Math.round(battingRating(p))})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">NON-STRIKER</label>
                          <select
                            value={selectedNonStrikerId}
                            onChange={(e) => setSelectedNonStrikerId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold"
                          >
                            <option value="">-- Pick Non-Striker --</option>
                            {(match.innings === 1 ? match.homeXi : match.awayXi).map((p) => (
                              <option key={p.id} value={p.id}>{p.shortName || p.fullName} ({Math.round(battingRating(p))})</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={submitOpenersAction}
                          disabled={!selectedStrikerId || !selectedNonStrikerId || selectedStrikerId === selectedNonStrikerId}
                          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs disabled:opacity-40"
                        >
                          LOCK OPENERS 🔒
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-300 font-semibold space-y-1">
                        <div>Striker: {match.playerNames?.[match.currentStrikerId || ''] || 'Pending...'}</div>
                        <div>Non-Striker: {match.playerNames?.[match.currentNonStrikerId || ''] || 'Pending...'}</div>
                      </div>
                    )}
                  </div>

                  {/* Bowling side: Bowler selection */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-amber-400 text-xs uppercase">🎯 BOWLING TEAM ({currentBowlingFranchise})</span>
                      {match.bowlerLocked ? (
                        <span className="text-emerald-400 font-black text-xs">✓ LOCKED</span>
                      ) : (
                        <span className="text-amber-400 font-bold text-xs">SELECTING...</span>
                      )}
                    </div>
                    {iAmBowling && !match.bowlerLocked ? (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">BOWLER FOR OVER</label>
                        <select
                          value={selectedBowlerId}
                          onChange={(e) => setSelectedBowlerId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold"
                        >
                          <option value="">-- Pick Bowler --</option>
                          {(match.innings === 1 ? match.awayXi : match.homeXi).map((p) => {
                            const disabled = isBowlerDisabled(p.id);
                            const isPrev = p.id === match?.currentBowlerId;
                            return (
                              <option key={p.id} value={p.id} disabled={disabled}>
                                {p.shortName || p.fullName} ({Math.round(bowlingRating(p))}){isPrev ? ' (Consecutive N/A)' : disabled ? ' (Max Overs)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          onClick={() => submitBowlerAction(selectedBowlerId)}
                          disabled={!selectedBowlerId}
                          className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs disabled:opacity-40"
                        >
                          LOCK BOWLER 🔒
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-300 font-semibold">
                        Bowler: {match.playerNames?.[match.currentBowlerId || ''] || 'Pending...'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* WICKET PAUSE — NO TIMER. BATTER SELECTION + BOTH OWNERS READY. */}
            {match?.status === 'WICKET_PAUSE' && (
              <div className="rounded-2xl bg-red-950/80 border border-red-500/60 p-5 space-y-4 text-center animate-[fadeIn_.3s_ease-out]">
                <div className="text-2xl font-black text-red-400">💥 WICKET FALLEN!</div>
                <p className="text-xs text-slate-200">
                  {iAmBatting ? 'Select the replacement batsman, lock the selection, then press READY. The bowling owner must also press READY.' : 'The batting owner must select the replacement batsman. You have nothing to select — press READY when your team is ready.'}
                </p>
                {iAmBatting && match && (
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {(match.innings === 1 ? match.homeXi : match.awayXi)
                      .filter((p) => !match.dismissedBatterIds?.includes(p.id) && p.id !== match.currentNonStrikerId)
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => submitWicketReplacementAction(p.id)}
                          className={`px-3 py-2 rounded-xl text-white font-black text-xs transition-all shadow-md ${p.id === match.currentStrikerId ? 'bg-emerald-500 ring-2 ring-emerald-300' : 'bg-emerald-700 hover:bg-emerald-500'}`}
                        >
                          🏏 {p.shortName || p.fullName} ({Math.round(battingRating(p))}) {p.id === match.currentStrikerId ? '✓ SELECTED' : ''}
                        </button>
                      ))}
                  </div>
                )}
                <div className="text-xs text-slate-300">Replacement: <b>{match.playerNames?.[match.currentStrikerId || ''] || 'Not selected yet'}</b></div>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${match.phaseReadyHome ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>HOME {match.phaseReadyHome ? '✓ READY' : 'WAITING'}</span>
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${match.phaseReadyAway ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>AWAY {match.phaseReadyAway ? '✓ READY' : 'WAITING'}</span>
                  {((iAmHomeOwner || iAmAwayOwner) && !phaseReadyForMe) && (
                    <button
                      onClick={pressPhaseReady}
                      disabled={iAmBatting && (!match.currentStrikerId || match.dismissedBatterIds?.includes(match.currentStrikerId))}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs disabled:opacity-40"
                    >
                      READY TO CONTINUE ✓
                    </button>
                  )}
                </div>
                {phaseReadyBoth && <div className="text-[10px] font-black text-emerald-300">Both owners ready — continuing to the next ball.</div>}
              </div>
            )}

            {match?.status === 'INNINGS_BREAK' && (
              <div className="rounded-2xl border border-blue-500/50 bg-blue-500/10 p-5 text-center space-y-3">
                <div className="text-xl font-black text-blue-300">🏁 INNINGS BREAK</div>
                <div className="text-xs text-slate-300">Both owners must press READY to begin the next innings. No countdown.</div>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${match.phaseReadyHome ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>HOME {match.phaseReadyHome ? '✓ READY' : 'WAITING'}</span>
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${match.phaseReadyAway ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>AWAY {match.phaseReadyAway ? '✓ READY' : 'WAITING'}</span>
                  {!phaseReadyForMe && (iAmHomeOwner || iAmAwayOwner) && <button onClick={pressPhaseReady} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs">READY FOR INNINGS 2 ✓</button>}
                </div>
              </div>
            )}

            {/* SCORECARD HEADER */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { code: match?.homeFranchise || '', runs: match?.homeRuns ?? 0, wkts: match?.homeWickets ?? 0, balls: match?.homeBalls ?? 0, batting: match?.innings === 1 },
                { code: match?.awayFranchise || '', runs: match?.awayRuns ?? 0, wkts: match?.awayWickets ?? 0, balls: match?.awayBalls ?? 0, batting: match?.innings === 2 },
              ].map((s) => (
                <div
                  key={s.code}
                  className={`rounded-2xl border p-4 text-center transition-all ${
                    s.batting ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10' : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2 flex-wrap gap-y-1">
                    <img src={resolveTeamLogo(s.code)} alt="" className="w-7 h-7 rounded-full object-cover" onError={handleImageFallback} />
                    <span className="font-black text-white">{s.code}</span>
                    {myFranchiseCodes.includes(s.code) && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 text-[10px] font-black border border-emerald-500/50 animate-pulse">
                        YOUR TEAM
                      </span>
                    )}
                    {s.batting && <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider animate-pulse">Batting</span>}
                  </div>
                  <div className="text-3xl font-black text-white mt-1 font-mono">
                    {s.runs}<span className="text-slate-500 text-xl">/{s.wkts}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">({formatOvers(s.balls)} / {totalMatchOvers} ov)</div>
                </div>
              ))}
            </div>

            {chasing && match?.status !== 'COMPLETED' && match?.status !== 'MATCH_COMPLETE' && (
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/40 px-4 py-2 text-center">
                <span className="text-xs font-bold text-blue-300">
                  {match.awayFranchise} {myFranchiseCodes.includes(match.awayFranchise) ? '(YOUR TEAM)' : ''} need {runsNeeded} off {ballsRemaining} balls{rrr ? ` — RRR ${rrr}` : ''}
                </span>
              </div>
            )}

            {/* NEXT OVER — NO TIMER. BOWLER SELECTS + BOTH OWNERS PRESS READY. */}
            {match?.status === 'NEXT_BOWLER_SELECTION' && (
              <div className="rounded-2xl border border-amber-400/60 bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/15 p-4 space-y-4">
                <div className="text-center">
                  <div className="text-xs font-black uppercase tracking-widest text-amber-300">OVER COMPLETE</div>
                  <div className="text-lg font-black text-white mt-1">Next Over Setup</div>
                  <div className="text-xs text-slate-400 mt-1">No countdown. The match waits until both franchise owners press READY.</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-amber-500/30 bg-slate-950/60 p-3">
                    <div className="text-[10px] font-black uppercase text-amber-400 mb-2">Bowling Owner</div>
                    {iAmBowling ? (
                      <div className="space-y-2">
                        <select
                          value={selectedBowlerId || match.currentBowlerId || ''}
                          onChange={(e) => setSelectedBowlerId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-2 text-xs font-bold"
                        >
                          <option value="">-- Select Next Bowler --</option>
                          {(match.innings === 1 ? match.awayXi : match.homeXi).map((p) => {
                            const disabled = isBowlerDisabled(p.id);
                            const isPrev = p.id === match?.currentBowlerId;
                            return (
                              <option key={p.id} value={p.id} disabled={disabled}>
                                {p.shortName || p.fullName} ({Math.round(bowlingRating(p))}){isPrev ? ' (Consecutive Over N/A)' : disabled ? ' (Max Overs Reached)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          onClick={() => submitBowlerAction(selectedBowlerId)}
                          disabled={!selectedBowlerId || match.bowlerLocked}
                          className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs disabled:opacity-40"
                        >
                          LOCK NEXT BOWLER 🔒
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-300">Selected bowler: <b>{match.playerNames?.[match.currentBowlerId || ''] || 'Waiting for bowling owner'}</b></div>
                    )}
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-slate-950/60 p-3">
                    <div className="text-[10px] font-black uppercase text-emerald-400 mb-2">Batting Owner</div>
                    <div className="text-xs text-slate-300">No player selection is required here. Press READY when your team is ready.</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${match.phaseReadyHome ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>HOME {match.phaseReadyHome ? '✓ READY' : 'WAITING'}</span>
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border ${match.phaseReadyAway ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>AWAY {match.phaseReadyAway ? '✓ READY' : 'WAITING'}</span>
                  {((iAmHomeOwner || iAmAwayOwner) && !phaseReadyForMe) && (
                    <button onClick={pressPhaseReady} disabled={iAmBowling && !match.bowlerLocked} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs disabled:opacity-40">
                      READY FOR NEXT OVER ✓
                    </button>
                  )}
                </div>
                {!match.bowlerLocked && <div className="text-center text-[10px] font-bold text-amber-300">Waiting for the bowling owner to lock the next bowler.</div>}
                {phaseReadyBoth && <div className="text-center text-[10px] font-black text-emerald-300">Both owners ready — starting next ball.</div>}
              </div>
            )}

            {/* REAL-TIME BATTING & BOWLING LIVE DATA CARDS */}
            {(match?.status === 'BALL_READY' || match?.status === 'BALL_EXECUTION' || match?.status === 'IN_PROGRESS') && (liveBattingStats || liveBowlingStats) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Batting Live Card */}
                {liveBattingStats && (
                  <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/80 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-1.5">
                      <span>🏏 LIVE BATTING DATA</span>
                      <span>SR</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {liveBattingStats.striker && (
                        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
                          <span className="font-black text-white flex items-center space-x-1">
                            <span>🏏 {liveBattingStats.striker.name} *</span>
                          </span>
                          <span className="font-mono text-emerald-300 font-bold">
                            {liveBattingStats.striker.runs} ({liveBattingStats.striker.faced}) • 4s:{liveBattingStats.striker.fours} 6s:{liveBattingStats.striker.sixes} | {liveBattingStats.striker.sr}
                          </span>
                        </div>
                      )}
                      {liveBattingStats.nonStriker && (
                        <div className="flex items-center justify-between bg-slate-950/40 rounded-lg px-2.5 py-1.5 text-slate-400">
                          <span className="font-bold">{liveBattingStats.nonStriker.name}</span>
                          <span className="font-mono font-semibold">
                            {liveBattingStats.nonStriker.runs} ({liveBattingStats.nonStriker.faced}) • 4s:{liveBattingStats.nonStriker.fours} 6s:{liveBattingStats.nonStriker.sixes} | {liveBattingStats.nonStriker.sr}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bowling Live Card */}
                {liveBowlingStats && (
                  <div className="rounded-2xl border border-amber-500/40 bg-slate-900/80 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-1.5">
                      <span>🎯 LIVE BOWLING DATA</span>
                      <span>ECON</span>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between">
                      <span className="font-black text-white">🎯 {liveBowlingStats.name}</span>
                      <span className="font-mono text-amber-300 font-bold">
                        {liveBowlingStats.overs} ov • {liveBowlingStats.wickets}/{liveBowlingStats.runs} • Dots:{liveBowlingStats.dots} | Econ {liveBowlingStats.econ}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LIVE PLAYER SCORECARD — updates from authoritative ball log */}
            {scorecard && (
              <details open className="rounded-2xl border border-indigo-500/30 bg-slate-950/70 overflow-hidden">
                <summary className="px-4 py-3 cursor-pointer text-[11px] font-black uppercase tracking-wider text-indigo-300">
                  📊 Live Scorecard — Player-by-Player
                </summary>
                <div className="p-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {[
                    { title: `${match?.homeFranchise} Batting`, rows: scorecard.firstBatting },
                    { title: `${match?.awayFranchise} Bowling`, rows: scorecard.firstBowling },
                    { title: `${match?.awayFranchise} Batting`, rows: scorecard.secondBatting },
                    { title: `${match?.homeFranchise} Bowling`, rows: scorecard.secondBowling },
                  ].map((card) => (
                    <div key={card.title} className="rounded-xl border border-slate-800 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-900 text-[10px] font-black uppercase text-slate-300">{card.title}</div>
                      {card.rows.length === 0 ? (
                        <div className="px-3 py-3 text-[10px] text-slate-600">No player figures yet.</div>
                      ) : (
                        <div className="divide-y divide-slate-800/70">
                          {card.rows.map((r: any) => (
                            <div key={r.id} className="px-3 py-2 flex items-center justify-between gap-2 text-[11px]">
                              <span className={`font-bold truncate ${r.isCurrent ? 'text-emerald-300' : 'text-slate-300'}`}>{r.name}{r.isCurrent ? ' *' : ''}{r.out ? ' †' : ''}</span>
                              {'balls' in r ? (
                                <span className="font-mono text-slate-400 whitespace-nowrap">{r.runs} ({r.balls}) · 4s {r.fours} · 6s {r.sixes} · SR {r.sr}</span>
                              ) : (
                                <span className="font-mono text-amber-300 whitespace-nowrap">{r.overs} · {r.runs} · {r.wickets}w · Econ {r.economy}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* MILESTONE CELEBRATIONS */}
            {milestone && (
              <div className="rounded-2xl border border-amber-400/60 bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 p-4 text-center animate-[fadeIn_.25s_ease-out]">
                <div className="text-2xl font-black text-amber-300">
                  {milestone.kind === 'FIFTY' ? '🔥 FIFTY!' : milestone.kind === 'HUNDRED' ? '💯 HUNDRED!' : `🎯 ${milestone.kind.replace('_WKTS', '')} WICKETS!`}
                </div>
                <div className="text-xs font-bold text-white mt-0.5">{milestone.playerName} ({milestone.franchise})</div>
              </div>
            )}

            {/* BALL EXECUTION TIMING METERS (BALL_READY) */}
            {awaitInput && (match?.status === 'BALL_READY' || match?.status === 'BALL_EXECUTION' || match?.status === 'IN_PROGRESS') && (
              <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-300 uppercase tracking-wider">
                    Over {awaitInput.overNumber + 1}.{awaitInput.ballInOver} — {awaitInput.batterName} vs {awaitInput.bowlerName}
                  </span>
                </div>
                {(iAmBatting || iAmSpectator) && (
                  <TimingMeter
                    title={`${awaitInput.battingFranchise}${myFranchiseCodes.includes(awaitInput.battingFranchise) ? ' ★ (YOUR TEAM)' : ''} — Batting`}
                    active={iAmBatting}
                    lockedZone={batLocked}
                    perfect={awaitInput.batPerfect}
                    good={awaitInput.batGood}
                    okay={awaitInput.batOkay}
                    deadlineEpochMillis={awaitInput.deadlineEpochMillis}
                    onLock={lockBat}
                  />
                )}
                {(iAmBowling || iAmSpectator) && (
                  <TimingMeter
                    title={`${awaitInput.bowlingFranchise}${myFranchiseCodes.includes(awaitInput.bowlingFranchise) ? ' ★ (YOUR TEAM)' : ''} — Bowling`}
                    active={iAmBowling}
                    lockedZone={bowlLocked}
                    perfect={awaitInput.bowlPerfect}
                    good={awaitInput.bowlGood}
                    okay={awaitInput.bowlOkay}
                    deadlineEpochMillis={awaitInput.deadlineEpochMillis}
                    onLock={lockBowl}
                  />
                )}
              </div>
            )}

            {/* LAST BALL BANNER */}
            {lastBall && (
              <div key={`${lastBall.innings}-${lastBall.ballNumber}`} className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800/60 to-slate-900 border border-slate-700/60 p-4 flex items-center space-x-4 animate-[fadeIn_.3s_ease-out]">
                {match?.freeHitNext && (
                  <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[9px] font-black animate-pulse">FREE HIT</span>
                )}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0 shadow-lg ${OUTCOME_STYLES[lastBall.outcome] || OUTCOME_STYLES.DOT} ${lastBall.outcome === 'SIX' || lastBall.outcome === 'WICKET' ? 'animate-bounce' : ''}`}>
                  {lastBall.outcome === 'WICKET' ? 'W' : lastBall.outcome === 'WIDE' ? 'wd' : lastBall.outcome === 'NO_BALL' ? 'NB' : lastBall.outcome === 'DOT' ? '•' : lastBall.runs}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{lastBall.commentary}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {lastBall.batterName} vs {lastBall.bowlerName} • Over {lastBall.overNumber + 1}
                    {lastBall.shotIntent ? ` • bat: ${lastBall.shotIntent}` : ''}
                    {lastBall.bowlPlan ? ` • bowl: ${lastBall.bowlPlan}` : ''}
                  </div>
                </div>
                {(lastBall.outcome === 'FOUR' || lastBall.outcome === 'SIX') && <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />}
              </div>
            )}

            {/* MATCH COMPLETE CARD */}
            {(match?.status === 'MATCH_COMPLETE' || match?.status === 'COMPLETED') && (
              <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border border-amber-500/50 p-5 text-center space-y-1">
                <Trophy className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
                <div className="font-black text-amber-300 text-lg">{match.winnerFranchise} WIN</div>
                <div className="text-xs text-slate-300">{match.resultText}</div>
                {(() => {
                  const topBat = Object.entries(match.runsByPlayer || {}).sort((a, b) => b[1] - a[1])[0];
                  const topBowl = Object.entries(match.wicketsByPlayer || {}).sort((a, b) => b[1] - a[1])[0];
                  return (
                    <div className="text-[11px] text-slate-400 pt-1">
                      {topBat && <span>⭐ Top scorer: {(match.playerNames || {})[topBat[0]] || topBat[0]} ({topBat[1]} runs){'  '}</span>}
                      {topBowl && <span>🎯 Top bowler: {(match.playerNames || {})[topBowl[0]] || topBowl[0]} ({topBowl[1]} wkts)</span>}
                    </div>
                  );
                })()}
                <button
                  onClick={() => {
                    setMatch(null);
                    setBalls([]);
                    setAwaitInput(null);
                    onNewMatch?.();
                  }}
                  className="mt-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black text-xs hover:brightness-110 active:scale-95 transition-all"
                >
                  🔄 PLAY AGAIN — NEW MATCH
                </button>
              </div>
            )}

            {/* COMMENTARY FEED */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500">
                Ball-by-ball Commentary
              </div>
              <div ref={feedRef} className="max-h-56 overflow-y-auto divide-y divide-slate-800/50">
                {[...balls].reverse().map((b) => (
                  <div key={`${b.innings}-${b.ballNumber}`} className="px-4 py-2 flex items-center space-x-3 text-xs">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black flex-shrink-0 ${OUTCOME_STYLES[b.outcome] || OUTCOME_STYLES.DOT}`}>
                      {b.outcome === 'WICKET' ? 'W' : b.outcome === 'WIDE' ? 'wd' : b.outcome === 'NO_BALL' ? 'NB' : b.outcome === 'DOT' ? '•' : b.runs}
                    </span>
                    <span className="text-slate-500 font-mono w-12 flex-shrink-0">
                      {b.innings <= 2 ? `Ov ${b.overNumber + 1}.${Math.max(1, b.ballInOver)}` : 'SO'}
                    </span>
                    <span className="text-slate-300 flex-1">
                      {b.commentary}
                      {b.shotIntent ? <span className="text-slate-500"> • bat {b.shotIntent}</span> : null}
                      {b.bowlPlan ? <span className="text-slate-500"> • bowl {b.bowlPlan}</span> : null}
                    </span>
                    <span className="text-slate-500 font-mono flex-shrink-0">
                      {b.battingFranchise} {b.scoreRuns}/{b.scoreWickets}
                    </span>
                  </div>
                ))}
                {balls.length === 0 && (
                  <p className="px-4 py-6 text-center text-slate-600 text-xs">Waiting for match progression…</p>
                )}
              </div>
            </div>

            {/* PLAYING XIS DOSSIER */}
            {match && (
              <details className="rounded-2xl bg-slate-900/60 border border-slate-800">
                <summary className="px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-300">
                  Playing XIs
                </summary>
                <div className="grid grid-cols-2 gap-3 p-4 pt-1">
                  {[
                    { code: match.homeFranchise, xi: match.homeXi },
                    { code: match.awayFranchise, xi: match.awayXi },
                  ].map((t) => (
                    <div key={t.code}>
                      <div className="text-xs font-black text-white mb-1.5">{t.code}</div>
                      {(t.xi || []).map((p: Player) => (
                        <div key={p.id} className="flex items-center space-x-1.5 py-0.5">
                          <img src={resolvePlayerPhoto(p, 'card').url} alt="" className="w-5 h-5 rounded object-cover bg-slate-700" onError={handleImageFallback} />
                          <span className="text-[11px] text-slate-300 truncate">{p.shortName || p.fullName}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
