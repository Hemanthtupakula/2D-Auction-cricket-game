import { Player, MiniMatch, MatchBall } from '../types';

export interface DerivedCapabilities {
  // Batting capabilities
  timing: number;
  contact: number;
  power: number;
  placement: number;
  footwork: number;
  shotRange: number;

  // Bowling capabilities
  pace: number;
  lineControl: number;
  lengthControl: number;
  movement: number;
  yorker: number;
  bouncer: number;
  variation: number;

  // Fielding & General capabilities
  fielding: number;
  catching: number;
  throwing: number;
  keeping: number;
  stamina: number;
  pressure: number;
}

export interface PlayerProgressionState {
  playerId: string;
  batRating: number;       // Base integer rating e.g. 65
  batProgress: number;     // Current decimal progress e.g. 65.4
  bowlRating: number;      // Base integer rating e.g. 18
  bowlProgress: number;    // Current decimal progress e.g. 18.2
  form: number;            // Current form delta e.g. +2, -1, 0
  xp: number;              // Current XP progress toward next level e.g. 340
  xpMax: number;           // Max XP e.g. 500
  matchesPlayed: number;
  totalRuns: number;
  totalBalls: number;
  fours: number;
  sixes: number;
  wickets: number;
  bestScore: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
  recentPerformances: Array<{
    matchId: string;
    runs: number;
    balls: number;
    wickets: number;
    runsConceded: number;
    sr: number;
    xpEarned: number;
    formDelta: number;
    date: string;
  }>;
}

const STORAGE_KEY = 'auction_xi_player_progression_v1';

/** Load all persisted player progression states from localStorage / server cache */
export function loadProgressionStates(): Record<string, PlayerProgressionState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load progression states from storage:', e);
  }
  return {};
}

/** Save updated player progression states */
export function saveProgressionStates(states: Record<string, PlayerProgressionState>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch (e) {
    console.warn('Failed to save progression states to storage:', e);
  }
}

/** Compute derived 15+ gameplay capabilities algorithmically from BAT & BOWL ratings */
export function getDerivedCapabilities(player: Player, batRating: number, bowlRating: number): DerivedCapabilities {
  const isBowler = (player.role || '').toLowerCase().includes('bowl');
  const isKeeper = (player.role || '').toLowerCase().includes('wk') || (player.role || '').toLowerCase().includes('keeper');
  const isAllRounder = (player.role || '').toLowerCase().includes('all') || (player.role || '').toLowerCase().includes('ar');

  // Base variance based on player id hash to make each player unique
  const seed = (player.id || player.fullName).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const batBase = batRating || 50;
  const bowlBase = bowlRating || 30;

  return {
    timing: Math.min(99, Math.max(30, Math.round(batBase + ((seed % 7) - 3)))),
    contact: Math.min(99, Math.max(30, Math.round(batBase * 0.95 + ((seed % 5) - 2)))),
    power: Math.min(99, Math.max(30, Math.round(batBase * 1.05 + ((seed % 9) - 4)))),
    placement: Math.min(99, Math.max(30, Math.round(batBase * 0.98 + ((seed % 6) - 3)))),
    footwork: Math.min(99, Math.max(30, Math.round(batBase * 0.92 + ((seed % 8) - 4)))),
    shotRange: Math.min(99, Math.max(30, Math.round(batBase * 1.02 + ((seed % 4) - 2)))),

    pace: Math.min(99, Math.max(30, Math.round(isBowler ? bowlBase * 1.08 + (seed % 6) : bowlBase * 0.8))),
    lineControl: Math.min(99, Math.max(30, Math.round(bowlBase * 0.96 + (seed % 5)))),
    lengthControl: Math.min(99, Math.max(30, Math.round(bowlBase * 0.94 + (seed % 7)))),
    movement: Math.min(99, Math.max(30, Math.round(bowlBase * 1.02 + ((seed % 8) - 4)))),
    yorker: Math.min(99, Math.max(30, Math.round(isBowler ? bowlBase * 1.05 + (seed % 5) : bowlBase * 0.7))),
    bouncer: Math.min(99, Math.max(30, Math.round(isBowler ? bowlBase * 0.98 + (seed % 6) : bowlBase * 0.75))),
    variation: Math.min(99, Math.max(30, Math.round(bowlBase * 0.95 + (seed % 4)))),

    fielding: Math.min(99, Math.max(40, Math.round(60 + (seed % 25)))),
    catching: Math.min(99, Math.max(40, Math.round(62 + (seed % 28)))),
    throwing: Math.min(99, Math.max(40, Math.round(58 + (seed % 30)))),
    keeping: isKeeper ? Math.min(99, Math.max(75, Math.round(80 + (seed % 15)))) : Math.min(60, Math.round(30 + (seed % 20))),
    stamina: Math.min(99, Math.max(50, Math.round(70 + (seed % 20)))),
    pressure: Math.min(99, Math.max(40, Math.round(isAllRounder ? 78 + (seed % 15) : 65 + (seed % 25))))
  };
}

