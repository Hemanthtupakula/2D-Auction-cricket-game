import { AllocationState, RoomStateSnapshot, MiniMatch, SeasonSnapshot, RoomResults } from '../types';

const API_BASE = '/api/rooms';

export async function createRoom(roomName: string, hostDisplayName: string, authToken?: string): Promise<{
  roomCode: string;
  roomId: string;
  hostMemberId: string;
  state: AllocationState;
}> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(authToken ? { 'X-Auth-Token': authToken } : {}) },
    body: JSON.stringify({ roomName, hostDisplayName }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to create room' }));
    throw new Error(error.message || 'Failed to create room');
  }
  return res.json();
}

export async function joinRoom(roomCode: string, displayName: string, authToken?: string): Promise<AllocationState> {
  const res = await fetch(`${API_BASE}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(authToken ? { 'X-Auth-Token': authToken } : {}) },
    body: JSON.stringify({ roomCode, displayName }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to join room' }));
    throw new Error(error.message || 'Failed to join room');
  }
  return res.json();
}

export async function getAllocationState(roomCode: string): Promise<AllocationState> {
  const res = await fetch(`${API_BASE}/${roomCode}/allocation`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to fetch allocation' }));
    throw new Error(error.message || 'Failed to fetch allocation');
  }
  return res.json();
}

export async function claimFranchise(
  roomCode: string,
  memberId: string,
  franchiseCode: string
): Promise<AllocationState> {
  const res = await fetch(`${API_BASE}/${roomCode}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, franchiseCode }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to claim franchise' }));
    throw new Error(error.message || 'Failed to claim franchise');
  }
  return res.json();
}

export async function releaseFranchise(
  roomCode: string,
  memberId: string,
  franchiseCode: string
): Promise<AllocationState> {
  const res = await fetch(`${API_BASE}/${roomCode}/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, franchiseCode }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to release franchise' }));
    throw new Error(error.message || 'Failed to release franchise');
  }
  return res.json();
}

export async function switchFranchise(
  roomCode: string,
  memberId: string,
  currentFranchiseCode: string,
  newFranchiseCode: string
): Promise<AllocationState> {
  const res = await fetch(`${API_BASE}/${roomCode}/switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, currentFranchiseCode, newFranchiseCode }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to switch franchise' }));
    throw new Error(error.message || 'Failed to switch franchise');
  }
  return res.json();
}

export async function rebalanceHostTeams(
  roomCode: string,
  hostMemberId: string,
  franchisesToKeep: string[]
): Promise<AllocationState> {
  const res = await fetch(`${API_BASE}/${roomCode}/rebalance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostMemberId, franchisesToKeep }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to rebalance teams' }));
    throw new Error(error.message || 'Failed to rebalance teams');
  }
  return res.json();
}

export async function leaveRoom(roomCode: string, memberId: string): Promise<AllocationState> {
  const res = await fetch(`${API_BASE}/${roomCode}/leave?memberId=${encodeURIComponent(memberId)}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to leave room' }));
    throw new Error(error.message || 'Failed to leave room');
  }
  return res.json();
}

