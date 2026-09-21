package com.auctionxi.match;

import com.auctionxi.exception.AllocationErrorCode;
import com.auctionxi.exception.AllocationException;
import com.auctionxi.model.AuctionRoom;
import com.auctionxi.model.FranchiseAuctionState;
import com.auctionxi.model.FranchiseSeat;
import com.auctionxi.model.Player;
import com.auctionxi.model.RoomStatus;
import com.auctionxi.service.RealtimePublisher;
import com.auctionxi.service.RoomStore;
import com.auctionxi.season.SeasonService;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;

/**
 * AUCTION XI Authoritative Match Engine Service.
 * Enforces: "NO OWNER ACTION = NO MATCH PROGRESSION."
 * All match actions require explicit owner locks. Timers only control visual UI countdowns.
 */
@Service
public class MiniMatchService {
    private static final Logger log = LoggerFactory.getLogger(MiniMatchService.class);

    private static final long DECISION_MS = 8_000L;
    private static final double WIDE_PROBABILITY = 0.04;

    private final RoomStore roomStore;
    private final RealtimePublisher realtimePublisher;
    private final ObjectProvider<SeasonService> seasonServiceProvider;
    private final com.auctionxi.persistence.MatchPersistenceService matchPersistenceService;

    @Autowired
    private MatchResultStore resultStore;
    @Autowired
    private com.auctionxi.service.PlayerDataService playerDataService;
    private final Map<String, MiniMatch> matches = new ConcurrentHashMap<>();
    private final Map<String, com.auctionxi.match.model.MiniMatchProposal> proposals = new ConcurrentHashMap<>();
    /** Idempotency keys for owner actions; prevents duplicate HTTP/WebSocket retries from resolving twice. */
    private final Map<String, Set<String>> processedActionIds = new ConcurrentHashMap<>();

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4, new ThreadFactory() {
        private int n = 0;
        @Override
        public Thread newThread(Runnable r) {
            Thread t = new Thread(r, "auction-xi-match-tick-" + (++n));
            t.setDaemon(true);
            return t;
        }
    });

    public MiniMatchService(RoomStore roomStore,
                            RealtimePublisher realtimePublisher,
                            ObjectProvider<SeasonService> seasonServiceProvider) {
        this(roomStore, realtimePublisher, seasonServiceProvider, null);
    }

    @Autowired
    public MiniMatchService(RoomStore roomStore,
                            RealtimePublisher realtimePublisher,
                            ObjectProvider<SeasonService> seasonServiceProvider,
                            @org.springframework.lang.Nullable com.auctionxi.persistence.MatchPersistenceService matchPersistenceService) {
        this.roomStore = roomStore;
        this.realtimePublisher = realtimePublisher;
        this.seasonServiceProvider = seasonServiceProvider;
        this.matchPersistenceService = matchPersistenceService;
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdownNow();
    }

    // =========================================================================
    // MATCH LIFECYCLE & CREATION
    // =========================================================================

    public MiniMatch startMatch(String roomCode, String memberId, String homeCode, String awayCode, Integer overs, List<String> homeXiReq, List<String> awayXiReq) {
        return startMatch(roomCode, memberId, homeCode, awayCode, null, overs, homeXiReq, awayXiReq);
    }

    public MiniMatch startMatch(String roomCode, String memberId, String homeCode, String awayCode, String seasonFixtureId,
                                Integer overs, List<String> homeXiReq, List<String> awayXiReq) {
        int oversFinal = normalizeOvers(overs);
        AuctionRoom room = roomStore.findByCode(roomCode)
                .orElseThrow(() -> new AllocationException(AllocationErrorCode.ROOM_NOT_FOUND, "Room not found: " + roomCode));
        room.getLock().lock();
        try {
            if (homeCode == null || awayCode == null || homeCode.equalsIgnoreCase(awayCode)) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Pick two different franchises.");
            }

            FranchiseAuctionState home = room.getFranchiseAuctionState(homeCode);
            FranchiseAuctionState away = room.getFranchiseAuctionState(awayCode);
            if (home == null || away == null) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Pick two valid franchises.");
            }
            if (!home.isActive()) home.setActive(true);
            if (!away.isActive()) away.setActive(true);

            if (home.getOwnerMemberId() == null) {
                FranchiseSeat seat = room.getSeat(homeCode);
                if (seat != null && seat.getOwnerMemberId() != null) home.setOwnerMemberId(seat.getOwnerMemberId());
            }
            if (away.getOwnerMemberId() == null) {
                FranchiseSeat seat = room.getSeat(awayCode);
                if (seat != null && seat.getOwnerMemberId() != null) away.setOwnerMemberId(seat.getOwnerMemberId());
            }

            // Auto-clear old completed matches in this room so starting new match never blocks
            matches.values().removeIf(m -> m.getRoomCode().equalsIgnoreCase(roomCode)
                    && (m.getStatus() == MiniMatch.Status.MATCH_COMPLETE || m.getStatus() == MiniMatch.Status.COMPLETED));

            List<Player> homeXi = resolveXi(home, homeXiReq, homeCode);
            List<Player> awayXi = resolveXi(away, awayXiReq, awayCode);

            List<String> homeOrder = battingOrderOf(homeXi);
            List<String> awayOrder = battingOrderOf(awayXi);
            List<String> homeBowlers = bowlersOf(homeXi);
            List<String> awayBowlers = bowlersOf(awayXi);

            String matchId = UUID.randomUUID().toString().substring(0, 8);
            long seed = new Random().nextLong();

            MiniMatch match = new MiniMatch(matchId, room.getRoomCode(),
                    home.getFranchiseCode(), away.getFranchiseCode(),
                    homeXi, awayXi, homeOrder, awayOrder, homeBowlers, awayBowlers,
                    seed, seasonFixtureId);
            match.setOvers(oversFinal);
            match.setStatus(MiniMatch.Status.TEAM_XI_SELECTION);
            matches.put(matchId, match);

            room.addActivity(String.format("MATCH Challenge: %s vs %s created.", home.getFranchiseCode(), away.getFranchiseCode()));
            log.info("Match {} started in room {}: {} vs {} (seed {})", matchId, roomCode, homeCode, awayCode, seed);

            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "MATCH_CHALLENGE", matchSummary(match));
            return match;
        } finally {
            room.getLock().unlock();
        }
    }

    public MiniMatch getMatch(String roomCode, String matchId) {
        MiniMatch m = matches.get(matchId);
        if (m == null || !m.getRoomCode().equalsIgnoreCase(roomCode)) {
            throw new AllocationException(AllocationErrorCode.MATCH_NOT_FOUND, "Match not found: " + matchId);
        }
        return m;
    }

    public List<MiniMatch> listMatches(String roomCode) {
        return matches.values().stream()
                .filter(m -> m.getRoomCode().equalsIgnoreCase(roomCode))
                .collect(Collectors.toList());
    }

    public MiniMatch getMatchById(String matchId) {
        MiniMatch m = matches.get(matchId);
        if (m == null) {
            throw new AllocationException(AllocationErrorCode.MATCH_NOT_FOUND, "Match not found: " + matchId);
        }
        return m;
    }

    // =========================================================================
    // PROPOSALS & MULTIPLAYER MATCH MATCHMAKING
    // =========================================================================

    public com.auctionxi.match.model.MiniMatchProposal createProposal(com.auctionxi.match.dto.ProposalRequestDto dto) {
        if (isOwnerInActiveMatch(dto.getRoomId(), dto.getCreatorOwnerId())) {
            throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "You are already in an active match.");
        }
        com.auctionxi.match.model.MiniMatchProposal proposal = new com.auctionxi.match.model.MiniMatchProposal(
                dto.getRoomId(),
                dto.getCreatorOwnerId(),
                dto.getOpponentOwnerId(),
                dto.getFranchiseA(),
                dto.getFranchiseB(),
                dto.getOvers()
        );
        proposals.put(proposal.getProposalId(), proposal);
        realtimePublisher.broadcastAuctionEvent(dto.getRoomId(), "MINIMATCH_PROPOSAL_CREATED", proposal);
        return proposal;
    }

    public List<com.auctionxi.match.model.MiniMatchProposal> getProposalsForRoom(String roomId) {
        return proposals.values().stream()
                .filter(p -> p.getRoomId().equalsIgnoreCase(roomId))
                .collect(Collectors.toList());
    }

    public MiniMatch acceptProposal(String proposalId, String ownerId) {
        com.auctionxi.match.model.MiniMatchProposal p = proposals.get(proposalId);
        if (p == null || !"PROPOSED".equalsIgnoreCase(p.getStatus())) {
            throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Proposal not found or inactive.");
        }
        if (isOwnerInActiveMatch(p.getRoomId(), ownerId)) {
            throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Owner is already playing an active match.");
        }
        p.setStatus("ACCEPTED");
        p.setUpdatedAt(Instant.now());
        realtimePublisher.broadcastAuctionEvent(p.getRoomId(), "MINIMATCH_PROPOSAL_UPDATED", p);

        // Start the 2D Mini Match
        return startMatch(p.getRoomId(), ownerId, p.getFranchiseA(), p.getFranchiseB(), p.getOvers(), null, null);
    }

    public com.auctionxi.match.model.MiniMatchProposal declineProposal(String proposalId, String ownerId) {
        com.auctionxi.match.model.MiniMatchProposal p = proposals.get(proposalId);
        if (p == null) throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Proposal not found.");
        p.setStatus("DECLINED");
        p.setUpdatedAt(Instant.now());
        realtimePublisher.broadcastAuctionEvent(p.getRoomId(), "MINIMATCH_PROPOSAL_UPDATED", p);
        return p;
    }

    public com.auctionxi.match.model.MiniMatchProposal cancelProposal(String proposalId, String ownerId) {
        com.auctionxi.match.model.MiniMatchProposal p = proposals.get(proposalId);
        if (p == null) throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Proposal not found.");
        p.setStatus("CANCELLED");
        p.setUpdatedAt(Instant.now());
        realtimePublisher.broadcastAuctionEvent(p.getRoomId(), "MINIMATCH_PROPOSAL_UPDATED", p);
        return p;
    }

    public boolean isOwnerInActiveMatch(String roomId, String ownerId) {
        if (ownerId == null) return false;
        AuctionRoom room = roomStore.findByCode(roomId).orElse(null);
        if (room == null) return false;
        return matches.values().stream()
                .filter(m -> m.getRoomCode().equalsIgnoreCase(roomId))
                .filter(m -> m.getStatus() != MiniMatch.Status.MATCH_COMPLETE && m.getStatus() != MiniMatch.Status.COMPLETED)
                .anyMatch(m -> {
                    FranchiseAuctionState home = room.getFranchiseAuctionState(m.getHomeFranchise());
                    FranchiseAuctionState away = room.getFranchiseAuctionState(m.getAwayFranchise());
                    return (home != null && ownerId.equals(home.getOwnerMemberId())) ||
                           (away != null && ownerId.equals(away.getOwnerMemberId()));
                });
    }

    public MiniMatch submitXi(String matchId, com.auctionxi.match.dto.XiSelectionDto dto) {
        MiniMatch m = getMatchById(matchId);
        synchronized (m) {
            AuctionRoom room = roomStore.findByCode(m.getRoomCode())
                    .orElseThrow(() -> new AllocationException(AllocationErrorCode.ROOM_NOT_FOUND, "Room not found"));
            FranchiseAuctionState homeState = room.getFranchiseAuctionState(m.getHomeFranchise());
            boolean isHome = homeState != null && (dto.getFranchiseCode().equalsIgnoreCase(m.getHomeFranchise())
                    || java.util.Objects.equals(dto.getOwnerId(), homeState.getOwnerMemberId()));

            List<Player> resolved = resolveXi(room.getFranchiseAuctionState(dto.getFranchiseCode()), dto.getPlayerIds(), dto.getFranchiseCode());
            if (isHome) {
                m.setHomeXi(resolved);
                m.setReadyHome(true);
                m.setHomeXiLocked(true);
            } else {
                m.setAwayXi(resolved);
                m.setReadyAway(true);
                m.setAwayXiLocked(true);
            }

            if (m.isHomeXiLocked() && m.isAwayXiLocked()) {
                m.setStatus(MiniMatch.Status.TOSS_SELECTION);
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "MATCH_STATE_UPDATE", matchSummary(m));
            } else {
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "MATCH_READY_UPDATE", matchSummary(m));
            }
            return m;
        }
    }

    public MiniMatch callToss(String matchId, com.auctionxi.match.dto.TossCallDto dto) {
        MiniMatch m = getMatchById(matchId);
        return submitTossCall(m.getRoomCode(), matchId, dto.getOwnerId(), dto.getCall());
    }

    public MiniMatch chooseToss(String matchId, com.auctionxi.match.dto.TossChoiceDto dto) {
        MiniMatch m = getMatchById(matchId);
        return tossCall(m.getRoomCode(), matchId, dto.getOwnerId(), dto.getChoice());
    }

    public MiniMatch setReady(String matchId, String ownerId) {
        MiniMatch m = getMatchById(matchId);
        return readyMatch(m.getRoomCode(), matchId, ownerId);
    }

    public MiniMatch pauseMatch(String matchId, String ownerId) {
        MiniMatch m = getMatchById(matchId);
        synchronized (m) {
            realtimePublisher.broadcastAuctionEvent(m.getRoomCode(), "MATCH_PAUSED", Map.of(
                    "matchId", matchId,
                    "pausedBy", ownerId
            ));
            return m;
        }
    }

    public MiniMatch resumeMatch(String matchId, String ownerId) {
        MiniMatch m = getMatchById(matchId);
        synchronized (m) {
            realtimePublisher.broadcastAuctionEvent(m.getRoomCode(), "MATCH_RESUMED", Map.of(
                    "matchId", matchId,
                    "resumedBy", ownerId
            ));
            return m;
        }
    }

    public MiniMatch forfeitMatch(String matchId, String ownerId) {
        MiniMatch m = getMatchById(matchId);
        synchronized (m) {
            AuctionRoom room = roomStore.findByCode(m.getRoomCode()).orElseThrow();
            FranchiseAuctionState home = room.getFranchiseAuctionState(m.getHomeFranchise());
            boolean isHomeOwner = home != null && java.util.Objects.equals(ownerId, home.getOwnerMemberId());
            String winner = isHomeOwner ? m.getAwayFranchise() : m.getHomeFranchise();
            completeMatch(m, winner, winner + " WON BY FORFEIT");
            return m;
        }
    }

    public Map<String, Object> getScorecard(String matchId) {
        MiniMatch m = getMatchById(matchId);
        Map<String, Object> scorecard = new LinkedHashMap<>();
        scorecard.put("matchId", m.getMatchId());
        scorecard.put("roomCode", m.getRoomCode());
        scorecard.put("homeFranchise", m.getHomeFranchise());
        scorecard.put("awayFranchise", m.getAwayFranchise());
        scorecard.put("homeRuns", m.getHomeRuns());
        scorecard.put("homeWickets", m.getHomeWickets());
        scorecard.put("homeBalls", m.getHomeBalls());
        scorecard.put("awayRuns", m.getAwayRuns());
        scorecard.put("awayWickets", m.getAwayWickets());
        scorecard.put("awayBalls", m.getAwayBalls());
        scorecard.put("winnerFranchise", m.getWinnerFranchise());
        scorecard.put("resultText", m.getResultText());
        scorecard.put("ballLog", m.getBallLog());
        scorecard.put("runsByPlayer", m.getRunsByPlayer());
        scorecard.put("wicketsByPlayer", m.getWicketsByPlayer());
        scorecard.put("ballsFacedByPlayer", m.getBallsFacedByPlayer());
        scorecard.put("foursByPlayer", m.getFoursByPlayer());
        scorecard.put("sixesByPlayer", m.getSixesByPlayer());
        scorecard.put("runsConcededByBowler", m.getRunsConcededByBowler());
        scorecard.put("ballsBowledByBowler", m.getBallsBowledByBowler());
        return scorecard;
    }


    // =========================================================================
    // AUTHORITATIVE STATE MACHINE & OWNER CONTROLS
    // =========================================================================

    /** Owner readies up & locks Playing XI */
    public MiniMatch readyMatch(String roomCode, String matchId, String memberId) {
        MiniMatch match = getMatch(roomCode, matchId);
        synchronized (match) {
            AuctionRoom room = roomStore.findByCode(roomCode)
                    .orElseThrow(() -> new AllocationException(AllocationErrorCode.ROOM_NOT_FOUND, "Room not found: " + roomCode));
            FranchiseAuctionState home = room.getFranchiseAuctionState(match.getHomeFranchise());
            FranchiseAuctionState away = room.getFranchiseAuctionState(match.getAwayFranchise());
            boolean ownsHome = home != null && java.util.Objects.equals(memberId, home.getOwnerMemberId());
            boolean ownsAway = away != null && java.util.Objects.equals(memberId, away.getOwnerMemberId());

            boolean lockedSomething = false;
            if (ownsHome) {
                match.setReadyHome(true);
                match.setHomeXiLocked(true);
                match.addAuditEvent("OWNER_A (" + match.getHomeFranchise() + ")", "LOCKED_XI", Map.of("franchise", match.getHomeFranchise()));
                lockedSomething = true;
            }
            if (ownsAway) {
                match.setReadyAway(true);
                match.setAwayXiLocked(true);
                match.addAuditEvent("OWNER_B (" + match.getAwayFranchise() + ")", "LOCKED_XI", Map.of("franchise", match.getAwayFranchise()));
                lockedSomething = true;
            }

            if (!lockedSomething) {
                throw new AllocationException(AllocationErrorCode.NOT_FRANCHISE_OWNER,
                        "Only franchise owners can lock their Playing XI. You do not own " + match.getHomeFranchise() + " or " + match.getAwayFranchise() + ".");
            }

            // Both XIs locked -> 10s XI Preview, then Toss Selection
            if (match.isHomeXiLocked() && match.isAwayXiLocked()) {
                match.setStatus(MiniMatch.Status.XI_PREVIEW);
                match.setPreviewDeadlineEpochMillis(System.currentTimeMillis() + 10_000L);
                match.addAuditEvent("SERVER", "BOTH_XIS_CONFIRMED_PROCEEDING_TO_PREVIEW", Map.of());
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "MATCH_STATE_UPDATE", matchSummary(match));

                // Schedule 10s transition to TOSS_SELECTION
                scheduler.schedule(() -> {
                    synchronized (match) {
                        if (match.getStatus() == MiniMatch.Status.XI_PREVIEW) {
                            match.setStatus(MiniMatch.Status.TOSS_SELECTION);
                            match.addAuditEvent("SERVER", "XI_PREVIEW_COMPLETE_AWAITING_TOSS_CALLS", Map.of());
                            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "MATCH_STATE_UPDATE", matchSummary(match));
                        }
                    }
                }, 10_000L, TimeUnit.MILLISECONDS);
            } else {
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "MATCH_READY_UPDATE", matchSummary(match));
            }
            return match;
        }
    }

    /** Both owners independently submit & lock toss call (HEADS / TAILS) */
    public MiniMatch submitTossCall(String roomCode, String matchId, String memberId, String call) {
        MiniMatch match = getMatch(roomCode, matchId);
        synchronized (match) {
            if (match.getStatus() != MiniMatch.Status.TOSS_SELECTION && match.getStatus() != MiniMatch.Status.TOSS) {
                return match;
            }
            if (!"HEADS".equalsIgnoreCase(call) && !"TAILS".equalsIgnoreCase(call)) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Toss call must be HEADS or TAILS");
            }
            AuctionRoom room = roomStore.findByCode(roomCode).orElseThrow();
            FranchiseAuctionState home = room.getFranchiseAuctionState(match.getHomeFranchise());
            FranchiseAuctionState away = room.getFranchiseAuctionState(match.getAwayFranchise());
            boolean ownsHome = home != null && java.util.Objects.equals(memberId, home.getOwnerMemberId());
            boolean ownsAway = away != null && java.util.Objects.equals(memberId, away.getOwnerMemberId());

            if (!ownsHome && !ownsAway) {
                throw new AllocationException(AllocationErrorCode.NOT_FRANCHISE_OWNER, "Only franchise owners can make a toss call.");
            }

            if (ownsHome) {
                match.setHomeTossCall(call.toUpperCase());
                match.setHomeTossLocked(true);
                match.addAuditEvent("OWNER_A (" + match.getHomeFranchise() + ")", "TOSS_CALL=" + call.toUpperCase(), Map.of("call", call.toUpperCase()));
            }
            if (ownsAway) {
                match.setAwayTossCall(call.toUpperCase());
                match.setAwayTossLocked(true);
                match.addAuditEvent("OWNER_B (" + match.getAwayFranchise() + ")", "TOSS_CALL=" + call.toUpperCase(), Map.of("call", call.toUpperCase()));
            }

            // Perform authoritative coin flip ONLY when BOTH toss calls are locked!
            if (match.isHomeTossLocked() && match.isAwayTossLocked()) {
                // Cryptographically secure genuine 50/50 flip without bias
                java.security.SecureRandom secureRandom = new java.security.SecureRandom();
                String coinFlipResult = secureRandom.nextBoolean() ? "HEADS" : "TAILS";
                String winner = coinFlipResult.equalsIgnoreCase(match.getHomeTossCall()) ? match.getHomeFranchise() : match.getAwayFranchise();
                match.setTossWinnerFranchise(winner);
                match.setStatus(MiniMatch.Status.BAT_OR_BOWL_SELECTION);
                match.addAuditEvent("SERVER", "TOSS_RESULT=" + coinFlipResult + " (WINNER=" + winner + ")",
                        Map.of("coinFlip", coinFlipResult, "winner", winner));
                room.addActivity(String.format("TOSS RESULT: Coin showed %s. %s won the toss!", coinFlipResult, winner));
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "MATCH_TOSS_RESULT", matchSummary(match));
            } else {
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "MATCH_STATE_UPDATE", matchSummary(match));
            }
            return match;
        }
    }

    /** Toss winner alone selects BAT or BOWL */
    public MiniMatch tossCall(String roomCode, String matchId, String memberId, String decision) {
        MiniMatch match = getMatch(roomCode, matchId);
        synchronized (match) {
            if (match.getStatus() != MiniMatch.Status.BAT_OR_BOWL_SELECTION && match.getStatus() != MiniMatch.Status.TOSS) {
                return match;
            }
            AuctionRoom room = roomStore.findByCode(roomCode).orElseThrow();
            FranchiseAuctionState winnerState = room.getFranchiseAuctionState(match.getTossWinnerFranchise());
            boolean isWinnerOwner = winnerState != null && java.util.Objects.equals(memberId, winnerState.getOwnerMemberId());

            if (!isWinnerOwner) {
                throw new AllocationException(AllocationErrorCode.NOT_FRANCHISE_OWNER,
                        "Only the toss winner (" + match.getTossWinnerFranchise() + ") can choose Bat or Bowl.");
            }
            if (!"BAT".equalsIgnoreCase(decision) && !"BOWL".equalsIgnoreCase(decision)) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Decision must be BAT or BOWL");
            }

            match.setTossDecision(decision.toUpperCase());
            match.setTossDecisionLocked(true);

            String winnerActor = match.getTossWinnerFranchise().equalsIgnoreCase(match.getHomeFranchise()) ?
                    "OWNER_A (" + match.getHomeFranchise() + ")" : "OWNER_B (" + match.getAwayFranchise() + ")";
            match.addAuditEvent(winnerActor, "TOSS_DECISION=" + decision.toUpperCase(), Map.of("decision", decision.toUpperCase()));

            boolean tossWinnerIsHome = match.getTossWinnerFranchise().equalsIgnoreCase(match.getHomeFranchise());
            boolean winnerBats = "BAT".equalsIgnoreCase(decision);
            if ((tossWinnerIsHome && !winnerBats) || (!tossWinnerIsHome && winnerBats)) {
                swapSides(match);
            }

            // Require owners to explicitly select openers & bowler
            match.setCurrentStrikerId(null);
            match.setCurrentNonStrikerId(null);
            match.setCurrentBowlerId(null);
            match.setBattersLocked(false);
            match.setBowlerLocked(false);
            match.setStatus(MiniMatch.Status.INITIAL_BATTER_SELECTION);

            match.addAuditEvent("SERVER", "INNINGS_ASSIGNMENT (BAT=" + match.battingFranchise() + ", BOWL=" + match.bowlingFranchise() + ")",
                    Map.of("batting", match.battingFranchise(), "bowling", match.bowlingFranchise()));
            room.addActivity(String.format("Toss Decision: %s chose to %s first.", match.getTossWinnerFranchise(), decision));
            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "MATCH_STATE_UPDATE", matchSummary(match));
            return match;
        }
    }

    /** Batting owner selects & locks Striker & Non-Striker openers */
    public MiniMatch selectOpeners(String roomCode, String matchId, String memberId, String strikerId, String nonStrikerId) {
        MiniMatch match = getMatch(roomCode, matchId);
        synchronized (match) {
            validateSideOwner(roomCode, match, match.battingFranchise(), memberId);
            if (match.getStatus() != MiniMatch.Status.INITIAL_BATTER_SELECTION || match.isBattersLocked()) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Openers cannot be selected in state " + match.getStatus());
            }
            if (strikerId == null || nonStrikerId == null || strikerId.equalsIgnoreCase(nonStrikerId)) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Striker and Non-Striker must be two different players.");
            }
            List<Player> battingXi = match.getInnings() == 1 ? match.getHomeXi() : match.getAwayXi();
            Set<String> valid = battingXi.stream().map(Player::getId).collect(Collectors.toSet());
            if (!valid.contains(strikerId) || !valid.contains(nonStrikerId)) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Both openers must belong to the batting Playing XI.");
            }
            if (match.getDismissedBatterIds().contains(strikerId) || match.getDismissedBatterIds().contains(nonStrikerId)) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Cannot select a dismissed player.");
            }

            match.setCurrentStrikerId(strikerId);
            match.setCurrentNonStrikerId(nonStrikerId);
            match.setBattersLocked(true);

            String openerActor = match.battingFranchise().equalsIgnoreCase(match.getHomeFranchise()) ?
                    "OWNER_A (" + match.getHomeFranchise() + ")" : "OWNER_B (" + match.getAwayFranchise() + ")";
            match.addAuditEvent(openerActor, "SELECTED_OPENERS Striker: " + strikerId + ", NonStriker: " + nonStrikerId,
                    Map.of("striker", strikerId, "nonStriker", nonStrikerId));

            // Ball ready ONLY when BOTH batters & bowler are locked!
            if (match.isBowlerLocked()) {
                match.setStatus(MiniMatch.Status.BALL_READY);
                match.addAuditEvent("SERVER", "PLAYERS_LOCKED_BALL_READY", Map.of());
                prepareNextBallInput(match);
            } else {
                match.setStatus(MiniMatch.Status.BOWLER_SELECTION);
            }

            realtimePublisher.broadcastAuctionEvent(roomCode, "MATCH_STATE_UPDATE", matchSummary(match));
            return match;
        }
    }

    /** Bowling owner selects & locks Bowler */
    public MiniMatch selectBowler(String roomCode, String matchId, String memberId, String bowlerId) {
        MiniMatch match = getMatch(roomCode, matchId);
        synchronized (match) {
            validateSideOwner(roomCode, match, match.bowlingFranchise(), memberId);
            if (match.getStatus() != MiniMatch.Status.BOWLER_SELECTION
                    && match.getStatus() != MiniMatch.Status.NEXT_BOWLER_SELECTION) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Bowler cannot be selected in state " + match.getStatus());
            }
            if (bowlerId == null) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Pick a valid bowler.");
            }
            if (match.getStatus() == MiniMatch.Status.NEXT_BOWLER_SELECTION
                    && bowlerId.equalsIgnoreCase(match.getCurrentBowlerId())) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "The same bowler cannot bowl consecutive overs.");
            }
            List<Player> bowlingXi = match.getInnings() == 1 ? match.getAwayXi() : match.getHomeXi();
            Set<String> valid = bowlingXi.stream().map(Player::getId).collect(Collectors.toSet());
            if (!valid.contains(bowlerId)) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Bowler must belong to the bowling Playing XI.");
            }
            int bowlerLegalBalls = match.getBallsBowledByBowler().getOrDefault(bowlerId, 0);
            if (bowlerLegalBalls >= maxOversPerBowler(match.getOvers()) * 6) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "That bowler has reached the maximum over limit.");
            }

            match.setCurrentBowlerId(bowlerId);
            match.setBowlerLocked(true);

            String bowlerActor = match.bowlingFranchise().equalsIgnoreCase(match.getHomeFranchise()) ?
                    "OWNER_A (" + match.getHomeFranchise() + ")" : "OWNER_B (" + match.getAwayFranchise() + ")";
            match.addAuditEvent(bowlerActor, "SELECTED_BOWLER: " + bowlerId, Map.of("bowler", bowlerId));
            match.addAuditEvent("SERVER", "BOWLER_LOCKED: " + bowlerId, Map.of("bowler", bowlerId));

            // Ball ready ONLY when BOTH batters & bowler are locked!
            if (match.isBattersLocked()) {
                match.setStatus(MiniMatch.Status.BALL_READY);
                match.addAuditEvent("SERVER", "PLAYERS_LOCKED_BALL_READY", Map.of());
                prepareNextBallInput(match);
            } else {
                match.setStatus(MiniMatch.Status.INITIAL_BATTER_SELECTION);
            }

            realtimePublisher.broadcastAuctionEvent(roomCode, "MATCH_STATE_UPDATE", matchSummary(match));
            return match;
        }
    }

    private int maxOversPerBowler(int inningsOvers) {
        if (inningsOvers <= 2) return 1;
        if (inningsOvers <= 10) return 2;
        return 4;
    }

    /** Batting owner locks replacement batter after WICKET */
    public MiniMatch selectWicketReplacement(String roomCode, String matchId, String memberId, String nextBatterId) {
        MiniMatch match = getMatch(roomCode, matchId);
        synchronized (match) {
            validateSideOwner(roomCode, match, match.battingFranchise(), memberId);
            if (match.getStatus() != MiniMatch.Status.WICKET_PAUSE) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "No wicket replacement is currently required.");
            }
            if (nextBatterId == null || match.getDismissedBatterIds().contains(nextBatterId)
                    || nextBatterId.equalsIgnoreCase(match.getCurrentNonStrikerId())) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Pick an eligible not-out batsman.");
            }
            List<Player> battingXi = match.getInnings() == 1 ? match.getHomeXi() : match.getAwayXi();
            if (battingXi.stream().noneMatch(p -> p.getId().equals(nextBatterId))) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Replacement must belong to the batting Playing XI.");
            }

            match.setCurrentStrikerId(nextBatterId);
            match.setBattersLocked(true);
            match.setStatus(MiniMatch.Status.BALL_READY);

            String batterActor = match.battingFranchise().equalsIgnoreCase(match.getHomeFranchise()) ?
                    "OWNER_A (" + match.getHomeFranchise() + ")" : "OWNER_B (" + match.getAwayFranchise() + ")";
            match.addAuditEvent(batterActor, "SELECTED_NEW_BATTER: " + nextBatterId, Map.of("newBatter", nextBatterId));
            match.addAuditEvent("SERVER", "NEW_BATTER_LOCKED: " + nextBatterId + " -> NEXT_BALL_READY", Map.of());
            prepareNextBallInput(match);

            realtimePublisher.broadcastAuctionEvent(roomCode, "MATCH_STATE_UPDATE", matchSummary(match));
            return match;
        }
    }

    // =========================================================================
    // TIMING METERS & BALL EXECUTION
    // =========================================================================

    /**
     * Authoritative semantic batting input with intent & timing quality.
     */
    public MiniMatch submitBatAction(String roomCode, String matchId, String memberId, String action, String actionId) {
        return submitBatAction(roomCode, matchId, memberId, action, actionId, null, null);
    }

    public MiniMatch submitBatAction(String roomCode, String matchId, String memberId, String action, String actionId,
                                    String intent, String timingQuality) {
        MiniMatch match = getMatch(roomCode, matchId);
        synchronized (match) {
            validateSideOwner(roomCode, match, match.battingFranchise(), memberId);
            if (actionId != null && !registerAction(matchId, actionId)) return match;
            if (!match.isAwaitingInput() || match.isIntentSubmitted()) return match;

            String resolvedIntent = intent != null ? intent.trim().toUpperCase() : "NORMAL";
            match.setBatIntent(resolvedIntent);
            match.setBatTimingQuality(timingQuality != null ? timingQuality.trim().toUpperCase() : "GOOD");

            String normalized;
            if (action != null && !action.isBlank()) {
                normalized = normalizeShotAction(action);
            } else {
                normalized = switch (resolvedIntent) {
                    case "DEFEND", "DEFENSIVE" -> "DEFENCE";
                    case "LOFT" -> "LOFT";
                    case "LEAVE" -> "DEFENCE";
                    default -> "DRIVE";
                };
            }
            match.setShotAction(normalized);
            match.setBattingIntent(timingQuality != null ? timingQuality.trim().toUpperCase() : legacyIntentForShot(normalized));
            match.setIntentSubmitted(true);

            String actor = match.battingFranchise().equalsIgnoreCase(match.getHomeFranchise()) ?
                    "OWNER_A (" + match.getHomeFranchise() + ")" : "OWNER_B (" + match.getAwayFranchise() + ")";
            match.addAuditEvent(actor, "BATTING_INTENT=" + normalized + (intent != null ? " (" + resolvedIntent + "/" + timingQuality + ")" : ""),
                    Map.of("intent", normalized, "rawIntent", resolvedIntent));

            realtimePublisher.broadcastAuctionEvent(roomCode, "MATCH_ACTION_LOCKED", Map.of(
                    "matchId", match.getMatchId(),
                    "side", "BAT",
                    "intentSubmitted", true,
                    "planSubmitted", match.isPlanSubmitted()
            ));

            maybeResolveBall(match);
            return match;
        }
    }

    /**
     * Authoritative semantic bowling input with physical aim, speed, and release timing.
     */
    public MiniMatch submitBowlAction(String roomCode, String matchId, String memberId, String action, String actionId) {
        return submitBowlAction(roomCode, matchId, memberId, action, actionId, null, null, null, null);
    }

    public MiniMatch submitBowlAction(String roomCode, String matchId, String memberId, String action, String actionId,
                                     Double aimX, Double aimZ, String speed, String releaseQuality) {
        MiniMatch match = getMatch(roomCode, matchId);
        synchronized (match) {
            validateSideOwner(roomCode, match, match.bowlingFranchise(), memberId);
            if (actionId != null && !registerAction(matchId, actionId)) return match;
            if (!match.isAwaitingInput() || match.isPlanSubmitted()) return match;

            if (aimX != null) match.setAimX(aimX);
            if (aimZ != null) match.setAimZ(aimZ);
            if (speed != null) match.setBowlingSpeed(speed);
            if (releaseQuality != null) match.setReleaseQuality(releaseQuality);

            String normalized;
            if (action != null && !action.isBlank()) {
                normalized = normalizeDeliveryAction(action);
            } else if (aimZ != null) {
                // Classify delivery directly from physical aim coordinates
                if (aimZ >= 8.0) {
                    normalized = "YORKER";
                } else if (aimZ <= 3.5) {
                    normalized = "BOUNCER";
                } else if ("SLOW".equalsIgnoreCase(speed)) {
                    normalized = "CUTTER";
                } else if (aimX != null && Math.abs(aimX) > 0.4) {
                    normalized = "SWING";
                } else {
                    normalized = "PACE";
                }
            } else {
                normalized = "PACE";
            }

            match.setDeliveryAction(normalized);
            match.setBowlingPlan(legacyPlanForDelivery(normalized));
            match.setPlanSubmitted(true);

            String actor = match.bowlingFranchise().equalsIgnoreCase(match.getHomeFranchise()) ?
                    "OWNER_A (" + match.getHomeFranchise() + ")" : "OWNER_B (" + match.getAwayFranchise() + ")";
            match.addAuditEvent(actor, "DELIVERY_SELECTED=" + normalized + (aimZ != null ? " [AIM=(" + aimX + "," + aimZ + "), SPD=" + speed + ", REL=" + releaseQuality + "]" : ""),
                    Map.of("delivery", normalized));
            match.addAuditEvent("SERVER", "DELIVERY_COMMITTED", Map.of("delivery", normalized));

            realtimePublisher.broadcastAuctionEvent(roomCode, "MATCH_ACTION_LOCKED", Map.of(
                    "matchId", match.getMatchId(),
                    "side", "BOWL",
                    "intentSubmitted", match.isIntentSubmitted(),
                    "planSubmitted", true
            ));

            maybeResolveBall(match);
            return match;
        }
    }

    // Legacy timing endpoints remain available for older clients, but the new 3D UI does not use them.
    public MiniMatch submitBatTiming(String roomCode, String matchId, String memberId, int position) {
        return submitBatTiming(roomCode, matchId, memberId, position, null);
    }

    public MiniMatch submitBatTiming(String roomCode, String matchId, String memberId, int position, String actionId) {
        MiniMatch match = getMatch(roomCode, matchId);
        validateSideOwner(roomCode, match, match.battingFranchise(), memberId);
        if (actionId != null && !registerAction(matchId, actionId)) return match;
        match.setBattingIntent(zoneFor(match, position, true));
        match.setShotAction(legacyShotForIntent(match.getBattingIntent()));
        match.setIntentSubmitted(true);

        String actor = match.battingFranchise().equalsIgnoreCase(match.getHomeFranchise()) ?
                "OWNER_A (" + match.getHomeFranchise() + ")" : "OWNER_B (" + match.getAwayFranchise() + ")";
        match.addAuditEvent(actor, "TIMING_REGISTERED=" + position + " (" + match.getBattingIntent() + ")",
                Map.of("position", position, "intent", match.getBattingIntent()));

        maybeResolveBall(match);
        return match;
    }

    public MiniMatch submitBowlTiming(String roomCode, String matchId, String memberId, int position) {
        return submitBowlTiming(roomCode, matchId, memberId, position, null);
    }

    public MiniMatch submitBowlTiming(String roomCode, String matchId, String memberId, int position, String actionId) {
        MiniMatch match = getMatch(roomCode, matchId);
        validateSideOwner(roomCode, match, match.bowlingFranchise(), memberId);
        if (actionId != null && !registerAction(matchId, actionId)) return match;
        match.setBowlingPlan(zoneFor(match, position, false));
        match.setDeliveryAction(legacyDeliveryForPlan(match.getBowlingPlan()));
        match.setPlanSubmitted(true);

        String actor = match.bowlingFranchise().equalsIgnoreCase(match.getHomeFranchise()) ?
                "OWNER_A (" + match.getHomeFranchise() + ")" : "OWNER_B (" + match.getAwayFranchise() + ")";
        match.addAuditEvent(actor, "BOWLING_EXECUTION=" + position + " (" + match.getBowlingPlan() + ")",
                Map.of("position", position, "plan", match.getBowlingPlan()));
        match.addAuditEvent("SERVER", "DELIVERY_COMMITTED", Map.of());

        maybeResolveBall(match);
        return match;
    }

    private boolean registerAction(String matchId, String actionId) {
        if (actionId == null || actionId.isBlank()) return true;
        Set<String> ids = processedActionIds.computeIfAbsent(matchId, k -> ConcurrentHashMap.newKeySet());
        return ids.add(actionId);
    }

    private static String normalizeShotAction(String action) {
        String a = action == null ? "" : action.trim().toUpperCase();
        return switch (a) {
            case "DEFENCE", "DRIVE", "CUT", "PULL", "LOFT", "STRAIGHT" -> a;
            default -> throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Unknown batting action: " + action);
        };
    }

    private static String normalizeDeliveryAction(String action) {
        String a = action == null ? "" : action.trim().toUpperCase();
        return switch (a) {
            case "PACE", "SWING", "SEAM", "CUTTER", "BOUNCER", "YORKER" -> a;
            default -> throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Unknown bowling action: " + action);
        };
    }

    private static String legacyIntentForShot(String shot) {
        return switch (shot) {
            case "LOFT" -> "PERFECT";
            case "DRIVE", "CUT", "PULL", "STRAIGHT" -> "GOOD";
            default -> "OKAY";
        };
    }

    private static String legacyPlanForDelivery(String delivery) {
        return switch (delivery) {
            case "YORKER", "SWING", "SEAM" -> "PERFECT";
            case "PACE", "CUTTER", "BOUNCER" -> "GOOD";
            default -> "OKAY";
        };
    }

    private static String legacyShotForIntent(String intent) {
        return switch (intent) {
            case "PERFECT" -> "LOFT";
            case "GOOD" -> "DRIVE";
            default -> "DEFENCE";
        };
    }

    private static String legacyDeliveryForPlan(String plan) {
        return switch (plan) {
            case "PERFECT" -> "YORKER";
            case "GOOD" -> "PACE";
            default -> "SEAM";
        };
    }

    private void maybeResolveBall(MiniMatch match) {
        synchronized (match) {
            if (match.isAwaitingInput() && match.isIntentSubmitted() && match.isPlanSubmitted()) {
                resolveBallNow(match);
            }
        }
    }

    private void prepareNextBallInput(MiniMatch match) {
        synchronized (match) {
            if (match.getStatus() != MiniMatch.Status.BALL_READY && match.getStatus() != MiniMatch.Status.IN_PROGRESS) {
                match.setStatus(MiniMatch.Status.BALL_READY);
            }

            Player batter = match.findPlayer(match.getCurrentStrikerId());
            Player bowler = match.findPlayer(match.getCurrentBowlerId());
            if (batter == null || bowler == null) return;

            match.setAwaitingInput(true);
            match.setIntentSubmitted(false);
            match.setPlanSubmitted(false);
            match.setDecisionDeadlineEpochMillis(System.currentTimeMillis() + DECISION_MS);

            int overNumber = match.battingBalls() / 6;
            int ballInOver = (match.battingBalls() % 6) + 1;

            Map<String, Object> awaitPayload = new LinkedHashMap<>();
            awaitPayload.put("matchId", match.getMatchId());
            awaitPayload.put("deadlineEpochMillis", match.getDecisionDeadlineEpochMillis());
            awaitPayload.put("battingFranchise", match.battingFranchise());
            awaitPayload.put("bowlingFranchise", match.bowlingFranchise());
            awaitPayload.put("batterId", batter.getId());
            awaitPayload.put("batterName", batter.getFullName());
            awaitPayload.put("bowlerId", bowler.getId());
            awaitPayload.put("bowlerName", bowler.getFullName());
            awaitPayload.put("shotActions", List.of("DEFENCE", "DRIVE", "CUT", "PULL", "LOFT", "STRAIGHT"));
            awaitPayload.put("deliveryActions", List.of("PACE", "SWING", "SEAM", "CUTTER", "BOUNCER", "YORKER"));
            awaitPayload.put("overNumber", overNumber);
            awaitPayload.put("ballInOver", ballInOver);
            awaitPayload.put("innings", match.getInnings());

            int[] batT = timingThresholds(PlayerRatings.battingRating(batter));
            int[] bowlT = timingThresholds(PlayerRatings.bowlingRating(bowler));
            awaitPayload.put("batPerfect", batT[0]);
            awaitPayload.put("batGood", batT[1]);
            awaitPayload.put("batOkay", batT[2]);
            awaitPayload.put("bowlPerfect", bowlT[0]);
            awaitPayload.put("bowlGood", bowlT[1]);
            awaitPayload.put("bowlOkay", bowlT[2]);

            realtimePublisher.broadcastAuctionEvent(match.getRoomCode(), "MATCH_AWAIT_INPUT", awaitPayload);
            // Strictly human owner-controlled ball progression. No auto-fallback timer auto-delivering balls.
        }
    }

    private void resolveBallNow(MiniMatch match) {
        synchronized (match) {
            if (!match.isAwaitingInput()) return;
            match.setAwaitingInput(false);
            match.setStatus(MiniMatch.Status.BALL_EXECUTION);

            Random rng = new Random(match.getSeed() + match.getBallLog().size() * 31L + match.getInnings() * 101L);
            String battingCode = match.battingFranchise();
            String bowlingCode = match.bowlingFranchise();

            Player batter = match.findPlayer(match.getCurrentStrikerId());
            Player bowler = match.findPlayer(match.getCurrentBowlerId());
            int overNumber = match.battingBalls() / 6;

            BallOutcome ball = resolveBall(match, rng, batter, bowler, battingCode, bowlingCode, overNumber);
            match.getBallLog().add(ball);
            broadcastMilestones(match, ball);

            match.addAuditEvent("SERVER", "RESULT=" + ball.outcome() + " (RUNS=" + ball.runs() + (ball.wicket() ? ", WICKET" : "") + ")",
                    Map.of("outcome", ball.outcome(), "runs", ball.runs(), "wicket", ball.wicket()));
            match.addAuditEvent("SERVER", "SCORE=" + battingCode + " " + match.battingRuns() + "/" + match.battingWickets() +
                    " (" + (match.battingBalls() / 6) + "." + (match.battingBalls() % 6) + " ov)",
                    Map.of("runs", match.battingRuns(), "wickets", match.battingWickets(), "balls", match.battingBalls()));

            realtimePublisher.broadcastAuctionEvent(match.getRoomCode(), "MATCH_BALL_RESOLVED", Map.of(
                    "matchId", match.getMatchId(),
                    "ball", ball
            ));

            // Chase complete check
            if (match.getInnings() == 2 && match.getTarget() != null && match.battingRuns() >= match.getTarget()) {
                match.addAuditEvent("SERVER", "MATCH_WON_BY_" + battingCode, Map.of("winner", battingCode));
                completeMatch(match, battingCode, null);
                return;
            }

            // Wicket flow: pause match for replacement selection
            if (ball.wicket()) {
                match.getDismissedBatterIds().add(batter.getId());
                match.setBattersLocked(false);
                boolean allOut = match.getDismissedBatterIds().size() >= match.maxWickets();
                if (allOut) {
                    match.addAuditEvent("SERVER", "ALL_OUT_INNINGS_END", Map.of("wickets", match.battingWickets()));
                    handleInningsOrMatchEnd(match);
                } else {
                    match.setStatus(MiniMatch.Status.WICKET_PAUSE);
                    match.addAuditEvent("SERVER", "WICKET_PAUSE (AWAITING_NEW_BATTER)", Map.of("dismissed", batter.getFullName()));
                    realtimePublisher.broadcastAuctionEvent(match.getRoomCode(), "MATCH_WICKET", Map.of(
                            "matchId", match.getMatchId(),
                            "dismissedBatter", batter.getFullName()
                    ));
                }
                return;
            }

            // Over Completion check (ball 6)
            boolean overCompleted = ball.ballInOver() == 6 || (match.battingBalls() > 0 && match.battingBalls() % 6 == 0);
            if (overCompleted) {
                // In cricket: odd runs on ball 6 means batsmen crossed (1 swap) + bowling end change (1 swap) = 0 net swaps (striker keeps strike!)
                // Even runs (0, 2, 4, 6) means batsmen did not cross, but end changes = 1 swap.
                if (ball.runs() % 2 == 0) {
                    swapStrikerAndNonStriker(match);
                    match.addAuditEvent("SERVER", "STRIKE_ROTATION (OVER END): End changed, new striker=" + match.getCurrentStrikerId(), Map.of());
                } else {
                    match.addAuditEvent("SERVER", "STRIKE_ROTATION (OVER END): Single on last ball keeps strike=" + match.getCurrentStrikerId(), Map.of());
                }
                match.setBowlerLocked(false);

                boolean inningsOver = match.battingBalls() >= match.ballsPerInnings();
                if (inningsOver) {
                    match.addAuditEvent("SERVER", "INNINGS_OVERS_COMPLETE", Map.of("balls", match.battingBalls()));
                    handleInningsOrMatchEnd(match);
                } else {
                    match.setStatus(MiniMatch.Status.OVER_SUMMARY);
                    match.setOverSummaryDeadlineEpochMillis(System.currentTimeMillis() + 5_000L);
                    match.addAuditEvent("SERVER", "OVER_" + (overNumber + 1) + "_COMPLETE", Map.of("over", overNumber + 1));
                    realtimePublisher.broadcastAuctionEvent(match.getRoomCode(), "MATCH_OVER_COMPLETE", Map.of(
                            "matchId", match.getMatchId(),
                            "overNumber", overNumber + 1
                    ));

                    // After 5s over summary, state transitions to NEXT_BOWLER_SELECTION
                    scheduler.schedule(() -> {
                        synchronized (match) {
                            if (match.getStatus() == MiniMatch.Status.OVER_SUMMARY) {
                                match.setStatus(MiniMatch.Status.NEXT_BOWLER_SELECTION);
                                match.addAuditEvent("SERVER", "AWAITING_NEXT_BOWLER_SELECTION", Map.of());
                                realtimePublisher.broadcastAuctionEvent(match.getRoomCode(), "MATCH_STATE_UPDATE", matchSummary(match));
                            }
                        }
                    }, 5_000L, TimeUnit.MILLISECONDS);
                }
                return;
            }

            // Normal odd run strike rotation mid-over
            if (ball.runs() % 2 != 0) {
                swapStrikerAndNonStriker(match);
                match.addAuditEvent("SERVER", "STRIKE_ROTATION (MID-OVER): Odd runs swapped striker to " + match.getCurrentStrikerId(), Map.of());
            }

            // Prepare next ball in over
            match.setStatus(MiniMatch.Status.BALL_READY);
            match.addAuditEvent("SERVER", "NEXT_BALL_READY", Map.of());
            prepareNextBallInput(match);
        }
    }

    private void swapStrikerAndNonStriker(MiniMatch match) {
        String tmp = match.getCurrentStrikerId();
        match.setCurrentStrikerId(match.getCurrentNonStrikerId());
        match.setCurrentNonStrikerId(tmp);
    }

    private void handleInningsOrMatchEnd(MiniMatch match) {
        if (match.getInnings() == 1) {
            match.setInnings(2);
            match.setTarget(match.getHomeRuns() + 1);
            match.getDismissedBatterIds().clear();
            match.setBattersLocked(false);
            match.setBowlerLocked(false);
            match.setStatus(MiniMatch.Status.INNINGS_BREAK);
            realtimePublisher.broadcastAuctionEvent(match.getRoomCode(), "MATCH_STATE_UPDATE", matchSummary(match));

            // Transition to opener selection for innings 2
            scheduler.schedule(() -> {
                synchronized (match) {
                    if (match.getStatus() == MiniMatch.Status.INNINGS_BREAK) {
                        match.setCurrentStrikerId(null);
                        match.setCurrentNonStrikerId(null);
                        match.setCurrentBowlerId(null);
                        match.setBattersLocked(false);
                        match.setBowlerLocked(false);
                        match.setStatus(MiniMatch.Status.INITIAL_BATTER_SELECTION);
                        realtimePublisher.broadcastAuctionEvent(match.getRoomCode(), "MATCH_STATE_UPDATE", matchSummary(match));
                    }
                }
            }, 3_000L, TimeUnit.MILLISECONDS);
        } else {
            finishByScore(match);
        }
    }

    private BallOutcome resolveBall(MiniMatch match, Random rng, Player batter, Player bowler,
                                    String battingCode, String bowlingCode, int overNumber) {
        int legalBallsBefore = match.battingBalls();
        int ballInOver = (legalBallsBefore % 6) + 1;
        String intent = match.getBattingIntent();
        String plan = match.getBowlingPlan();

        if ("NOBALL".equals(plan)) {
            applyRuns(match, 1, false, null);
            match.getRunsConcededByBowler().merge(bowler.getId(), 1, Integer::sum);
            match.setFreeHitNext(true);
            return new BallOutcome(match.getInnings(), match.getBallLog().size() + 1, overNumber, ballInOver - 1,
                    battingCode, bowlingCode,
                    batter.getId(), batter.getFullName(), bowler.getId(), bowler.getFullName(),
                    "NO_BALL", 1, false, true,
                    match.battingRuns(), match.battingWickets(), match.battingBalls(),
                    match.getTarget(), "NO BALL! " + bowler.getShortName() + " oversteps — FREE HIT next!", intent, plan);
        }

        double wideProb = "PERFECT".equals(plan) ? 0.020 : "POOR".equals(plan) ? 0.080 : WIDE_PROBABILITY;
        if (rng.nextDouble() < wideProb) {
            applyRuns(match, 1, false, null);
            match.getRunsConcededByBowler().merge(bowler.getId(), 1, Integer::sum);
            return new BallOutcome(match.getInnings(), match.getBallLog().size() + 1, overNumber, ballInOver - 1,
                    battingCode, bowlingCode,
                    batter.getId(), batter.getFullName(), bowler.getId(), bowler.getFullName(),
                    "WIDE", 1, false, true,
                    match.battingRuns(), match.battingWickets(), match.battingBalls(),
                    match.getTarget(), "WIDE ball by " + bowler.getShortName() + " — 1 extra run.", intent, plan);
        }

        PlayerRatings.BatterCapabilities batCap = PlayerRatings.deriveBatterCapabilities(batter);
        PlayerRatings.BowlerCapabilities bowlCap = PlayerRatings.deriveBowlerCapabilities(bowler);

        String deliveryType = match.getDeliveryAction() != null ? match.getDeliveryAction() : "PACE";
        String shot = match.getShotAction() != null ? match.getShotAction() : "DRIVE";
        String timing = intent; // PERFECT, GOOD (EARLY), OKAY/POOR (LATE)

        double skillDelta = batCap.exitPower() * batCap.contactConsistency() - (bowlCap.lineControl() * 0.5 + bowlCap.movementIndex() * 0.5);

        boolean freeHit = match.isFreeHitNext();
        double pWicket = freeHit ? 0.0 : 0.08 - skillDelta * 0.04;
        double pDot = 0.32 - skillDelta * 0.05;
        double pBoundary = 0.15 + skillDelta * 0.10;

        // Shot vs Delivery contextual synergy
        if ("YORKER".equalsIgnoreCase(deliveryType)) {
            if ("DEFENCE".equalsIgnoreCase(shot) || "FLICK".equalsIgnoreCase(shot)) {
                pWicket *= 0.4;
                pDot *= 1.4;
            } else if ("LOFT".equalsIgnoreCase(shot)) {
                pWicket *= 2.2; // Yorker + Loft = high bowled risk unless perfect
            }
        } else if ("BOUNCER".equalsIgnoreCase(deliveryType)) {
            if ("PULL".equalsIgnoreCase(shot) || "HOOK".equalsIgnoreCase(shot) || "CUT".equalsIgnoreCase(shot)) {
                pBoundary *= 1.8;
            } else if ("DRIVE".equalsIgnoreCase(shot)) {
                pWicket *= 1.8; // Bouncer + Drive = top edge catch risk
            }
        } else if ("SWING".equalsIgnoreCase(deliveryType) || "CUTTER".equalsIgnoreCase(deliveryType)) {
            if ("DEFENCE".equalsIgnoreCase(shot)) {
                pDot *= 1.3;
                pWicket *= 0.5;
            } else {
                pWicket *= 1.3; // Movement + attacking shot = edge risk
            }
        }

        // Timing influence
        if ("PERFECT".equalsIgnoreCase(timing)) {
            pBoundary *= (1.5 + batCap.boundaryIntent() * 0.5);
            pWicket *= 0.3;
            pDot *= 0.6;
        } else if ("EARLY".equalsIgnoreCase(timing) || "GOOD".equalsIgnoreCase(timing)) {
            pBoundary *= 1.1;
            pWicket *= 1.1;
        } else { // LATE / POOR
            pWicket *= 1.9;
            pBoundary *= 0.4;
            pDot *= 1.3;
        }

        double pRunning = Math.max(0.05, 1.0 - pWicket - pDot - pBoundary);
        double total = pWicket + pDot + pBoundary + pRunning;
        double roll = rng.nextDouble() * total;

        String outcome;
        int runs;
        boolean wicket = false;
        String wicketType = "NONE";
        String commentary;

        if (roll < pWicket) {
            outcome = "WICKET";
            runs = 0;
            wicket = true;

            if ("YORKER".equalsIgnoreCase(deliveryType) || "LATE".equalsIgnoreCase(timing)) {
                wicketType = rng.nextBoolean() ? "BOWLED" : "LBW";
            } else if ("BOUNCER".equalsIgnoreCase(deliveryType) || "LOFT".equalsIgnoreCase(shot)) {
                wicketType = "CAUGHT";
            } else {
                wicketType = rng.nextDouble() < 0.5 ? "BOWLED" : "CAUGHT";
            }

            commentary = switch (wicketType) {
                case "BOWLED" -> "BOWLED HIM! " + bowler.getShortName() + " clean bowls " + batter.getShortName() + "!";
                case "CAUGHT" -> "OUT! " + batter.getShortName() + " mis-times the " + shot + ", caught by fielder off " + bowler.getShortName() + "!";
                case "LBW" -> "APPEAL AND GIVEN! " + bowler.getShortName() + " traps " + batter.getShortName() + " LBW!";
                default -> "WICKET! " + bowler.getShortName() + " gets the breakthrough!";
            };
        } else if (roll < pWicket + pDot) {
            outcome = "DOT";
            runs = 0;
            commentary = pick(rng,
                    "Dot ball. Good " + deliveryType.toLowerCase() + " from " + bowler.getShortName() + " to " + batter.getShortName() + ".",
                    "No run. " + batter.getShortName() + " plays a " + shot.toLowerCase() + " back to " + bowler.getShortName() + ".",
                    "Pitched up by " + bowler.getShortName() + ", dot ball.");
        } else if (roll < pWicket + pDot + pBoundary) {
            if (rng.nextDouble() < (0.30 + batCap.exitPower() * 0.15) && !"DEFENCE".equalsIgnoreCase(shot)) {
                outcome = "SIX";
                runs = 6;
                commentary = pick(rng,
                        "SIX! Massive " + shot.toLowerCase() + " by " + batter.getShortName() + " off " + bowler.getShortName() + "!",
                        "BANG! " + batter.getShortName() + " launches " + bowler.getShortName() + " into the stands for SIX!");
            } else {
                outcome = "FOUR";
                runs = 4;
                commentary = pick(rng,
                        "FOUR! Glorious " + shot.toLowerCase() + " by " + batter.getShortName() + " off " + bowler.getShortName() + "!",
                        "FOUR! " + batter.getShortName() + " finds the gap off " + bowler.getShortName() + "!");
            }
        } else {
            outcome = "RUNS";
            runs = rng.nextDouble() < 0.80 ? 1 : 2;
            commentary = runs == 1
                    ? "Single taken by " + batter.getShortName() + " off " + bowler.getShortName() + "."
                    : "Good running! " + batter.getShortName() + " picks up 2 off " + bowler.getShortName() + ".";
        }

        match.setFreeHitNext(false);
        applyRuns(match, runs, wicket, batter.getId());
        if (match.getInnings() == 1) match.setHomeBalls(match.getHomeBalls() + 1);
        else match.setAwayBalls(match.getAwayBalls() + 1);
        recordLegalDeliveryStats(match, batter, bowler, runs, runs);
        if (wicket) {
            match.getWicketsByPlayer().merge(bowler.getId(), 1, Integer::sum);
        }

        return new BallOutcome(match.getInnings(), match.getBallLog().size() + 1, overNumber, ballInOver,
                battingCode, bowlingCode,
                batter.getId(), batter.getFullName(), bowler.getId(), bowler.getFullName(),
                outcome, runs, wicket, false,
                match.battingRuns(), match.battingWickets(), match.battingBalls(),
                match.getTarget(), commentary, intent, plan,
                deliveryType, "MIDDLE", "GOOD", shot, timing, wicketType);
    }

    private void applyRuns(MiniMatch match, int runs, boolean wicket, String batterId) {
        if (match.getInnings() == 1) {
            match.setHomeRuns(match.getHomeRuns() + runs);
            if (wicket) match.setHomeWickets(match.getHomeWickets() + 1);
        } else {
            match.setAwayRuns(match.getAwayRuns() + runs);
            if (wicket) match.setAwayWickets(match.getAwayWickets() + 1);
        }
        if (batterId != null && runs > 0) {
            match.getRunsByPlayer().merge(batterId, runs, Integer::sum);
        }
    }

    private void recordLegalDeliveryStats(MiniMatch match, Player batter, Player bowler, int batterRuns, int totalRunsConceded) {
        if (batter != null) {
            match.getBallsFacedByPlayer().merge(batter.getId(), 1, Integer::sum);
            if (batterRuns == 4) match.getFoursByPlayer().merge(batter.getId(), 1, Integer::sum);
            else if (batterRuns == 6) match.getSixesByPlayer().merge(batter.getId(), 1, Integer::sum);
        }
        if (bowler != null) {
            match.getBallsBowledByBowler().merge(bowler.getId(), 1, Integer::sum);
            match.getRunsConcededByBowler().merge(bowler.getId(), totalRunsConceded, Integer::sum);
        }
    }

    private String zoneFor(MiniMatch match, int position, boolean batting) {
        Player batter = match.findPlayer(match.getCurrentStrikerId());
        Player bowler = match.findPlayer(match.getCurrentBowlerId());
        if (batter == null || bowler == null) return "OKAY";

        int[] t = timingThresholds(batting ? PlayerRatings.battingRating(batter) : PlayerRatings.bowlingRating(bowler));
        int dist = Math.abs(position - 500);
        if (dist <= t[0]) return "PERFECT";
        if (dist <= t[1]) return "GOOD";
        if (dist <= t[2]) return "OKAY";
        if (!batting && dist > 480) return "NOBALL";
        return "POOR";
    }

    private static int[] timingThresholds(double rating) {
        int perfect = (int) Math.round(35 + rating * 0.5);
        int good = perfect + (int) Math.round(60 + rating * 0.3);
        int okay = good + 90;
        return new int[]{perfect, good, okay};
    }

    private void validateSideOwner(String roomCode, MiniMatch match, String franchiseCode, String memberId) {
        AuctionRoom room = roomStore.findByCode(roomCode)
                .orElseThrow(() -> new AllocationException(AllocationErrorCode.ROOM_NOT_FOUND, "Room not found: " + roomCode));
        FranchiseAuctionState fState = room.getFranchiseAuctionState(franchiseCode);
        if (fState == null) {
            throw new AllocationException(AllocationErrorCode.NOT_FRANCHISE_OWNER, "Franchise not found: " + franchiseCode);
        }
        String owner = fState.getOwnerMemberId();
        if (owner != null) {
            if (!java.util.Objects.equals(memberId, owner)) {
                throw new AllocationException(AllocationErrorCode.NOT_FRANCHISE_OWNER,
                        "Only the " + franchiseCode + " owner can make that call.");
            }
        } else {
            boolean isHost = memberId != null && memberId.equals(room.getHostMemberId());
            if (!isHost) {
                throw new AllocationException(AllocationErrorCode.NOT_FRANCHISE_OWNER,
                        "Only the " + franchiseCode + " owner can make that call.");
            }
        }
    }

    private void finishByScore(MiniMatch match) {
        if (match.getHomeRuns() > match.getAwayRuns()) {
            completeMatch(match, match.getHomeFranchise(), String.format("%s won by %d runs", match.getHomeFranchise(), match.getHomeRuns() - match.getAwayRuns()));
        } else if (match.getAwayRuns() > match.getHomeRuns()) {
            int wktsLeft = match.maxWickets() - match.getAwayWickets();
            completeMatch(match, match.getAwayFranchise(), String.format("%s won by %d wickets", match.getAwayFranchise(), wktsLeft));
        } else {
            completeMatch(match, match.getHomeFranchise(), "MATCH TIED!");
        }
    }

    private void completeMatch(MiniMatch match, String winner, String customResultText) {
        synchronized (match) {
            match.setStatus(MiniMatch.Status.MATCH_COMPLETE);
            match.setCompletedAt(Instant.now());
            match.setWinnerFranchise(winner);
            match.setResultText(customResultText != null ? customResultText : winner + " WON");

            if (resultStore != null) {
                resultStore.recordMatchResult(match.getRoomCode(), match);
            }
            if (matchPersistenceService != null) {
                matchPersistenceService.saveCompleteMatch(match);
            }

            roomStore.findByCode(match.getRoomCode()).ifPresent(r ->
                    r.addActivity(String.format("MATCH FINISHED: %s vs %s — %s",
                            match.getHomeFranchise(), match.getAwayFranchise(), match.getResultText())));

            realtimePublisher.broadcastAuctionEvent(match.getRoomCode(), "MATCH_COMPLETE", matchSummary(match));
        }
    }

    public MiniMatch cancelMatch(String roomCode, String matchId, String memberId) {
        MiniMatch match = getMatch(roomCode, matchId);
        synchronized (match) {
            AuctionRoom room = roomStore.findByCode(roomCode)
                    .orElseThrow(() -> new AllocationException(AllocationErrorCode.ROOM_NOT_FOUND, "Room not found: " + roomCode));

            FranchiseAuctionState homeState = room.getFranchiseAuctionState(match.getHomeFranchise());
            FranchiseAuctionState awayState = room.getFranchiseAuctionState(match.getAwayFranchise());

            boolean isHomeOwner = homeState != null && java.util.Objects.equals(memberId, homeState.getOwnerMemberId());
            boolean isAwayOwner = awayState != null && java.util.Objects.equals(memberId, awayState.getOwnerMemberId());
            boolean isHost = memberId != null && memberId.equals(room.getHostMemberId());

            if (!isHomeOwner && !isAwayOwner && !isHost) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Only competing team owners or room host can cancel the match.");
            }

            match.setStatus(MiniMatch.Status.MATCH_COMPLETE);
            match.setCompletedAt(Instant.now());
            String cancellerName = isHomeOwner ? match.getHomeFranchise() : isAwayOwner ? match.getAwayFranchise() : "HOST";
            match.setResultText("MATCH CANCELLED BY " + cancellerName);
            match.setWinnerFranchise(isHomeOwner ? match.getAwayFranchise() : isAwayOwner ? match.getHomeFranchise() : null);

            if (resultStore != null) {
                resultStore.recordMatchResult(roomCode, match);
            }

            realtimePublisher.broadcastAuctionEvent(roomCode, "MATCH_CANCELLED", Map.of(
                    "matchId", match.getMatchId(),
                    "canceller", cancellerName,
                    "resultText", match.getResultText()
            ));
            realtimePublisher.broadcastAuctionEvent(roomCode, "MATCH_STATE_UPDATE", matchSummary(match));

            return match;
        }
    }

    public MiniMatch readyMatchPhase(String roomCode, String matchId, String memberId) {
        MiniMatch match = getMatch(roomCode, matchId);
        synchronized (match) {
            AuctionRoom room = roomStore.findByCode(roomCode)
                    .orElseThrow(() -> new AllocationException(AllocationErrorCode.ROOM_NOT_FOUND, "Room not found: " + roomCode));
            FranchiseAuctionState home = room.getFranchiseAuctionState(match.getHomeFranchise());
            FranchiseAuctionState away = room.getFranchiseAuctionState(match.getAwayFranchise());
            boolean isHost = memberId != null && memberId.equals(room.getHostMemberId());
            boolean ownsHome = (home != null && java.util.Objects.equals(memberId, home.getOwnerMemberId())) || (home != null && home.getOwnerMemberId() == null);
            boolean ownsAway = (away != null && java.util.Objects.equals(memberId, away.getOwnerMemberId())) || (away != null && away.getOwnerMemberId() == null);

            if (!isHost && !ownsHome && !ownsAway) {
                throw new AllocationException(AllocationErrorCode.NOT_FRANCHISE_OWNER, "Only competing owners or host can signal phase ready.");
            }

            if (ownsHome || isHost) {
                match.setPhaseReadyHome(true);
            }
            if (ownsAway || isHost) {
                match.setPhaseReadyAway(true);
            }

            if (match.isPhaseReadyHome() && match.isPhaseReadyAway()) {
                match.setPhaseReadyHome(false);
                match.setPhaseReadyAway(false);
                if (match.getStatus() == MiniMatch.Status.WICKET_PAUSE) {
                    if (match.isBattersLocked() && match.isBowlerLocked()) {
                        match.setStatus(MiniMatch.Status.BALL_READY);
                        prepareNextBallInput(match);
                    }
                } else if (match.getStatus() == MiniMatch.Status.NEXT_BOWLER_SELECTION || match.getStatus() == MiniMatch.Status.OVER_SUMMARY) {
                    if (match.isBattersLocked() && match.isBowlerLocked()) {
                        match.setStatus(MiniMatch.Status.BALL_READY);
                        prepareNextBallInput(match);
                    }
                } else if (match.getStatus() == MiniMatch.Status.INNINGS_BREAK) {
                    match.setCurrentStrikerId(null);
                    match.setCurrentNonStrikerId(null);
                    match.setCurrentBowlerId(null);
                    match.setBattersLocked(false);
                    match.setBowlerLocked(false);
                    match.setStatus(MiniMatch.Status.INITIAL_BATTER_SELECTION);
                }
            }

            realtimePublisher.broadcastAuctionEvent(roomCode, "MATCH_STATE_UPDATE", matchSummary(match));
            return match;
        }
    }

    public MiniMatch restartMatch(String roomCode, String matchId, String memberId) {
        MiniMatch match = getMatch(roomCode, matchId);
        synchronized (match) {
            AuctionRoom room = roomStore.findByCode(roomCode)
                    .orElseThrow(() -> new AllocationException(AllocationErrorCode.ROOM_NOT_FOUND, "Room not found: " + roomCode));
            FranchiseAuctionState home = room.getFranchiseAuctionState(match.getHomeFranchise());
            FranchiseAuctionState away = room.getFranchiseAuctionState(match.getAwayFranchise());
            boolean isHost = memberId != null && memberId.equals(room.getHostMemberId());
            boolean ownsHome = home != null && java.util.Objects.equals(memberId, home.getOwnerMemberId());
            boolean ownsAway = away != null && java.util.Objects.equals(memberId, away.getOwnerMemberId());

            if (!isHost && !ownsHome && !ownsAway) {
                throw new AllocationException(AllocationErrorCode.NOT_FRANCHISE_OWNER, "Only team owners or host can restart match.");
            }

            match.setInnings(1);
            match.setHomeRuns(0);
            match.setHomeWickets(0);
            match.setHomeBalls(0);
            match.setAwayRuns(0);
            match.setAwayWickets(0);
            match.setAwayBalls(0);
            match.setTarget(null);
            match.getBallLog().clear();
            match.getRunsByPlayer().clear();
            match.getWicketsByPlayer().clear();
            match.getBallsFacedByPlayer().clear();
            match.getFoursByPlayer().clear();
            match.getSixesByPlayer().clear();
            match.getRunsConcededByBowler().clear();
            match.getBallsBowledByBowler().clear();
            match.getDismissedBatterIds().clear();
            match.setWinnerFranchise(null);
            match.setResultText(null);

            match.setCurrentStrikerId(null);
            match.setCurrentNonStrikerId(null);
            match.setCurrentBowlerId(null);
            match.setBattersLocked(false);
            match.setBowlerLocked(false);
            match.setHomeTossCall(null);
            match.setAwayTossCall(null);
            match.setHomeTossLocked(false);
            match.setAwayTossLocked(false);
            match.setTossDecision(null);
            match.setTossDecisionLocked(false);
            match.setPhaseReadyHome(false);
            match.setPhaseReadyAway(false);
            match.setStatus(MiniMatch.Status.TEAM_XI_SELECTION);

            realtimePublisher.broadcastAuctionEvent(roomCode, "MATCH_STATE_UPDATE", matchSummary(match));
            return match;
        }
    }

    private void swapSides(MiniMatch match) {
        String tmpF = match.getHomeFranchise();
        match.setHomeFranchise(match.getAwayFranchise());
        match.setAwayFranchise(tmpF);
        List<Player> tmpXi = match.getHomeXi();
        match.setHomeXi(match.getAwayXi());
        match.setAwayXi(tmpXi);
        List<String> tmpOrder = match.getHomeBattingOrder();
        match.setHomeBattingOrder(match.getAwayBattingOrder());
        match.setAwayBattingOrder(tmpOrder);
        List<String> tmpBowlers = match.getHomeBowlers();
        match.setHomeBowlers(match.getAwayBowlers());
        match.setAwayBowlers(tmpBowlers);
        boolean tmpR = match.isReadyHome();
        match.setReadyHome(match.isReadyAway());
        match.setReadyAway(tmpR);
    }

    public static int normalizeOvers(Integer overs) {
        if (overs == null) return 2;
        return switch (overs) { case 2, 5, 10, 20 -> overs; default -> 2; };
    }

    private List<Player> resolveXi(FranchiseAuctionState state, List<String> requested, String label) {
        List<Player> squad = new ArrayList<>(state.getSquad());
        if (squad.size() < 5 && playerDataService != null) {
            List<Player> canonical = playerDataService.getAllPlayers();
            Set<String> existing = squad.stream().map(Player::getId).collect(Collectors.toSet());
            for (Player p : canonical) {
                if (squad.size() >= 11) break;
                if (!existing.contains(p.getId())) {
                    squad.add(p);
                    existing.add(p.getId());
                }
            }
        }
        List<Player> xi;
        if (requested != null && !requested.isEmpty()) {
            Map<String, Player> byId = new LinkedHashMap<>();
            for (Player pl : squad) byId.put(pl.getId(), pl);
            xi = new ArrayList<>();
            for (String id : requested) {
                Player pl = byId.get(id);
                if (pl != null) xi.add(pl);
            }
            if (xi.size() < 5) {
                xi = selectBestXi(squad);
            }
        } else {
            xi = selectBestXi(squad);
        }
        return xi;
    }

    private static List<Player> selectBestXi(List<Player> squad) {
        return squad.stream().sorted(Comparator.comparingDouble(PlayerRatings::impactScore).reversed()).limit(11).toList();
    }

    private static List<String> battingOrderOf(List<Player> xi) {
        return xi.stream().sorted(Comparator.comparingDouble(PlayerRatings::battingRating).reversed()).map(Player::getId).toList();
    }

    private static List<String> bowlersOf(List<Player> xi) {
        return xi.stream().sorted(Comparator.comparingDouble(PlayerRatings::bowlingRating).reversed()).map(Player::getId).toList();
    }

    private void broadcastMilestones(MiniMatch match, BallOutcome ball) {
        try {
            if (!ball.extra()) {
                int total = match.getRunsByPlayer().getOrDefault(ball.batterId(), 0);
                int prev = total - ball.runs();
                for (int threshold : new int[]{50, 100}) {
                    if (prev < threshold && total >= threshold) {
                        realtimePublisher.broadcastAuctionEvent(match.getRoomCode(), "MILESTONE", Map.of(
                                "kind", threshold == 50 ? "FIFTY" : "HUNDRED",
                                "playerName", ball.batterName(),
                                "franchise", ball.battingFranchise()
                        ));
                    }
                }
            }
        } catch (Exception e) {
            log.error("Milestone check failed", e);
        }
    }

    private static String pick(Random rng, String... choices) {
        return choices[rng.nextInt(choices.length)];
    }

    private Map<String, Object> matchSummary(MiniMatch m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("matchId", m.getMatchId());
        map.put("roomCode", m.getRoomCode());
        map.put("homeFranchise", m.getHomeFranchise());
        map.put("awayFranchise", m.getAwayFranchise());
        map.put("homeXi", m.getHomeXi());
        map.put("awayXi", m.getAwayXi());
        map.put("innings", m.getInnings());
        map.put("homeRuns", m.getHomeRuns());
        map.put("homeWickets", m.getHomeWickets());
        map.put("homeBalls", m.getHomeBalls());
        map.put("awayRuns", m.getAwayRuns());
        map.put("awayWickets", m.getAwayWickets());
        map.put("awayBalls", m.getAwayBalls());
        map.put("target", m.getTarget());
        map.put("status", m.getStatus().name());
        map.put("readyHome", m.isReadyHome());
        map.put("readyAway", m.isReadyAway());
        map.put("homeXiLocked", m.isHomeXiLocked());
        map.put("awayXiLocked", m.isAwayXiLocked());
        map.put("homeTossCall", m.getHomeTossCall());
        map.put("awayTossCall", m.getAwayTossCall());
        map.put("homeTossLocked", m.isHomeTossLocked());
        map.put("awayTossLocked", m.isAwayTossLocked());
        map.put("tossWinnerFranchise", m.getTossWinnerFranchise());
        map.put("tossDecision", m.getTossDecision());
        map.put("tossDecisionLocked", m.isTossDecisionLocked());
        map.put("currentStrikerId", m.getCurrentStrikerId());
        map.put("currentNonStrikerId", m.getCurrentNonStrikerId());
        map.put("currentBowlerId", m.getCurrentBowlerId());
        map.put("battersLocked", m.isBattersLocked());
        map.put("bowlerLocked", m.isBowlerLocked());
        map.put("previewDeadlineEpochMillis", m.getPreviewDeadlineEpochMillis());
        map.put("overSummaryDeadlineEpochMillis", m.getOverSummaryDeadlineEpochMillis());
        map.put("winnerFranchise", m.getWinnerFranchise());
        map.put("resultText", m.getResultText());
        map.put("overs", m.getOvers());
        map.put("battingFranchise", m.battingFranchise());
        map.put("bowlingFranchise", m.bowlingFranchise());
        map.put("ballLog", m.getBallLog());
        map.put("auditTrail", m.getAuditTrail());
        map.put("humanActionCount", m.getHumanActionCount());
        map.put("serverRuleActionCount", m.getServerRuleActionCount());
        map.put("systemDecisionCount", m.getSystemDecisionCount());
        map.put("cpuDecisionCount", m.getCpuDecisionCount());

        Map<String, String> playerNames = new LinkedHashMap<>();
        for (Player p : m.getHomeXi()) playerNames.put(p.getId(), p.getShortName() != null ? p.getShortName() : p.getFullName());
        for (Player p : m.getAwayXi()) playerNames.put(p.getId(), p.getShortName() != null ? p.getShortName() : p.getFullName());
        map.put("playerNames", playerNames);

        map.put("runsByPlayer", m.getRunsByPlayer());
        map.put("ballsFacedByPlayer", m.getBallsFacedByPlayer());
        map.put("wicketsByPlayer", m.getWicketsByPlayer());
        map.put("ballsBowledByBowler", m.getBallsBowledByBowler());
        map.put("runsConcededByBowler", m.getRunsConcededByBowler());
        return map;
    }
}
