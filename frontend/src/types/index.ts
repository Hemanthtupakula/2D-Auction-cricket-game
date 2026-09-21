export type FranchiseCode =
  | 'MI'
  | 'CSK'
  | 'RCB'
  | 'KKR'
  | 'SRH'
  | 'RR'
  | 'DC'
  | 'PBKS'
  | 'GT'
  | 'LSG';

export type RoomStatus =
  | 'LOBBY'
  | 'READY'
  | 'STARTING'
  | 'AUCTION_ACTIVE'
  | 'PAUSED'
  | 'STOPPED'
  | 'COMPLETED';

export type FranchiseOwnerType = 'HUMAN' | 'UNASSIGNED' | 'INACTIVE';

export type MemberRole = 'HOST' | 'PARTICIPANT';

export interface FranchiseSeat {
  code: FranchiseCode;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  city: string;
  ownerType: FranchiseOwnerType;
  ownerMemberId: string | null;
  ownerDisplayName: string | null;
  isOpen: boolean;
  isHuman: boolean;
  isInactive: boolean;
}

export interface RoomMember {
  memberId: string;
  displayName: string;
  role: MemberRole;
  isHost: boolean;
  targetQuota: number;
  requestedQuota: number;
  heldCount: number;
  ownedFranchises: FranchiseCode[];
}

export interface AllocationState {
  roomId: string;
  roomCode: string;
  roomName: string;
  status: RoomStatus;
  hostMemberId: string;
  humanMemberCount: number;
  openTeamCount: number;
  claimedTeamCount: number;
  readyToLock: boolean;
  canStartAuction: boolean;
  validationMessage: string | null;
  totalRequestedQuota: number;
  rebalanceRequired: boolean;
  seats: FranchiseSeat[];
  members: RoomMember[];
  activityFeed: string[];
  version: number;
}

export interface PlayerIPLStats {
  seasons: number | null;
  matches: number | null;
  battingInnings: number | null;
  runs: number | null;
  ballsFaced: number | null;
  battingAverage: number | null;
  strikeRate: number | null;
  hundreds: number | null;
  fifties: number | null;
  highestScore: string | null;
  fours: number | null;
  sixes: number | null;
  wickets: number | null;
  bowlingInnings: number | null;
  runsConceded: number | null;
  bowlingAverage: number | null;
  economy: number | null;
  bowlingStrikeRate: number | null;
  bestBowling: string | null;
  catches: number | null;
  stumpings: number | null;
}

export interface PlayerIntlStats {
  testCaps: number | null;
  odiCaps: number | null;
  t20iCaps: number | null;
  intlRuns: number | null;
  intlWickets: number | null;
  intlBattingAvg: number | null;
  intlBowlingAvg: number | null;
}

export interface PlayerRecentStats {
  recentSeason: string | null;
  recentTeam: string | null;
  recentMatches: number | null;
  recentRuns: number | null;
  recentWickets: number | null;
  recentStrikeRate: number | null;
  recentEconomy: number | null;
}

export interface PlayerDomesticStats {
  fcMatches: number | null;
  fcRuns: number | null;
  fcWickets: number | null;
  listAMatches: number | null;
  listARuns: number | null;
  listAWickets: number | null;
  t20Matches: number | null;
  t20Runs: number | null;
  t20Wickets: number | null;
  topTournaments?: string[] | null;
  source?: string | null;
  sourceType?: string | null;
}

export interface PlayerOverGraphStats {
  slug: string | null;
  name: string | null;
  role: string | null;
  team: string | null;
  confidence: 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'REVIEW_REQUIRED';
  matches: number | null;
  runs: number | null;
  strikeRate: number | null;
  average: number | null;
  wickets: number | null;
  economy: number | null;
  highestScore: string | null;
  fifties: number | null;
  hundreds: number | null;
  fours: number | null;
  sixes: number | null;
  threeWickets: number | null;
  fiveWickets: number | null;
  catches: number | null;
  source: string;
  sourceType: string;
}

export interface OverGraphSeasonItem {
  season: string;
  matches?: number | null;
  runs?: number | null;
  strikeRate?: number | null;
  average?: number | null;
  wickets?: number | null;
  economy?: number | null;
}

export interface OverGraphPositionItem {
  position: string;
  innings: number;
  runs: number;
  average: number | null;
  strikeRate: number | null;
  fifties: number;
  hundreds: number;
  highestScore: string | number;
}

