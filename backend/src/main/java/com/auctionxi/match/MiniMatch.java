package com.auctionxi.match;

import com.auctionxi.model.Player;

import java.time.Instant;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * State of one cricket match in AUCTION XI.
 * Authoritative central state machine enforcing "NO OWNER ACTION = NO MATCH PROGRESSION."
 */
public class MiniMatch {

    public enum Status {
        MATCH_CREATED,
        TEAM_XI_SELECTION,
        XI_LOCKED,
        XI_PREVIEW,
        TOSS_SELECTION,
        TOSS_LOCKED,
        TOSS_RESULT,
        BAT_OR_BOWL_SELECTION,
        BAT_OR_BOWL_LOCKED,
        INITIAL_BATTER_SELECTION,
        BATTERS_LOCKED,
        BOWLER_SELECTION,
        BOWLER_LOCKED,
        BALL_READY,
        BALL_EXECUTION,
        BALL_RESULT,
        OVER_SUMMARY,
        WICKET_PAUSE,
        NEXT_BOWLER_SELECTION,
        INNINGS_BREAK,
        MATCH_COMPLETE,

        // Backwards compatibility aliases
        AWAITING_READY,
        TOSS,
        IN_PROGRESS,
        COMPLETED
    }

    public static final int BALLS_PER_INNINGS = 12;

    private int overs = 2;

    private final String matchId;
    private final String roomCode;
    private String homeFranchise;
    private String awayFranchise;

    private List<Player> homeXi;
    private List<Player> awayXi;
    private List<String> homeBattingOrder;
    private List<String> awayBattingOrder;
    private List<String> homeBowlers;
    private List<String> awayBowlers;

    private int innings;
    private int homeRuns;
    private int homeWickets;
    private int homeBalls;
    private int awayRuns;
    private int awayWickets;
    private int awayBalls;
    private int currentBatterIndex;
    private Integer target;

    private final List<BallOutcome> ballLog;
    private final Map<String, Integer> runsByPlayer;
    private final Map<String, Integer> wicketsByPlayer;
    private final Map<String, Integer> ballsFacedByPlayer;
    private final Map<String, Integer> foursByPlayer;
    private final Map<String, Integer> sixesByPlayer;
    private final Map<String, Integer> runsConcededByBowler;
    private final Map<String, Integer> ballsBowledByBowler;
    private final Map<String, String> playerNames;

    private String winnerFranchise;
    private String resultText;
    private String tieBreakNote;

    private volatile boolean readyHome = false;
    private volatile boolean readyAway = false;

    private volatile boolean phaseReadyHome = false;
    private volatile boolean phaseReadyAway = false;

    // Strict owner locking properties
    private volatile boolean homeXiLocked = false;
    private volatile boolean awayXiLocked = false;
    private volatile String homeTossCall;
    private volatile String awayTossCall;
    private volatile boolean homeTossLocked = false;
    private volatile boolean awayTossLocked = false;

    private String tossWinnerFranchise;
    private volatile String tossDecision; // "BAT" or "BOWL"
    private volatile boolean tossDecisionLocked = false;

    private volatile String currentStrikerId;
    private volatile String currentNonStrikerId;
    private volatile String currentBowlerId;
    private volatile boolean battersLocked = false;
    private volatile boolean bowlerLocked = false;

    private volatile long previewDeadlineEpochMillis = 0L;
    private volatile long overSummaryDeadlineEpochMillis = 0L;
    private final Set<String> dismissedBatterIds = ConcurrentHashMap.newKeySet();

    private volatile boolean freeHitNext = false;

    // Semantic gameplay actions are the authoritative input model.
    private volatile String shotAction = "STRAIGHT";
    private volatile String deliveryAction = "PACE";
    private volatile String battingIntent = "OKAY";
    private volatile String bowlingPlan = "OKAY";
    private volatile Double aimX = 0.0;
    private volatile Double aimY = 0.58;
    private volatile Double aimZ = 6.0;
    private volatile String bowlingSpeed = "MEDIUM";
    private volatile String releaseQuality = "GOOD";
    private volatile int bowlingRelease = 50;
    private volatile String batIntent = "NORMAL";
    private volatile String batTimingQuality = "GOOD";
    private volatile int battingTiming = 50;
    private volatile boolean awaitingInput = false;
    private volatile long decisionDeadlineEpochMillis = 0L;
    private volatile boolean intentSubmitted = false;
    private volatile boolean planSubmitted = false;

    private final long seed;
    private volatile Status status;
    private final String seasonFixtureId;
    private final Instant createdAt;
    private Instant completedAt;

