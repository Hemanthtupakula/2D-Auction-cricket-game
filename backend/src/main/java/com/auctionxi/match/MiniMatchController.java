package com.auctionxi.match;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * AUCTION XI Match Engine REST Controller.
 * Exposes authoritative endpoints for owner locks, toss, openers, bowler election, timing meters & reconnect state.
 */
@RestController
@RequestMapping("/api/rooms/{roomCode}/matches")
public class MiniMatchController {

    private final MiniMatchService miniMatchService;

    @Autowired
    private final MatchResultStore resultStore;

    public MiniMatchController(MiniMatchService miniMatchService, MatchResultStore resultStore) {
        this.miniMatchService = miniMatchService;
        this.resultStore = resultStore;
    }

    public record StartMatchRequest(String memberId, String homeFranchise, String awayFranchise,
                                    Integer overs, java.util.List<String> homeXi, java.util.List<String> awayXi) {}
    public record IntentRequest(String memberId, int position) {}
    public record PlanRequest(String memberId, int position) {}
    public record GameplayRequest(String memberId, String action, String actionId,
                                  Double aimX, Double aimZ, String speed, String releaseQuality,
                                  String intent, String timingQuality) {}
    public record BowlControlRequest(String memberId, Double aimX, Double aimY, Object speed, Integer release) {}
    public record BatControlRequest(String memberId, String intent, Integer timing) {}
    public record ReadyRequest(String memberId) {}
    public record TossCallRequest(String memberId, String call) {}
    public record SelectOpenersRequest(String memberId, String strikerId, String nonStrikerId) {}
    public record SelectPlayerRequest(String memberId, String playerId) {}

    @PostMapping
    public ResponseEntity<MiniMatch> startMatch(
            @PathVariable String roomCode,
            @RequestBody StartMatchRequest req
    ) {
        return ResponseEntity.ok(
                miniMatchService.startMatch(roomCode, req.memberId(), req.homeFranchise(), req.awayFranchise(),
                        null, req.overs(), req.homeXi(), req.awayXi()));
    }

    @GetMapping
    public ResponseEntity<List<MiniMatch>> listMatches(@PathVariable String roomCode) {
        return ResponseEntity.ok(miniMatchService.listMatches(roomCode));
    }

    @GetMapping("/{matchId}")
    public ResponseEntity<MiniMatch> getMatch(
            @PathVariable String roomCode,
            @PathVariable String matchId
    ) {
        return ResponseEntity.ok(miniMatchService.getMatch(roomCode, matchId));
    }

    @GetMapping("/{matchId}/state")
    public ResponseEntity<MiniMatch> getMatchState(
            @PathVariable String roomCode,
            @PathVariable String matchId
    ) {
        return ResponseEntity.ok(miniMatchService.getMatch(roomCode, matchId));
    }

    /** Both owners select & lock toss call (HEADS/TAILS) */
    @PostMapping("/{matchId}/toss-call")
    public ResponseEntity<MiniMatch> submitTossCall(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody TossCallRequest req
    ) {
        return ResponseEntity.ok(miniMatchService.submitTossCall(roomCode, matchId, req.memberId(), req.call()));
    }

    /** Toss winner chooses BAT or BOWL */
    @PostMapping("/{matchId}/toss")
    public ResponseEntity<MiniMatch> tossCall(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody TossCallRequest req
    ) {
        return ResponseEntity.ok(miniMatchService.tossCall(roomCode, matchId, req.memberId(), req.call()));
    }

    /** Batting owner locks Striker & Non-Striker openers */
    @PostMapping("/{matchId}/openers")
    public ResponseEntity<MiniMatch> selectOpeners(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody SelectOpenersRequest req
    ) {
        return ResponseEntity.ok(miniMatchService.selectOpeners(roomCode, matchId, req.memberId(), req.strikerId(), req.nonStrikerId()));
    }

    /** Bowling owner selects bowler for the over */
    @PostMapping("/{matchId}/select-bowler")
    public ResponseEntity<MiniMatch> selectBowler(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody SelectPlayerRequest req
    ) {
        return ResponseEntity.ok(miniMatchService.selectBowler(roomCode, matchId, req.memberId(), req.playerId()));
    }