export interface OverGraphDetailedDossier {
  playerId: string;
  fullName: string;
  overGraphSlug?: string;
  matches?: number | null;
  runs?: number | null;
  strikeRate?: number | null;
  average?: number | null;
  wickets?: number | null;
  economy?: number | null;
  highestScore?: string | null;
  fifties?: number | null;
  hundreds?: number | null;
  fours?: number | null;
  sixes?: number | null;
  catches?: number | null;
  seasonsTimeline?: OverGraphSeasonItem[];
  positionBreakdown?: OverGraphPositionItem[];
  radarMetrics?: { power: number; consistency: number; tempo: number };
  source?: string;
}

export interface PlayerMediaInfo {
  id?: string;
  playerId?: string;
  mediaType?: string;
  storageProvider?: string;
  storageFileId?: string | null;
  storagePath?: string | null;
  deliveryUrl?: string | null;
  photoUrl?: string;
  sourceUrl?: string | null;
  sourcePageUrl?: string | null;
  sourceName?: string | null;
  status?: string;
  rightsStatus?: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  checksum?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
  retrievedAt?: string;
  updatedAt?: string;
  errorMessage?: string | null;
  cloudflareImageId?: string;
  photoSourceName?: string;
  photoSourceUrl?: string;
  photoStatus?: string;
  deliveryStatus?: string;
}

export interface Player {
  id: string;
  lotNumber: number;
  fullName: string;
  shortName: string;
  country: string;
  nationality: string;
  dateOfBirth: string;
  age: number;
  role: 'Batter' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper';
  battingStyle: string | null;
  bowlingStyle: string | null;
  isCapped: boolean;
  isOverseas: boolean;
  knownTeams: string[];
  auctionSet: string;
  basePrice: number;
  source: string;
  sourceUrl: string;
  sourceCheckedAt: string;
  photoUrl?: string;
  ipl: PlayerIPLStats | null;
  international: PlayerIntlStats | null;
  recent: PlayerRecentStats | null;
  domestic?: PlayerDomesticStats | null;
  overGraph?: PlayerOverGraphStats | null;
  media: PlayerMediaInfo;
  status: 'REMAINING' | 'ON_BLOCK' | 'SOLD' | 'UNSOLD';
  soldToFranchise?: string | null;
  soldPrice?: number | null;
}


export type AuctionPhase =
  | 'WAITING_FOR_DRAW'
  | 'REVEALING'
  | 'BIDDING'
  | 'GOING_ONCE'
  | 'GOING_TWICE'
  | 'THIRD_CALL'
  | 'FINALIZING'
  | 'SOLD'
  | 'UNSOLD'
  | 'PAUSED'
  | 'CATEGORY_PREVIEW'
  | 'CATEGORY_COMPLETE'
  | 'AUCTION_COMPLETE';

export interface AuctionBid {
  franchiseCode: string;
  franchiseName: string;
  memberId: string;
  displayName: string;
  amountLakhs: number;
  timestampMillis: number;
}

export interface AuctionLot {
  lotNumber: number;
  player: Player;
  basePriceLakhs: number;
  currentBidLakhs: number;
  highestBidderFranchise: string | null;
  highestBidderName: string | null;
  highestBidderMemberId: string | null;
  deadlineEpochMillis: number;
  phase: AuctionPhase;
  bidHistory: AuctionBid[];
  skippedFranchises?: string[];
  biddingOpen?: boolean;
  introductionDeadlineEpochMillis?: number;
  bypassed?: boolean;
}

export interface FranchiseAuctionState {
  franchiseCode: string;
  franchiseName: string;
  ownerMemberId: string | null;
  ownerDisplayName: string | null;
  active: boolean;
  purseLakhs: number;
  spentLakhs: number;
  squad: Player[];
  squadSize: number;
  overseasCount: number;
}

export interface RoomStateSnapshot {
  roomCode: string;
  roomName: string;
  hostMemberId: string;
  status: RoomStatus;
  version: number;
  allocation: AllocationState;
  currentLot: AuctionLot | null;
  franchises: Record<string, FranchiseAuctionState>;
  completedLots: AuctionLot[];
  isPaused: boolean;
  startingPurseLakhs: number;
  serverNowEpochMillis: number;
  currentCategory?: string;
  currentCategoryName?: string;
  categoryIndex?: number;
  totalCategories?: number;
  categoryPlayerCount?: number;
  categoryRemainingCount?: number;
  categoryCompletedCount?: number;
  categoryConfirmedFranchises?: string[];
  categoryActive?: boolean;
  categoryPlayers?: Player[];
  playerPreSkips?: Record<string, string[]>;
  championFranchise?: string | null;
}