    // Server-Authoritative Live Match Audit Trail
    private final List<MatchAuditEvent> auditTrail = new CopyOnWriteArrayList<>();
    private final AtomicInteger humanActionCount = new AtomicInteger(0);
    private final AtomicInteger serverRuleActionCount = new AtomicInteger(0);
    private final AtomicInteger systemDecisionCount = new AtomicInteger(0);
    private final AtomicInteger cpuDecisionCount = new AtomicInteger(0);

    public record MatchAuditEvent(
            String timestamp,
            String actor,
            String action,
            Map<String, Object> details,
            boolean isSystemDecision
    ) {
        public MatchAuditEvent(String timestamp, String actor, String action, Map<String, Object> details) {
            this(timestamp, actor, action, details != null ? details : Collections.emptyMap(), false);
        }
    }

    public MiniMatch(String matchId,
                     String roomCode,
                     String homeFranchise,
                     String awayFranchise,
                     List<Player> homeXi,
                     List<Player> awayXi,
                     List<String> homeBattingOrder,
                     List<String> awayBattingOrder,
                     List<String> homeBowlers,
                     List<String> awayBowlers,
                     long seed,
                     String seasonFixtureId) {
        this.matchId = matchId;
        this.roomCode = roomCode;
        this.homeFranchise = homeFranchise;
        this.awayFranchise = awayFranchise;
        this.homeXi = homeXi;
        this.awayXi = awayXi;
        this.homeBattingOrder = homeBattingOrder;
        this.awayBattingOrder = awayBattingOrder;
        this.homeBowlers = homeBowlers;
        this.awayBowlers = awayBowlers;
        this.seed = seed;
        this.seasonFixtureId = seasonFixtureId;
        this.innings = 1;
        this.ballLog = new ArrayList<>();
        this.runsByPlayer = new ConcurrentHashMap<>();
        this.wicketsByPlayer = new ConcurrentHashMap<>();
        this.ballsFacedByPlayer = new ConcurrentHashMap<>();
        this.foursByPlayer = new ConcurrentHashMap<>();
        this.sixesByPlayer = new ConcurrentHashMap<>();
        this.runsConcededByBowler = new ConcurrentHashMap<>();
        this.ballsBowledByBowler = new ConcurrentHashMap<>();
        this.playerNames = new ConcurrentHashMap<>();
        this.status = Status.AWAITING_READY;
        this.createdAt = Instant.now();
        for (Player p : homeXi) playerNames.put(p.getId(), p.getFullName());
        for (Player p : awayXi) playerNames.put(p.getId(), p.getFullName());
    }

    public String getMatchId() { return matchId; }
    public String getRoomCode() { return roomCode; }
    public String getHomeFranchise() { return homeFranchise; }
    public String getAwayFranchise() { return awayFranchise; }
    public List<Player> getHomeXi() { return homeXi; }
    public List<Player> getAwayXi() { return awayXi; }
    public List<String> getHomeBattingOrder() { return homeBattingOrder; }
    public List<String> getAwayBattingOrder() { return awayBattingOrder; }
    public List<String> getHomeBowlers() { return homeBowlers; }
    public List<String> getAwayBowlers() { return awayBowlers; }
    public int getInnings() { return innings; }
    public void setInnings(int innings) { this.innings = innings; }
    public int getHomeRuns() { return homeRuns; }
    public void setHomeRuns(int v) { this.homeRuns = v; }
    public int getHomeWickets() { return homeWickets; }
    public void setHomeWickets(int v) { this.homeWickets = v; }
    public int getHomeBalls() { return homeBalls; }
    public void setHomeBalls(int v) { this.homeBalls = v; }
    public int getAwayRuns() { return awayRuns; }
    public void setAwayRuns(int v) { this.awayRuns = v; }
    public int getAwayWickets() { return awayWickets; }
    public void setAwayWickets(int v) { this.awayWickets = v; }
    public int getAwayBalls() { return awayBalls; }
    public void setAwayBalls(int v) { this.awayBalls = v; }
    public int getCurrentBatterIndex() { return currentBatterIndex; }
    public void setCurrentBatterIndex(int v) { this.currentBatterIndex = v; }
    public Integer getTarget() { return target; }
    public void setTarget(Integer target) { this.target = target; }
    public List<BallOutcome> getBallLog() { return ballLog; }
    public Map<String, Integer> getRunsByPlayer() { return runsByPlayer; }
    public Map<String, Integer> getWicketsByPlayer() { return wicketsByPlayer; }
    public Map<String, Integer> getBallsFacedByPlayer() { return ballsFacedByPlayer; }
    public Map<String, Integer> getFoursByPlayer() { return foursByPlayer; }
    public Map<String, Integer> getSixesByPlayer() { return sixesByPlayer; }
    public Map<String, Integer> getRunsConcededByBowler() { return runsConcededByBowler; }
    public Map<String, Integer> getBallsBowledByBowler() { return ballsBowledByBowler; }
    public Map<String, String> getPlayerNames() { return playerNames; }
    public String getTossWinnerFranchise() { return tossWinnerFranchise; }
    public void setTossWinnerFranchise(String v) { this.tossWinnerFranchise = v; }
    public int getOvers() { return overs; }
    public void setOvers(int v) { this.overs = v; }
    public int ballsPerInnings() { return overs * 6; }
    public boolean isFreeHitNext() { return freeHitNext; }
    public void setFreeHitNext(boolean v) { this.freeHitNext = v; }
    public void setHomeFranchise(String v) { this.homeFranchise = v; }
    public void setAwayFranchise(String v) { this.awayFranchise = v; }
    public List<String> getHomeTeamXi() { return homeXi != null ? homeXi.stream().map(Player::getId).toList() : List.of(); }
    public List<String> getAwayTeamXi() { return awayXi != null ? awayXi.stream().map(Player::getId).toList() : List.of(); }
    public void setHomeXi(List<Player> v) { this.homeXi = v; }
    public void setAwayXi(List<Player> v) { this.awayXi = v; }
    public void setHomeBattingOrder(List<String> v) { this.homeBattingOrder = v; }
    public void setAwayBattingOrder(List<String> v) { this.awayBattingOrder = v; }
    public void setHomeBowlers(List<String> v) { this.homeBowlers = v; }
    public void setAwayBowlers(List<String> v) { this.awayBowlers = v; }