/** Update player progression after a completed Mini Match */
export function updateProgressionAfterMatch(match: MiniMatch): Record<string, PlayerProgressionState> {
  const currentStates = loadProgressionStates();
  const ballLog = match.ballLog || [];

  // Track stats per player in this match
  const matchStatsMap: Record<string, {
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    out: boolean;
    oversConceded: number;
    runsConceded: number;
    wickets: number;
  }> = {};

  ballLog.forEach((ball: MatchBall) => {
    // Batting stats
    if (ball.batterId) {
      if (!matchStatsMap[ball.batterId]) {
        matchStatsMap[ball.batterId] = {
          name: ball.batterName || 'Batter',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          out: false,
          oversConceded: 0,
          runsConceded: 0,
          wickets: 0
        };
      }
      const bStat = matchStatsMap[ball.batterId];
      bStat.runs += ball.runs || 0;
      if (!ball.extra) bStat.balls += 1;
      if (ball.outcome === 'FOUR' || ball.runs === 4) bStat.fours += 1;
      if (ball.outcome === 'SIX' || ball.runs === 6) bStat.sixes += 1;
      if (ball.wicket) bStat.out = true;
    }

    // Bowling stats
    if (ball.bowlerId) {
      if (!matchStatsMap[ball.bowlerId]) {
        matchStatsMap[ball.bowlerId] = {
          name: ball.bowlerName || 'Bowler',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          out: false,
          oversConceded: 0,
          runsConceded: 0,
          wickets: 0
        };
      }
      const bwStat = matchStatsMap[ball.bowlerId];
      bwStat.runsConceded += ball.runs || 0;
      bwStat.oversConceded += 0.166;
      if (ball.wicket) bwStat.wickets += 1;
    }
  });

  // Apply progression deltas to participating players
  Object.entries(matchStatsMap).forEach(([playerId, stat]) => {
    let pState = currentStates[playerId];
    if (!pState) {
      pState = {
        playerId,
        batRating: 65,
        batProgress: 65.0,
        bowlRating: 50,
        bowlProgress: 50.0,
        form: 0,
        xp: 0,
        xpMax: 500,
        matchesPlayed: 0,
        totalRuns: 0,
        totalBalls: 0,
        fours: 0,
        sixes: 0,
        wickets: 0,
        bestScore: 0,
        bestBowlingWickets: 0,
        bestBowlingRuns: 0,
        recentPerformances: []
      };
    }

    // Calculate XP earned from batting & bowling performance
    let xpEarned = 10; // Base participation XP
    xpEarned += stat.runs * 1.5;
    xpEarned += stat.fours * 3;
    xpEarned += stat.sixes * 5;
    xpEarned += stat.wickets * 12;

    const sr = stat.balls > 0 ? (stat.runs / stat.balls) * 100 : 0;
    if (stat.runs >= 30) xpEarned += 15;
    if (stat.runs >= 50) xpEarned += 25;

    // Calculate Form delta
    let formDelta = 0;
    if (stat.runs >= 30 || stat.wickets >= 2 || sr >= 160) formDelta = 1;
    if (stat.runs >= 50 || stat.wickets >= 3) formDelta = 2;
    if (stat.out && stat.runs < 5) formDelta = -1;

    // Gradual Rating Progression Calculation (e.g. 65 -> 65.2 -> 65.5 -> 66)
    const batProgDelta = Number((stat.runs * 0.01 + stat.sixes * 0.05).toFixed(2));
    const bowlProgDelta = Number((stat.wickets * 0.15).toFixed(2));

    pState.batProgress = Number((pState.batProgress + batProgDelta).toFixed(1));
    pState.bowlProgress = Number((pState.bowlProgress + bowlProgDelta).toFixed(1));

    // Threshold upgrade: when decimal progress reaches next integer
    pState.batRating = Math.floor(pState.batProgress);
    pState.bowlRating = Math.floor(pState.bowlProgress);

    pState.xp += Math.round(xpEarned);
    while (pState.xp >= pState.xpMax) {
      pState.xp -= pState.xpMax;
      pState.xpMax = Math.round(pState.xpMax * 1.2);
    }

    pState.form = Math.min(5, Math.max(-3, pState.form + formDelta));
    pState.matchesPlayed += 1;
    pState.totalRuns += stat.runs;
    pState.totalBalls += stat.balls;
    pState.fours += stat.fours;
    pState.sixes += stat.sixes;
    pState.wickets += stat.wickets;
    if (stat.runs > pState.bestScore) pState.bestScore = stat.runs;

    if (stat.wickets > pState.bestBowlingWickets) {
      pState.bestBowlingWickets = stat.wickets;
      pState.bestBowlingRuns = Math.round(stat.runsConceded);
    }

    pState.recentPerformances.unshift({
      matchId: match.matchId,
      runs: stat.runs,
      balls: stat.balls,
      wickets: stat.wickets,
      runsConceded: Math.round(stat.runsConceded),
      sr: Math.round(sr),
      xpEarned: Math.round(xpEarned),
      formDelta,
      date: new Date().toLocaleDateString()
    });

    if (pState.recentPerformances.length > 10) {
      pState.recentPerformances.pop();
    }

    currentStates[playerId] = pState;
  });

  saveProgressionStates(currentStates);
  return currentStates;
}