export async function lockAndStartAuction(roomCode: string, hostMemberId: string): Promise<AllocationState> {
  const res = await fetch(`${API_BASE}/${roomCode}/lock-start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostMemberId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to lock and start auction' }));
    throw new Error(error.message || 'Failed to lock and start auction');
  }
  return res.json();
}

export async function setMemberQuota(
  roomCode: string,
  memberId: string,
  requestedQuota: number
): Promise<AllocationState> {
  const res = await fetch(`${API_BASE}/${roomCode}/quota`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, requestedQuota }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to set quota' }));
    throw new Error(error.message || 'Failed to set quota');
  }
  return res.json();
}

export async function applyRecommended(roomCode: string): Promise<AllocationState> {
  const res = await fetch(`${API_BASE}/${roomCode}/apply-recommended`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to apply recommended allocation' }));
    throw new Error(error.message || 'Failed to apply recommended allocation');
  }
  return res.json();
}

export async function getPlayers(params?: {
  search?: string;
  country?: string;
  overseas?: boolean;
  role?: string;
  capped?: boolean;
  set?: string;
  status?: string;
}): Promise<import('../types').Player[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.country) query.set('country', params.country);
  if (params?.overseas !== undefined) query.set('overseas', String(params.overseas));
  if (params?.role) query.set('role', params.role);
  if (params?.capped !== undefined) query.set('capped', String(params.capped));
  if (params?.set) query.set('set', params.set);
  if (params?.status) query.set('status', params.status);

  const res = await fetch(`/api/players?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch players');
  return res.json();
}

export async function getPlayerById(id: string): Promise<import('../types').Player> {
  const res = await fetch(`/api/players/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch player ${id}`);
  return res.json();
}

export async function drawRandomChit(): Promise<import('../types').Player> {
  const res = await fetch('/api/players/random-chit', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to draw random chit');
  return res.json();
}

export async function getPlayerAudit(): Promise<any> {
  const res = await fetch('/api/players/audit');
  if (!res.ok) throw new Error('Failed to fetch player audit');
  return res.json();
}


export async function getRoomState(roomCode: string): Promise<RoomStateSnapshot> {
  const res = await fetch(`${API_BASE}/${roomCode}/state`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to fetch room state' }));
    const err: any = new Error(error.message || 'Failed to fetch room state');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function drawNextPlayer(roomCode: string, hostMemberId: string): Promise<RoomStateSnapshot> {
  const res = await fetch(`${API_BASE}/${roomCode}/auction/draw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostMemberId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to draw next player' }));
    throw new Error(error.message || 'Failed to draw next player');
  }
  return res.json();
}

export async function placeBid(
  roomCode: string,
  memberId: string,
  franchiseCode: string,
  amountLakhs: number
): Promise<RoomStateSnapshot> {
  const res = await fetch(`${API_BASE}/${roomCode}/auction/bid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, franchiseCode, amountLakhs }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to place bid' }));
    throw new Error(error.message || 'Failed to place bid');
  }
  return res.json();
}

export async function finalizeLot(roomCode: string): Promise<RoomStateSnapshot> {
  const res = await fetch(`${API_BASE}/${roomCode}/auction/finalize`, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to finalize lot' }));
    throw new Error(error.message || 'Failed to finalize lot');
  }
  return res.json();
}

export async function pauseAuction(roomCode: string, hostMemberId: string): Promise<RoomStateSnapshot> {
  const res = await fetch(`${API_BASE}/${roomCode}/auction/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostMemberId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to pause auction' }));
    throw new Error(error.message || 'Failed to pause auction');
  }
  return res.json();
}

export async function resumeAuction(roomCode: string, hostMemberId: string): Promise<RoomStateSnapshot> {
  const res = await fetch(`${API_BASE}/${roomCode}/auction/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostMemberId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to resume auction' }));
    throw new Error(error.message || 'Failed to resume auction');
  }
  return res.json();
}

export async function stopAuction(roomCode: string, hostMemberId: string): Promise<RoomStateSnapshot> {
  const res = await fetch(`${API_BASE}/${roomCode}/auction/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostMemberId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to stop auction' }));
    throw new Error(error.message || 'Failed to stop auction');
  }
  return res.json();
}

export async function proceedCategory(
  roomCode: string,
  memberId: string,
  franchiseCode: string
): Promise<RoomStateSnapshot> {
  const res = await fetch(`${API_BASE}/${roomCode}/auction/proceed-category`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, franchiseCode }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to proceed to category' }));
    throw new Error(error.message || 'Failed to proceed to category');
  }
  return res.json();
}

export async function skipPlayer(
  roomCode: string,
  memberId: string,
  franchiseCode: string
): Promise<RoomStateSnapshot> {
  const res = await fetch(`${API_BASE}/${roomCode}/auction/skip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, franchiseCode }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to skip player' }));
    throw new Error(error.message || 'Failed to skip player');
  }
  return res.json();
}

export async function introComplete(
  roomCode: string,
  memberId: string
): Promise<RoomStateSnapshot> {
  const res = await fetch(`${API_BASE}/${roomCode}/auction/intro-complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to signal intro complete' }));
    throw new Error(error.message || 'Failed to signal intro complete');
  }
  return res.json();
}

export async function preSkipPlayer(
  roomCode: string,
  memberId: string,
  franchiseCode: string,
  playerId: string
): Promise<RoomStateSnapshot> {
  const res = await fetch(`${API_BASE}/${roomCode}/auction/pre-skip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, franchiseCode, playerId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to pre-skip player' }));
    throw new Error(error.message || 'Failed to pre-skip player');
  }
  return res.json();
}

// ===================== Phase 5: Skip Category / Matches / Season =====================

export async function skipCategory(roomCode: string, hostMemberId: string): Promise<RoomStateSnapshot> {
  const res = await fetch(`${API_BASE}/${roomCode}/auction/skip-category`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostMemberId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to skip category' }));
    throw new Error(error.message || 'Failed to skip category');
  }
  return res.json();
}

export async function startMatch(
  roomCode: string,
  memberId: string,
  homeFranchise: string,
  awayFranchise: string,
  overs?: number,
  homeXi?: string[],
  awayXi?: string[]
): Promise<MiniMatch> {
  const res = await fetch(`${API_BASE}/${roomCode}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, homeFranchise, awayFranchise, overs, homeXi, awayXi }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to start match' }));
    throw new Error(error.message || 'Failed to start match');
  }
  return res.json();
}

export async function listMatches(roomCode: string): Promise<MiniMatch[]> {
  const res = await fetch(`${API_BASE}/${roomCode}/matches`);
  if (!res.ok) return [];
  return res.json();
}

export async function getMatch(roomCode: string, matchId: string): Promise<MiniMatch> {
  const res = await fetch(`${API_BASE}/${roomCode}/matches/${matchId}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Match not found' }));
    throw new Error(error.message || 'Match not found');
  }
  return res.json();
}

export async function startSeason(
  roomCode: string,
  hostMemberId: string,
  doubleRoundRobin: boolean,
  overs?: number
): Promise<SeasonSnapshot> {
  const res = await fetch(`${API_BASE}/${roomCode}/season/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostMemberId, doubleRoundRobin, overs }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to start season' }));
    throw new Error(error.message || 'Failed to start season');
  }
  return res.json();
}

export async function getSeason(roomCode: string): Promise<SeasonSnapshot | null> {
  const res = await fetch(`${API_BASE}/${roomCode}/season`);
  if (!res.ok) return null;
  return res.json();
}

export async function startFixtureMatch(
  roomCode: string,
  fixtureId: string,
  memberId: string
): Promise<MiniMatch> {
  const res = await fetch(`${API_BASE}/${roomCode}/season/fixtures/${fixtureId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to start fixture' }));
    throw new Error(error.message || 'Failed to start fixture');
  }
  return res.json();
}

/** Batting owner's timing-meter stop. */
export async function submitMatchIntent(roomCode: string, matchId: string, memberId: string, position: number): Promise<void> {
  await fetch(`${API_BASE}/${roomCode}/matches/${matchId}/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, position }),
  }).catch(() => {});
}

/** Authoritative Batting Action endpoint with intent & timing */
export async function submitBatAction(
  roomCode: string,
  matchId: string,
  memberId: string,
  action: string,
  actionId?: string,
  intent?: string,
  timingQuality?: string
): Promise<void> {
  await fetch(`${API_BASE}/${roomCode}/matches/${matchId}/action/bat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, action, actionId, intent, timingQuality }),
  }).catch(() => {});
}