    public boolean isReadyHome() { return readyHome; }
    public void setReadyHome(boolean v) { this.readyHome = v; }
    public boolean isReadyAway() { return readyAway; }
    public void setReadyAway(boolean v) { this.readyAway = v; }

    public boolean isPhaseReadyHome() { return phaseReadyHome; }
    public void setPhaseReadyHome(boolean v) { this.phaseReadyHome = v; }
    public boolean isPhaseReadyAway() { return phaseReadyAway; }
    public void setPhaseReadyAway(boolean v) { this.phaseReadyAway = v; }

    public boolean isHomeXiLocked() { return homeXiLocked; }
    public void setHomeXiLocked(boolean v) { this.homeXiLocked = v; }
    public boolean isAwayXiLocked() { return awayXiLocked; }
    public void setAwayXiLocked(boolean v) { this.awayXiLocked = v; }
    public String getHomeTossCall() { return homeTossCall; }
    public void setHomeTossCall(String v) { this.homeTossCall = v; }
    public String getAwayTossCall() { return awayTossCall; }
    public void setAwayTossCall(String v) { this.awayTossCall = v; }
    public boolean isHomeTossLocked() { return homeTossLocked; }
    public void setHomeTossLocked(boolean v) { this.homeTossLocked = v; }
    public boolean isAwayTossLocked() { return awayTossLocked; }
    public void setAwayTossLocked(boolean v) { this.awayTossLocked = v; }

    public String getTossDecision() { return tossDecision; }
    public void setTossDecision(String v) { this.tossDecision = v; }
    public boolean isTossDecisionLocked() { return tossDecisionLocked; }
    public void setTossDecisionLocked(boolean v) { this.tossDecisionLocked = v; }

    public String getCurrentStrikerId() { return currentStrikerId; }
    public void setCurrentStrikerId(String v) { this.currentStrikerId = v; }
    public String getCurrentNonStrikerId() { return currentNonStrikerId; }
    public void setCurrentNonStrikerId(String v) { this.currentNonStrikerId = v; }
    public String getCurrentBowlerId() { return currentBowlerId; }
    public void setCurrentBowlerId(String v) { this.currentBowlerId = v; }
    public boolean isBattersLocked() { return battersLocked; }
    public void setBattersLocked(boolean v) { this.battersLocked = v; }
    public boolean isBowlerLocked() { return bowlerLocked; }
    public void setBowlerLocked(boolean v) { this.bowlerLocked = v; }

    public long getPreviewDeadlineEpochMillis() { return previewDeadlineEpochMillis; }
    public void setPreviewDeadlineEpochMillis(long v) { this.previewDeadlineEpochMillis = v; }
    public long getOverSummaryDeadlineEpochMillis() { return overSummaryDeadlineEpochMillis; }
    public void setOverSummaryDeadlineEpochMillis(long v) { this.overSummaryDeadlineEpochMillis = v; }
    public Set<String> getDismissedBatterIds() { return dismissedBatterIds; }

