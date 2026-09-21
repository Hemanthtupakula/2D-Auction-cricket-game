export type MiniMatchOvers = 2 | 5 | 10 | 20;
export type TournamentOvers = 5 | 20;

export type MatchState =
  | "PROPOSED" | "ACCEPTED" | "XI_SELECTION" | "TOSS"
  | "READY" | "INNINGS" | "PAUSED" | "INNINGS_BREAK"
  | "RESULT" | "FORFEIT";

export interface OwnerRef {
  ownerId: string;
  franchiseId: string;
  displayName: string;
}

export interface PlayerRef {
  playerId: string;
  name: string;
  bat: number;
  bowl: number;
}

export interface MatchSnapshot {
  matchId: string;
  state: MatchState;
  overs: number;
  ownerA: OwnerRef;
  ownerB: OwnerRef;
  playingXI_A: PlayerRef[];
  playingXI_B: PlayerRef[];
  innings: 1 | 2;
  scoreA: number;
  wicketsA: number;
  scoreB: number;
  wicketsB: number;
  ballNumber: number;
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
  pausedByOwnerId?: string;
  serverSequence: number;
}