/** Bowling owner's timing-meter stop. */
export async function submitBowlPlan(roomCode: string, matchId: string, memberId: string, position: number): Promise<void> {
  await fetch(`${API_BASE}/${roomCode}/matches/${matchId}/bowl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, position }),
  }).catch(() => {});
}

/** Authoritative Bowling Action endpoint with physical aim, speed, and release timing */
export async function submitBowlAction(
  roomCode: string,
  matchId: string,
  memberId: string,
  action: string,
  actionId?: string,
  aimX?: number,
  aimZ?: number,
  speed?: string,
  releaseQuality?: string
): Promise<void> {
  await fetch(`${API_BASE}/${roomCode}/matches/${matchId}/action/bowl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, action, actionId, aimX, aimZ, speed, releaseQuality }),
  }).catch(() => {});
}

export async function submitBowlControl(
  roomCode: string,
  matchId: string,
  memberId: string,
  aimX: number,
  aimY: number,
  speed: number,
  release: number
): Promise<MiniMatch> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(roomCode)}/matches/${encodeURIComponent(matchId)}/ball/bowl-control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, aimX, aimY, speed, release })
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Bowling control failed');
  }
  return res.json();
}

export async function submitBatControl(
  roomCode: string,
  matchId: string,
  memberId: string,
  intent: string,
  timing: number
): Promise<MiniMatch> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(roomCode)}/matches/${encodeURIComponent(matchId)}/ball/bat-control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, intent, timing })
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Batting control failed');
  }
  return res.json();
}


/** An owner accepts / readies up for a mini match. */