    public String getShotAction() { return shotAction; }
    public void setShotAction(String v) { this.shotAction = v; }
    public String getDeliveryAction() { return deliveryAction; }
    public void setDeliveryAction(String v) { this.deliveryAction = v; }
    public String getBattingIntent() { return battingIntent; }
    public void setBattingIntent(String v) { this.battingIntent = v; }
    public String getBowlingPlan() { return bowlingPlan; }
    public void setBowlingPlan(String v) { this.bowlingPlan = v; }
    public boolean isAwaitingInput() { return awaitingInput; }
    public void setAwaitingInput(boolean v) { this.awaitingInput = v; }
    public long getDecisionDeadlineEpochMillis() { return decisionDeadlineEpochMillis; }
    public void setDecisionDeadlineEpochMillis(long v) { this.decisionDeadlineEpochMillis = v; }
    public boolean isIntentSubmitted() { return intentSubmitted; }
    public void setIntentSubmitted(boolean v) { this.intentSubmitted = v; }
    public boolean isPlanSubmitted() { return planSubmitted; }
    public void setPlanSubmitted(boolean v) { this.planSubmitted = v; }

    public Double getAimX() { return aimX; }
    public void setAimX(Double v) { this.aimX = v; }
    public Double getAimY() { return aimY; }
    public void setAimY(Double v) { this.aimY = v; }
    public Double getAimZ() { return aimZ; }
    public void setAimZ(Double v) { this.aimZ = v; }
    public String getBowlingSpeed() { return bowlingSpeed; }
    public void setBowlingSpeed(String v) { this.bowlingSpeed = v; }
    public String getReleaseQuality() { return releaseQuality; }
    public void setReleaseQuality(String v) { this.releaseQuality = v; }
    public int getBowlingRelease() { return bowlingRelease; }
    public void setBowlingRelease(int v) { this.bowlingRelease = v; }
    public String getBatIntent() { return batIntent; }
    public void setBatIntent(String v) { this.batIntent = v; }
    public String getBatTimingQuality() { return batTimingQuality; }
    public void setBatTimingQuality(String v) { this.batTimingQuality = v; }
    public int getBattingTiming() { return battingTiming; }
    public void setBattingTiming(int v) { this.battingTiming = v; }

    public String getWinnerFranchise() { return winnerFranchise; }
    public void setWinnerFranchise(String v) { this.winnerFranchise = v; }
    public String getResultText() { return resultText; }
    public void setResultText(String v) { this.resultText = v; }
    public String getTieBreakNote() { return tieBreakNote; }
    public void setTieBreakNote(String v) { this.tieBreakNote = v; }
    public long getSeed() { return seed; }
    public Status getStatus() { return status; }
    public void setStatus(Status v) { this.status = v; }
    public String getSeasonFixtureId() { return seasonFixtureId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant v) { this.completedAt = v; }

    public String battingFranchise() {
        return innings == 1 ? homeFranchise : awayFranchise;
    }

    public String bowlingFranchise() {
        return innings == 1 ? awayFranchise : homeFranchise;
    }

    public int battingRuns() { return innings == 1 ? homeRuns : awayRuns; }
    public int battingWickets() { return innings == 1 ? homeWickets : awayWickets; }
    public int battingBalls() { return innings == 1 ? homeBalls : awayBalls; }
    public int totalMatchBalls() { return overs * 6; }
    public int ballsRemaining() { return Math.max(0, totalMatchBalls() - battingBalls()); }

    public int maxWickets() {
        int xiSize = innings == 1 ? homeBattingOrder.size() : awayBattingOrder.size();
        return Math.max(1, xiSize - 1);
    }

    public Player findPlayer(String playerId) {
        for (Player p : homeXi) if (p.getId().equals(playerId)) return p;
        for (Player p : awayXi) if (p.getId().equals(playerId)) return p;
        return null;
    }

    public void addAuditEvent(String actor, String action, Map<String, Object> details) {
        String timeStr = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));
        if (actor != null && (actor.startsWith("OWNER_A") || actor.startsWith("OWNER_B") || actor.startsWith("OWNER"))) {
            humanActionCount.incrementAndGet();
        } else if ("SERVER".equalsIgnoreCase(actor)) {
            serverRuleActionCount.incrementAndGet();
        } else {
            systemDecisionCount.incrementAndGet();
        }
        auditTrail.add(new MatchAuditEvent(timeStr, actor, action, details));
        // Keep most recent 200 audit events in memory
        if (auditTrail.size() > 200) {
            auditTrail.remove(0);
        }
    }

    public List<MatchAuditEvent> getAuditTrail() {
        return Collections.unmodifiableList(auditTrail);
    }

    public int getHumanActionCount() { return humanActionCount.get(); }
    public int getServerRuleActionCount() { return serverRuleActionCount.get(); }
    public int getSystemDecisionCount() { return systemDecisionCount.get(); }
    public int getCpuDecisionCount() { return cpuDecisionCount.get(); }
}