// ===================== Phase 5: Mini Match & Season Mode =====================

export interface MatchBall {
  innings: number;
  ballNumber: number;
  overNumber: number;
  ballInOver: number;
  battingFranchise: string;
  bowlingFranchise: string;
  batterId: string;
  batterName: string;
  bowlerId: string;
  bowlerName: string;
  outcome: 'DOT' | 'RUNS' | 'FOUR' | 'SIX' | 'WICKET' | 'WIDE' | 'NO_BALL';
  runs: number;
  wicket: boolean;
  extra: boolean;
  scoreRuns: number;
  scoreWickets: number;
  scoreBalls: number;
  target?: number | null;
  commentary: string;
  shotIntent?: 'PERFECT' | 'GOOD' | 'OKAY' | 'POOR';
  bowlPlan?: 'PERFECT' | 'GOOD' | 'OKAY' | 'POOR';
  legalBall?: boolean;
  deliveryType?: string;
  line?: string;
  length?: string;
  shot?: string;
  timing?: string;
  wicketType?: string;
}

export interface MatchAuditEvent {
  timestamp: string;
  actor: string;
  action: string;
  details?: Record<string, any>;
  isSystemDecision?: boolean;
}

export interface MatchAwaitInput {
  matchId: string;
  deadlineEpochMillis: number;
  battingFranchise: string;
  bowlingFranchise: string;
  batterId: string;
  batterName: string;
  bowlerId: string;
  bowlerName: string;
  overNumber: number;
  ballInOver: number;
  innings: number;
  batPerfect: number;
  batGood: number;
  batOkay: number;
  bowlPerfect: number;
  bowlGood: number;
  bowlOkay: number;
}

export type MatchStatus =
  | 'MATCH_CREATED'
  | 'TEAM_XI_SELECTION'
  | 'XI_LOCKED'
  | 'XI_PREVIEW'
  | 'TOSS_SELECTION'
  | 'TOSS_LOCKED'
  | 'TOSS_RESULT'
  | 'BAT_OR_BOWL_SELECTION'
  | 'BAT_OR_BOWL_LOCKED'
  | 'INITIAL_BATTER_SELECTION'
  | 'BATTERS_LOCKED'
  | 'BOWLER_SELECTION'
  | 'BOWLER_LOCKED'
  | 'BALL_READY'
  | 'BALL_EXECUTION'
  | 'BALL_RESULT'
  | 'WICKET_PAUSE'
  | 'OVER_SUMMARY'
  | 'NEXT_BOWLER_SELECTION'
  | 'INNINGS_BREAK'
  | 'MATCH_COMPLETE'
  | 'AWAITING_READY'
  | 'TOSS'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export interface MiniMatch {
  matchId: string;
  roomCode: string;
  homeFranchise: string;
  awayFranchise: string;
  homeXi: Player[];
  awayXi: Player[];
  homeBattingOrder: string[];
  awayBattingOrder: string[];
  homeBowlers: string[];
  awayBowlers: string[];
  innings: number;
  homeRuns: number;
  homeWickets: number;
  homeBalls: number;
  awayRuns: number;
  awayWickets: number;
  awayBalls: number;
  currentBatterIndex: number;
  target?: number | null;
  ballLog: MatchBall[];
  runsByPlayer: Record<string, number>;
  wicketsByPlayer: Record<string, number>;
  playerNames: Record<string, string>;
  winnerFranchise?: string | null;
  resultText?: string | null;
  tieBreakNote?: string | null;
  status: MatchStatus;
  tossWinnerFranchise?: string | null;
  freeHitNext?: boolean;
  overs?: number;
  readyHome?: boolean;
  readyAway?: boolean;
  homeXiLocked?: boolean;
  awayXiLocked?: boolean;
  homeTossCall?: 'HEADS' | 'TAILS' | null;
  awayTossCall?: 'HEADS' | 'TAILS' | null;
  tossDecision?: 'BAT' | 'BOWL' | null;
  currentStrikerId?: string | null;
  currentNonStrikerId?: string | null;
  currentBowlerId?: string | null;
  battersLocked?: boolean;
  bowlerLocked?: boolean;
  intentSubmitted?: boolean;
  planSubmitted?: boolean;
  shotAction?: string;
  deliveryAction?: string;
  aimX?: number;
  aimZ?: number;
  bowlingSpeed?: 'SLOW' | 'MEDIUM' | 'FAST';
  releaseQuality?: 'EARLY' | 'GOOD' | 'PERFECT' | 'LATE';
  batIntent?: 'DEFEND' | 'NORMAL' | 'LOFT' | 'LEAVE';
  batTimingQuality?: 'EARLY' | 'GOOD' | 'PERFECT' | 'LATE';
  tossCoinFlipping?: boolean;
  xiPreviewEndTime?: number | null;
  overSummaryEndTime?: number | null;
  previewDeadlineEpochMillis?: number;
  overSummaryDeadlineEpochMillis?: number;
  battingFranchise?: string | null;
  bowlingFranchise?: string | null;
  dismissedBatterIds?: string[];
  seasonFixtureId?: string | null;
  phaseReadyHome?: boolean;
  phaseReadyAway?: boolean;
  auditTrail?: MatchAuditEvent[];
  humanActionCount?: number;
  serverRuleActionCount?: number;
  systemDecisionCount?: number;
  cpuDecisionCount?: number;
}