/** Explicit READY gate for post-wicket, next-over and innings transitions. No timeout. */
export async function readyMatchPhase(roomCode: string, matchId: string, memberId: string): Promise<MiniMatch> {
  const res = await fetch(`${API_BASE}/${roomCode}/matches/${matchId}/phase-ready`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to ready phase' }));
    throw new Error(error.message || 'Failed to ready phase');
  }
  return res.json();
}

/** Restart the current match from the beginning; only a franchise owner may do this. */
export async function restartMatch(roomCode: string, matchId: string, memberId: string): Promise<MiniMatch> {
  const res = await fetch(`${API_BASE}/${roomCode}/matches/${matchId}/restart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to restart match' }));
    throw new Error(error.message || 'Failed to restart match');
  }
  return res.json();
}

export async function readyMatch(roomCode: string, matchId: string, memberId: string): Promise<MiniMatch> {
  const res = await fetch(`${API_BASE}/${roomCode}/matches/${matchId}/ready`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to ready match' }));
    throw new Error(error.message || 'Failed to ready match');
  }
  return res.json();
}

/** Host resets the season (mid-tournament or after completion). */
export async function restartSeason(roomCode: string, hostMemberId: string): Promise<void> {
  await fetch(`${API_BASE}/${roomCode}/season/restart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostMemberId }),
  }).catch(() => {});
}

/** Both owners select & lock toss call (HEADS/TAILS). */
export async function submitTossCall(roomCode: string, matchId: string, memberId: string, call: 'HEADS' | 'TAILS'): Promise<MiniMatch> {
  const res = await fetch(`${API_BASE}/${roomCode}/matches/${matchId}/toss-call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, call }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to submit toss call' }));
    throw new Error(error.message || 'Failed to submit toss call');
  }
  return res.json();
}

/** Toss winner chooses to bat or bowl first. */
export async function tossCall(roomCode: string, matchId: string, memberId: string, call: 'BAT' | 'BOWL'): Promise<MiniMatch> {
  const res = await fetch(`${API_BASE}/${roomCode}/matches/${matchId}/toss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, call }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to make toss choice' }));
    throw new Error(error.message || 'Failed to make toss choice');
  }
  return res.json();
}

/** Batting owner selects & locks Striker & Non-Striker openers. */
export async function selectOpeners(roomCode: string, matchId: string, memberId: string, strikerId: string, nonStrikerId: string): Promise<MiniMatch> {
  const res = await fetch(`${API_BASE}/${roomCode}/matches/${matchId}/openers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, strikerId, nonStrikerId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to select openers' }));
    throw new Error(error.message || 'Failed to select openers');
  }
  return res.json();
}

/** Bowling owner selects which bowler from their XI bowls the over. */
export async function selectMatchBowler(roomCode: string, matchId: string, memberId: string, playerId: string): Promise<MiniMatch> {
  const res = await fetch(`${API_BASE}/${roomCode}/matches/${matchId}/select-bowler`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, playerId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to select bowler' }));
    throw new Error(error.message || 'Failed to select bowler');
  }
  return res.json();
}

/** Batting owner selects which batter from their XI comes out next. */
export async function selectMatchBatter(roomCode: string, matchId: string, memberId: string, playerId: string): Promise<MiniMatch> {
  const res = await fetch(`${API_BASE}/${roomCode}/matches/${matchId}/select-batter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, playerId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to select batter' }));
    throw new Error(error.message || 'Failed to select batter');
  }
  return res.json();
}

// ===== 2D Mini Match Proposal & Controls =====

export async function createMiniMatchProposal(payload: {
  roomId: string;
  creatorOwnerId: string;
  opponentOwnerId: string;
  franchiseA: string;
  franchiseB: string;
  overs: number;
}): Promise<import('../types').MiniMatchProposal> {
  const res = await fetch('/api/minimatch/proposals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to create proposal' }));
    throw new Error(err.message || 'Failed to create proposal');
  }
  return res.json();
}