    /** Batting owner locks replacement batter after WICKET */
    @PostMapping("/{matchId}/select-batter")
    public ResponseEntity<MiniMatch> selectBatter(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody SelectPlayerRequest req
    ) {
        return ResponseEntity.ok(miniMatchService.selectWicketReplacement(roomCode, matchId, req.memberId(), req.playerId()));
    }

    @PostMapping("/{matchId}/ready")
    public ResponseEntity<MiniMatch> readyMatch(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody ReadyRequest req
    ) {
        return ResponseEntity.ok(miniMatchService.readyMatch(roomCode, matchId, req.memberId()));
    }

    @PostMapping("/{matchId}/phase-ready")
    public ResponseEntity<MiniMatch> readyMatchPhase(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody ReadyRequest req
    ) {
        return ResponseEntity.ok(miniMatchService.readyMatchPhase(roomCode, matchId, req.memberId()));
    }

    @PostMapping("/{matchId}/restart")
    public ResponseEntity<MiniMatch> restartMatch(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody ReadyRequest req
    ) {
        return ResponseEntity.ok(miniMatchService.restartMatch(roomCode, matchId, req.memberId()));
    }

    @PostMapping("/{matchId}/intent")
    public ResponseEntity<MiniMatch> submitIntent(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody IntentRequest req
    ) {
        return ResponseEntity.ok(miniMatchService.submitBatTiming(roomCode, matchId, req.memberId(), req.position()));
    }

    @PostMapping("/{matchId}/bowl")
    public ResponseEntity<MiniMatch> submitBowlPlan(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody PlanRequest req
    ) {
        return ResponseEntity.ok(miniMatchService.submitBowlTiming(roomCode, matchId, req.memberId(), req.position()));
    }

    /** Browser 3D gameplay actions. The backend is authoritative and receives physical aim or semantic cricket choices. */
    @PostMapping({"/{matchId}/gameplay/bat", "/{matchId}/action/bat"})
    public ResponseEntity<MiniMatch> submitBatGameplay(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody GameplayRequest req
    ) {
        return ResponseEntity.ok(miniMatchService.submitBatAction(
                roomCode, matchId, req.memberId(), req.action(), req.actionId(), req.intent(), req.timingQuality()));
    }

    @PostMapping({"/{matchId}/gameplay/bowl", "/{matchId}/action/bowl"})
    public ResponseEntity<MiniMatch> submitBowlGameplay(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody GameplayRequest req
    ) {
        return ResponseEntity.ok(miniMatchService.submitBowlAction(
                roomCode, matchId, req.memberId(), req.action(), req.actionId(),
                req.aimX(), req.aimZ(), req.speed(), req.releaseQuality()));
    }

    @PostMapping({"/{matchId}/ball/bowl-control", "/{matchId}/ball/bowl-action"})
    public ResponseEntity<MiniMatch> submitBowlControl(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody BowlControlRequest req
    ) {
        Double x = req.aimX() != null ? req.aimX() : 0.0;
        Double z = req.aimY() != null ? (req.aimY() * 7.5 - 1.5) : 2.0;
        String spd = "MEDIUM";
        if (req.speed() instanceof Number n) {
            int s = n.intValue();
            spd = s == 0 ? "SLOW" : s == 2 ? "FAST" : "MEDIUM";
        } else if (req.speed() != null) {
            spd = req.speed().toString();
        }
        String releaseQual = "GOOD";
        if (req.release() != null) {
            int dist = Math.abs(req.release() - 50);
            releaseQual = dist <= 8 ? "PERFECT" : dist <= 22 ? "GOOD" : dist <= 38 ? "OKAY" : "POOR";
        }
        return ResponseEntity.ok(miniMatchService.submitBowlAction(
                roomCode, matchId, req.memberId(), null, "act_ctrl_bowl_" + System.currentTimeMillis(),
                x, z, spd, releaseQual));
    }

