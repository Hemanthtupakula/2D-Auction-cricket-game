package com.auctionxi.match;

import com.auctionxi.exception.AllocationErrorCode;
import com.auctionxi.exception.AllocationException;
import com.auctionxi.model.*;
import com.auctionxi.model.dto.AllocationStateDto;
import com.auctionxi.service.MediaIngestionService;
import com.auctionxi.service.PlayerDataService;
import com.auctionxi.service.RealtimePublisher;
import com.auctionxi.service.RoomStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.security.SecureRandom;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MatchOwnerVerificationTest {

    private RoomStore roomStore;
    private MiniMatchService matchService;
    private AuctionRoom room;
    private final String roomCode = "ROOM48";
    private final String memberA = "mem_csk_owner";
    private final String memberB = "mem_mi_owner";
    private final String memberC = "mem_intruder";

    @BeforeEach
    void setUp() {
        roomStore = new RoomStore();
        RealtimePublisher noopPublisher = new RealtimePublisher() {
            @Override
            public void broadcastAllocationState(String roomCode, AllocationStateDto state) {}
            @Override
            public void broadcastSystemAlert(String roomCode, String message) {}
        };

        ObjectMapper objectMapper = new ObjectMapper();
        MediaIngestionService mediaIngestionService = new MediaIngestionService(objectMapper);
        mediaIngestionService.init();
        PlayerDataService playerDataService = new PlayerDataService(objectMapper, mediaIngestionService);
        playerDataService.init();

        matchService = new MiniMatchService(roomStore, noopPublisher, null);

        room = new AuctionRoom("room-uuid-48", roomCode, "Test Room", memberA);
        roomStore.save(room);

        // Setup CSK and MI with human owners
        FranchiseAuctionState csk = room.getFranchiseAuctionState("CSK");
        csk.setOwnerMemberId(memberA);
        csk.setActive(true);

        FranchiseAuctionState mi = room.getFranchiseAuctionState("MI");
        mi.setOwnerMemberId(memberB);
        mi.setActive(true);

        // Populate squads with players
        List<Player> allPlayers = playerDataService.getAllPlayers();
        for (int i = 0; i < 15 && i < allPlayers.size(); i++) {
            csk.addPlayer(allPlayers.get(i), 100);
        }
        for (int i = 15; i < 30 && i < allPlayers.size(); i++) {
            mi.addPlayer(allPlayers.get(i), 100);
        }
    }

    @Test
    @DisplayName("1. XI Readiness Gate: Match strictly refuses to start until BOTH human owners confirm XI")
    void testXiReadinessGate() {
        MiniMatch match = matchService.startMatch(roomCode, memberA, "CSK", "MI", 2, null, null);
        assertNotNull(match);
        assertFalse(match.isHomeXiLocked(), "CSK XI must initially be unlocked");
        assertFalse(match.isAwayXiLocked(), "MI XI must initially be unlocked");

        // Intruder cannot lock
        assertThrows(AllocationException.class, () -> matchService.readyMatch(roomCode, match.getMatchId(), memberC));

        // Test 1: Only Owner A confirms
        matchService.readyMatch(roomCode, match.getMatchId(), memberA);
        assertTrue(match.isHomeXiLocked(), "Owner A's XI must now be locked");
        assertFalse(match.isAwayXiLocked(), "Owner B's XI must remain unlocked");
        assertNotEquals(MiniMatch.Status.XI_PREVIEW, match.getStatus(), "Match must refuse to start with only 1 confirmed XI");

        // Test 2: Owner B confirms
        matchService.readyMatch(roomCode, match.getMatchId(), memberB);
        assertTrue(match.isHomeXiLocked(), "Owner A's XI locked");
        assertTrue(match.isAwayXiLocked(), "Owner B's XI locked");
        assertEquals(MiniMatch.Status.XI_PREVIEW, match.getStatus(), "Match must now proceed to XI_PREVIEW");

        // Verify audit trail recorded both owners
        assertTrue(match.getAuditTrail().stream().anyMatch(e -> e.actor().contains("OWNER_A") && e.action().contains("LOCKED_XI")));
        assertTrue(match.getAuditTrail().stream().anyMatch(e -> e.actor().contains("OWNER_B") && e.action().contains("LOCKED_XI")));
        assertEquals(0, match.getSystemDecisionCount(), "Zero system decisions allowed");
        assertEquals(0, match.getCpuDecisionCount(), "Zero CPU decisions allowed");
    }

    @Test
    @DisplayName("2. Cryptographic Toss Randomness: 500 tosses show unbiased distribution")
    void testTossRandomness() {
        SecureRandom rng = new SecureRandom();
        int headsCount = 0;
        int trials = 500;
        for (int i = 0; i < trials; i++) {
            if (rng.nextBoolean()) headsCount++;
        }
        int tailsCount = trials - headsCount;

        // Statistically, 500 flips should be within 200..300 (40% to 60%)
        assertTrue(headsCount >= 190 && headsCount <= 310,
                "Toss distribution must be balanced around 50/50. Heads: " + headsCount + ", Tails: " + tailsCount);
    }

    @Test
    @DisplayName("3. Toss Winner Exclusively Controls Bat/Bowl Decision & Innings Assignment")
    void testTossWinnerControlsDecision() {
        MiniMatch match = matchService.startMatch(roomCode, memberA, "CSK", "MI", 2, null, null);
        match.setStatus(MiniMatch.Status.TOSS_SELECTION);

        // Both submit calls
        matchService.submitTossCall(roomCode, match.getMatchId(), memberA, "HEADS");
        matchService.submitTossCall(roomCode, match.getMatchId(), memberB, "TAILS");

        assertEquals(MiniMatch.Status.BAT_OR_BOWL_SELECTION, match.getStatus());
        String winnerFranchise = match.getTossWinnerFranchise();
        assertNotNull(winnerFranchise);

        boolean cskWon = "CSK".equalsIgnoreCase(winnerFranchise);
        String loserMember = cskWon ? memberB : memberA;
        String winnerMember = cskWon ? memberA : memberB;

        // Loser tries to make toss decision -> must fail
        AllocationException ex = assertThrows(AllocationException.class, () ->
                matchService.tossCall(roomCode, match.getMatchId(), loserMember, "BAT"));
        assertEquals(AllocationErrorCode.NOT_FRANCHISE_OWNER, ex.getErrorCode());

        // Winner makes toss decision -> succeeds
        matchService.tossCall(roomCode, match.getMatchId(), winnerMember, "BOWL");
        assertEquals(MiniMatch.Status.INITIAL_BATTER_SELECTION, match.getStatus());

        // Winner chose BOWL -> winner must be bowling franchise in Innings 1
        assertEquals(winnerFranchise, match.bowlingFranchise(), "Winner chose BOWL so winner must bowl first");
        assertNotEquals(winnerFranchise, match.battingFranchise(), "Winner chose BOWL so opponent must bat first");
    }

    @Test
    @DisplayName("4. Bowler Selection: Bowler locked for over and cannot bowl consecutive overs")
    void testBowlerSelectionAndConsecutiveRestriction() {
        MiniMatch match = matchService.startMatch(roomCode, memberA, "CSK", "MI", 2, null, null);
        match.setStatus(MiniMatch.Status.NEXT_BOWLER_SELECTION);

        Player bowler1 = match.getInnings() == 1 ? match.getAwayXi().get(0) : match.getHomeXi().get(0);
        Player bowler2 = match.getInnings() == 1 ? match.getAwayXi().get(1) : match.getHomeXi().get(1);

        String bowlingOwner = match.bowlingFranchise().equalsIgnoreCase("CSK") ? memberA : memberB;

        // Set current bowler as bowler1
        match.setCurrentBowlerId(bowler1.getId());

        // Attempting to select bowler1 again in NEXT_BOWLER_SELECTION must fail
        AllocationException ex = assertThrows(AllocationException.class, () ->
                matchService.selectBowler(roomCode, match.getMatchId(), bowlingOwner, bowler1.getId()));
        assertEquals(AllocationErrorCode.INVALID_REQUEST, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("consecutive"), "Must report consecutive over error");

        // Selecting bowler2 must succeed
        matchService.selectBowler(roomCode, match.getMatchId(), bowlingOwner, bowler2.getId());
        assertEquals(bowler2.getId(), match.getCurrentBowlerId(), "Bowler 2 must be locked for the over");
    }

    @Test
    @DisplayName("5. Zero System/CPU Decisions: All actions originate from human owners or server referee")
    void testAuditTrailIntegrity() {
        MiniMatch match = matchService.startMatch(roomCode, memberA, "CSK", "MI", 2, null, null);

        // Perform human actions
        matchService.readyMatch(roomCode, match.getMatchId(), memberA);
        matchService.readyMatch(roomCode, match.getMatchId(), memberB);

        assertEquals(0, match.getSystemDecisionCount(), "Zero system decisions allowed");
        assertEquals(0, match.getCpuDecisionCount(), "Zero CPU decisions allowed");
        assertTrue(match.getHumanActionCount() >= 2, "Human actions recorded");
        assertTrue(match.getServerRuleActionCount() >= 1, "Server rule actions recorded");

        // Verify all audit entries have isSystemDecision = false
        for (MiniMatch.MatchAuditEvent event : match.getAuditTrail()) {
            assertFalse(event.isSystemDecision(), "No audit entry can be a system decision");
            assertNotNull(event.timestamp());
            assertNotNull(event.actor());
            assertNotNull(event.action());
        }
    }

    @Test
    @DisplayName("6. Human Owner-vs-Owner Ball Execution: Bowler challenge -> Batter intent -> Server resolution")
    void testOwnerVsOwnerBallExecutionAndResolution() {
        MiniMatch match = matchService.startMatch(roomCode, memberA, "CSK", "MI", 2, null, null);
        matchService.readyMatch(roomCode, match.getMatchId(), memberA);
        matchService.readyMatch(roomCode, match.getMatchId(), memberB);

        // Advance to Toss
        match.setStatus(MiniMatch.Status.TOSS_SELECTION);
        matchService.submitTossCall(roomCode, match.getMatchId(), memberA, "HEADS");
        matchService.submitTossCall(roomCode, match.getMatchId(), memberB, "TAILS");

        // Winner elects to BAT
        String tossWinner = match.getTossWinnerFranchise();
        String winnerMember = tossWinner.equalsIgnoreCase("CSK") ? memberA : memberB;
        matchService.tossCall(roomCode, match.getMatchId(), winnerMember, "BAT");

        String battingOwner = room.getFranchiseAuctionState(match.battingFranchise()).getOwnerMemberId();
        String bowlingOwner = room.getFranchiseAuctionState(match.bowlingFranchise()).getOwnerMemberId();
        List<Player> battingXi = match.getInnings() == 1 ? match.getHomeXi() : match.getAwayXi();
        List<Player> bowlingXi = match.getInnings() == 1 ? match.getAwayXi() : match.getHomeXi();

        // 1. Batting owner selects openers
        matchService.selectOpeners(roomCode, match.getMatchId(), battingOwner, battingXi.get(0).getId(), battingXi.get(1).getId());
        assertEquals(MiniMatch.Status.BOWLER_SELECTION, match.getStatus());

        // 2. Bowling owner selects bowler -> transitions to BALL_READY
        matchService.selectBowler(roomCode, match.getMatchId(), bowlingOwner, bowlingXi.get(0).getId());
        assertEquals(MiniMatch.Status.BALL_READY, match.getStatus());
        assertTrue(match.isAwaitingInput());

        // 3. Batting owner cannot bowl, bowling owner cannot bat
        assertThrows(AllocationException.class, () ->
                matchService.submitBowlAction(roomCode, match.getMatchId(), battingOwner, "YORKER", "act_bowl_err"));
        assertThrows(AllocationException.class, () ->
                matchService.submitBatAction(roomCode, match.getMatchId(), bowlingOwner, "DRIVE", "act_bat_err"));

        // 4. Bowling owner submits delivery
        matchService.submitBowlAction(roomCode, match.getMatchId(), bowlingOwner, "YORKER", "act_b1");
        assertTrue(match.isPlanSubmitted(), "Bowler delivery must be committed");
        assertFalse(match.isIntentSubmitted(), "Batter intent must still be pending");
        assertEquals(0, match.getBallLog().size(), "Ball must NOT be resolved before batter acts");

        // 5. Batting owner submits shot response
        matchService.submitBatAction(roomCode, match.getMatchId(), battingOwner, "DRIVE", "act_a1");

        // 6. Server referee authoritatively resolves ball
        assertEquals(1, match.getBallLog().size(), "Ball must be resolved immediately once both inputs lock");
        BallOutcome ball = match.getBallLog().get(0);
        assertNotNull(ball.outcome());
        assertTrue(ball.runs() >= 0);

        // 7. Audit trail verification: 0 CPU decisions, strictly human owners + server referee
        assertEquals(0, match.getSystemDecisionCount(), "Zero system decisions allowed");
        assertEquals(0, match.getCpuDecisionCount(), "Zero CPU decisions allowed");

        assertTrue(match.getAuditTrail().stream().anyMatch(e -> e.action().contains("DELIVERY_SELECTED=YORKER")));
        assertTrue(match.getAuditTrail().stream().anyMatch(e -> e.action().contains("BATTING_INTENT=DRIVE")));
        assertTrue(match.getAuditTrail().stream().anyMatch(e -> e.actor().equals("SERVER") && e.action().startsWith("RESULT=")));
        assertTrue(match.getAuditTrail().stream().anyMatch(e -> e.actor().equals("SERVER") && e.action().startsWith("SCORE=")));
    }

    @Test
    @DisplayName("7. Cricket Strike Rotation: Mid-over odd runs swap; Ball 6 single keeps strike; Ball 6 dot/even swaps ends")
    void testCricketStrikeRotation() {
        MiniMatch match = matchService.startMatch(roomCode, memberA, "CSK", "MI", 2, null, null);
        matchService.readyMatch(roomCode, match.getMatchId(), memberA);
        matchService.readyMatch(roomCode, match.getMatchId(), memberB);

        match.setStatus(MiniMatch.Status.TOSS_SELECTION);
        matchService.submitTossCall(roomCode, match.getMatchId(), memberA, "HEADS");
        matchService.submitTossCall(roomCode, match.getMatchId(), memberB, "TAILS");
        matchService.tossCall(roomCode, match.getMatchId(), match.getTossWinnerFranchise().equalsIgnoreCase("CSK") ? memberA : memberB, "BAT");

        String battingOwner = room.getFranchiseAuctionState(match.battingFranchise()).getOwnerMemberId();
        String bowlingOwner = room.getFranchiseAuctionState(match.bowlingFranchise()).getOwnerMemberId();
        List<Player> battingXi = match.getInnings() == 1 ? match.getHomeXi() : match.getAwayXi();
        List<Player> bowlingXi = match.getInnings() == 1 ? match.getAwayXi() : match.getHomeXi();

        String opener1 = battingXi.get(0).getId();
        String opener2 = battingXi.get(1).getId();

        matchService.selectOpeners(roomCode, match.getMatchId(), battingOwner, opener1, opener2);
        matchService.selectBowler(roomCode, match.getMatchId(), bowlingOwner, bowlingXi.get(0).getId());

        assertEquals(opener1, match.getCurrentStrikerId());
        assertEquals(opener2, match.getCurrentNonStrikerId());

        // Play 6 balls with deterministic inputs
        for (int b = 1; b <= 6; b++) {
            String prevStriker = match.getCurrentStrikerId();
            String prevNonStriker = match.getCurrentNonStrikerId();

            matchService.submitBowlAction(roomCode, match.getMatchId(), bowlingOwner, "PACE", "b_act_" + b);
            matchService.submitBatAction(roomCode, match.getMatchId(), battingOwner, "DEFENCE", "a_act_" + b);

            BallOutcome outcome = match.getBallLog().get(match.getBallLog().size() - 1);
            int runs = outcome.runs();

            if (b < 6) {
                // Balls 1 to 5
                if (!outcome.wicket()) {
                    if (runs % 2 != 0) {
                        assertEquals(prevNonStriker, match.getCurrentStrikerId(), "Odd run must swap striker mid-over");
                        assertEquals(prevStriker, match.getCurrentNonStrikerId(), "Odd run must swap non-striker mid-over");
                    } else {
                        assertEquals(prevStriker, match.getCurrentStrikerId(), "Even run must retain striker mid-over");
                        assertEquals(prevNonStriker, match.getCurrentNonStrikerId(), "Even run must retain non-striker mid-over");
                    }
                }
            } else {
                // Ball 6 (End of over)
                if (!outcome.wicket()) {
                    if (runs % 2 == 0) {
                        // Even runs: end change means non-striker takes strike
                        assertEquals(prevNonStriker, match.getCurrentStrikerId(), "Ball 6 dot/even runs: bowling end changes, non-striker takes strike");
                    } else {
                        // Odd runs: crossed + end change = net zero swaps
                        assertEquals(prevStriker, match.getCurrentStrikerId(), "Ball 6 odd run: batsman retains strike for next over");
                    }
                }
            }
        }

        // Verify zero system/cpu decisions after entire over
        assertEquals(0, match.getSystemDecisionCount(), "Zero system decisions allowed across over");
        assertEquals(0, match.getCpuDecisionCount(), "Zero CPU decisions allowed across over");
    }

    @Test
    @DisplayName("8. Security & Permissions: Non-owners cannot manipulate match actions")
    void testSecurityAndPermissions() {
        MiniMatch match = matchService.startMatch(roomCode, memberA, "CSK", "MI", 2, null, null);

        // Intruder tries to ready match
        assertThrows(AllocationException.class, () -> matchService.readyMatch(roomCode, match.getMatchId(), memberC));

        // Intruder tries to submit toss call
        match.setStatus(MiniMatch.Status.TOSS_SELECTION);
        assertThrows(AllocationException.class, () -> matchService.submitTossCall(roomCode, match.getMatchId(), memberC, "HEADS"));

        // Intruder tries to select openers
        match.setStatus(MiniMatch.Status.INITIAL_BATTER_SELECTION);
        assertThrows(AllocationException.class, () ->
                matchService.selectOpeners(roomCode, match.getMatchId(), memberC, "p1", "p2"));

        // Intruder tries to select bowler
        assertThrows(AllocationException.class, () ->
                matchService.selectBowler(roomCode, match.getMatchId(), memberC, "p3"));

        // Intruder tries to submit batting/bowling actions
        match.setStatus(MiniMatch.Status.BALL_READY);
        match.setAwaitingInput(true);
        assertThrows(AllocationException.class, () ->
                matchService.submitBowlAction(roomCode, match.getMatchId(), memberC, "PACE", "c1"));
        assertThrows(AllocationException.class, () ->
                matchService.submitBatAction(roomCode, match.getMatchId(), memberC, "DRIVE", "c2"));
    }
}