export async function getMiniMatchProposals(roomId: string): Promise<import('../types').MiniMatchProposal[]> {
  const res = await fetch(`/api/minimatch/proposals/room/${roomId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function acceptMiniMatchProposal(proposalId: string, ownerId: string): Promise<MiniMatch> {
  const res = await fetch(`/api/minimatch/proposals/${proposalId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to accept proposal' }));
    throw new Error(err.message || 'Failed to accept proposal');
  }
  return res.json();
}

export async function declineMiniMatchProposal(proposalId: string, ownerId: string): Promise<import('../types').MiniMatchProposal> {
  const res = await fetch(`/api/minimatch/proposals/${proposalId}/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to decline proposal' }));
    throw new Error(err.message || 'Failed to decline proposal');
  }
  return res.json();
}

export async function cancelMiniMatchProposal(proposalId: string, ownerId: string): Promise<import('../types').MiniMatchProposal> {
  const res = await fetch(`/api/minimatch/proposals/${proposalId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to cancel proposal' }));
    throw new Error(err.message || 'Failed to cancel proposal');
  }
  return res.json();
}

export async function submitMiniMatchXi(matchId: string, payload: {
  ownerId: string;
  franchiseCode: string;
  playerIds: string[];
  captainId?: string;
  wicketkeeperId?: string;
}): Promise<MiniMatch> {
  const res = await fetch(`/api/minimatch/${matchId}/xi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to lock Playing XI' }));
    throw new Error(err.message || 'Failed to lock Playing XI');
  }
  return res.json();
}

export async function submitMiniMatchTossCall2D(matchId: string, ownerId: string, call: 'HEADS' | 'TAILS'): Promise<MiniMatch> {
  const res = await fetch(`/api/minimatch/${matchId}/toss/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, call }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to call toss' }));
    throw new Error(err.message || 'Failed to call toss');
  }
  return res.json();
}

export async function submitMiniMatchTossChoice2D(matchId: string, ownerId: string, choice: 'BAT' | 'BOWL'): Promise<MiniMatch> {
  const res = await fetch(`/api/minimatch/${matchId}/toss/choose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, choice }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to make toss choice' }));
    throw new Error(err.message || 'Failed to make toss choice');
  }
  return res.json();
}

export async function pauseMiniMatch2D(matchId: string, ownerId: string, reason?: string): Promise<MiniMatch> {
  const res = await fetch(`/api/minimatch/${matchId}/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to pause match' }));
    throw new Error(err.message || 'Failed to pause match');
  }
  return res.json();
}

export async function resumeMiniMatch2D(matchId: string, ownerId: string): Promise<MiniMatch> {
  const res = await fetch(`/api/minimatch/${matchId}/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to resume match' }));
    throw new Error(err.message || 'Failed to resume match');
  }
  return res.json();
}

export async function exitMiniMatch2D(matchId: string, ownerId: string, reason?: string): Promise<MiniMatch> {
  const res = await fetch(`/api/minimatch/${matchId}/exit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to exit match' }));
    throw new Error(err.message || 'Failed to exit match');
  }
  return res.json();
}

export async function getMiniMatchScorecard2D(matchId: string): Promise<any> {
  const res = await fetch(`/api/minimatch/${matchId}/scorecard`);
  if (!res.ok) return null;
  return res.json();
}


// ===== Optional account auth (email + password + security question) =====
export interface AuthResult {
  token: string;
  memberId: string;
  displayName: string;
  email: string;
}

const AUTH_BASE = API_BASE.replace('/rooms', '/auth');

async function authPost(path: string, body: Record<string, string>): Promise<AuthResult> {
  const res = await fetch(`${AUTH_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Authentication failed');
  return data as AuthResult;
}

export const authRegister = (email: string, password: string, displayName: string, securityQuestion: string, securityAnswer: string) =>
  authPost('/register', { email, password, displayName, securityQuestion, securityAnswer });

export const authLogin = (email: string, password: string) =>
  authPost('/login', { email, password });

export const authRecover = (email: string, securityAnswer: string, newPassword: string) =>
  authPost('/recover', { email, securityAnswer, newPassword });

/** Rooms this account can resume (host paused, closed tab, play later from any device). */
export async function myRooms(token: string): Promise<Array<{ roomCode: string; roomName: string; status: string; isHost?: boolean }>> {
  const res = await fetch(`${AUTH_BASE}/rooms?token=${encodeURIComponent(token)}`);
  if (!res.ok) return [];
  return res.json();
}

/** Persisted results gallery (matches, trophies, player scorecards, team records). */
export async function getResults(roomCode: string): Promise<RoomResults | null> {
  const res = await fetch(`${API_BASE}/${roomCode}/matches/results`);
  if (!res.ok) return null;
  return res.json();
}

/** Host deletes a room they created (clear an old paused game). */
export async function deleteRoom(roomCode: string, memberId: string, authToken?: string): Promise<void> {
  await fetch(`${API_BASE}/${roomCode}?memberId=${encodeURIComponent(memberId)}`, {
    method: 'DELETE',
    headers: authToken ? { 'X-Auth-Token': authToken } : {},
  }).catch(() => {});
}