    @PostMapping({"/{matchId}/ball/bat-control", "/{matchId}/ball/bat-action"})
    public ResponseEntity<MiniMatch> submitBatControl(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody BatControlRequest req
    ) {
        String intent = req.intent() != null ? req.intent() : "NORMAL";
        String timingQual = "GOOD";
        if (req.timing() != null) {
            int dist = Math.abs(req.timing() - 50);
            timingQual = dist <= 8 ? "PERFECT" : dist <= 22 ? "GOOD" : dist <= 38 ? "OKAY" : "POOR";
        }
        return ResponseEntity.ok(miniMatchService.submitBatAction(
                roomCode, matchId, req.memberId(), null, "act_ctrl_bat_" + System.currentTimeMillis(),
                intent, timingQual));
    }

    /** Cancel / Abandon match by either competing team owner or host */
    @PostMapping("/{matchId}/cancel")
    public ResponseEntity<MiniMatch> cancelMatch(
            @PathVariable String roomCode,
            @PathVariable String matchId,
            @RequestBody ReadyRequest req
    ) {
        return ResponseEntity.ok(miniMatchService.cancelMatch(roomCode, matchId, req.memberId()));
    }

    /** Explicitly named owner-control aliases used by the current Auction XI frontend. */
    @PostMapping("/{matchId}/xi/lock")
    public ResponseEntity<MiniMatch> lockXi(@PathVariable String roomCode, @PathVariable String matchId,
                                             @RequestBody ReadyRequest req) {
        return ResponseEntity.ok(miniMatchService.readyMatch(roomCode, matchId, req.memberId()));
    }

    @PostMapping("/{matchId}/toss/call")
    public ResponseEntity<MiniMatch> tossCallLock(@PathVariable String roomCode, @PathVariable String matchId,
                                                   @RequestBody TossCallRequest req) {
        return ResponseEntity.ok(miniMatchService.submitTossCall(roomCode, matchId, req.memberId(), req.call()));
    }

    @PostMapping("/{matchId}/toss/decision")
    public ResponseEntity<MiniMatch> tossDecision(@PathVariable String roomCode, @PathVariable String matchId,
                                                   @RequestBody TossCallRequest req) {
        return ResponseEntity.ok(miniMatchService.tossCall(roomCode, matchId, req.memberId(), req.call()));
    }

    @PostMapping("/{matchId}/openers/lock")
    public ResponseEntity<MiniMatch> lockOpeners(@PathVariable String roomCode, @PathVariable String matchId,
                                                  @RequestBody SelectOpenersRequest req) {
        return ResponseEntity.ok(miniMatchService.selectOpeners(roomCode, matchId, req.memberId(), req.strikerId(), req.nonStrikerId()));
    }

    @PostMapping("/{matchId}/bowler/lock")
    public ResponseEntity<MiniMatch> lockBowler(@PathVariable String roomCode, @PathVariable String matchId,
                                                 @RequestBody SelectPlayerRequest req) {
        return ResponseEntity.ok(miniMatchService.selectBowler(roomCode, matchId, req.memberId(), req.playerId()));
    }

    @PostMapping("/{matchId}/wicket/select-batter")
    public ResponseEntity<MiniMatch> lockReplacement(@PathVariable String roomCode, @PathVariable String matchId,
                                                      @RequestBody SelectPlayerRequest req) {
        return ResponseEntity.ok(miniMatchService.selectWicketReplacement(roomCode, matchId, req.memberId(), req.playerId()));
    }

    @GetMapping("/{matchId}/audit")
    public ResponseEntity<Map<String, Object>> getAuditTrail(@PathVariable String roomCode, @PathVariable String matchId) {
        MiniMatch m = miniMatchService.getMatch(roomCode, matchId);
        return ResponseEntity.ok(Map.of(
                "matchId", m.getMatchId(),
                "auditTrail", m.getAuditTrail(),
                "humanActionCount", m.getHumanActionCount(),
                "serverRuleActionCount", m.getServerRuleActionCount(),
                "systemDecisionCount", m.getSystemDecisionCount(),
                "cpuDecisionCount", m.getCpuDecisionCount()
        ));
    }

    @GetMapping("/results")
    public ResponseEntity<Map<String, Object>> results(@PathVariable String roomCode) {
        return ResponseEntity.ok(resultStore.results(roomCode));
    }
}