export interface SeasonFixture {
  fixtureId: string;
  label: string;
  stage: 'LEAGUE' | 'PLAYOFF';
  homeFranchise: string;
  awayFranchise: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  matchId?: string | null;
  winnerFranchise?: string | null;
  loserFranchise?: string | null;
  homeRuns: number;
  homeBalls: number;
  awayRuns: number;
  awayBalls: number;
  resultText?: string | null;
}

export interface PointsTableRow {
  franchise: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  nrr: number;
}

export interface SeasonAwards {
  orangeCap?: { playerId: string; playerName: string; franchise: string; runs: number };
  purpleCap?: { playerId: string; playerName: string; franchise: string; wickets: number };
  bestBuy?: { playerId: string; playerName: string; franchise: string; priceCr: number; impactScore: number; valueScore: number };
}

export interface SeasonSnapshot {
  seasonId: string;
  roomCode: string;
  doubleRoundRobin: boolean;
  stage: 'LEAGUE' | 'PLAYOFFS' | 'COMPLETED';
  teams: string[];
  fixtures: SeasonFixture[];
  pointsTable: PointsTableRow[];
  championFranchise: string;
  runnerUpFranchise: string;
  awards: SeasonAwards;
  nextFixtureId: string;
}

// ===== Persisted results gallery =====
export interface MatchResultRecord {
  matchId: string;
  homeFranchise: string;
  awayFranchise: string;
  homeRuns: number;
  homeWickets: number;
  awayRuns: number;
  awayWickets: number;
  winnerFranchise: string;
  resultText: string;
  overs: number;
  fixtureId?: string;
  completedAt: string;
  players: Array<{ playerId: string; name: string; team: string; runs: number; wickets: number }>;
}

export interface RoomResults {
  matches: MatchResultRecord[];
  achievements: Array<{ type: string; team: string; seasonId: string; at: string }>;
  playerStats: Array<{
    playerId: string; name: string; team: string;
    runs: number; wickets: number; matches: number;
    fifties: number; hundreds: number; bestBowling: number;
  }>;
  teamStats: Array<{
    team: string; played: number; won: number; lost: number;
    runsFor: number; runsAgainst: number; trophies: number;
  }>;
}

// ===== 2D Mini Match Contracts & Types =====
export type MiniMatchOvers = 2 | 5 | 10 | 20;

export type Match2DState =
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'XI_SELECTION'
  | 'TOSS'
  | 'READY'
  | 'INNINGS'
  | 'PAUSED'
  | 'INNINGS_BREAK'
  | 'RESULT'
  | 'COMPLETE'
  | 'FORFEIT';

export interface MiniMatchProposal {
  proposalId: string;
  roomId: string;
  creatorOwnerId: string;
  opponentOwnerId: string;
  franchiseA: string;
  franchiseB: string;
  overs: number;
  status: 'PROPOSED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface BallOutcome2D {
  innings: number;
  ballNumber: number;
  overNumber: number;
  ballInOver: number;
  battingFranchise: string;
  bowlingFranchise: string;
  batterId: string;
  batterName: string;
  bowlerId: string;
  bowlerName: string;
  outcome: string; // DOT, SINGLE, DOUBLE, TRIPLE, FOUR, SIX, WICKET, WIDE
  runs: number;
  wicket: boolean;
  extra: boolean;
  scoreRuns: number;
  scoreWickets: number;
  scoreBalls: number;
  target?: number;
  commentary: string;
  shotIntent?: string;
  bowlPlan?: string;
  deliveryType?: string;
  line?: string;
  length?: string;
  shot?: string;
  timing?: string;
  wicketType?: string;
}

