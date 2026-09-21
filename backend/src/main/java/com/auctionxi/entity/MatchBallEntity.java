package com.auctionxi.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;

@Entity
@Table(name = "match_balls")
public class MatchBallEntity {

    @Id
    @Column(name = "match_ball_id", length = 64)
    private String matchBallId;

    @Column(name = "match_id", nullable = false, length = 64)
    private String matchId;

    @Column(name = "delivery_sequence", nullable = false)
    private long deliverySequence;

    @Column(name = "innings", nullable = false)
    private int innings;

    @Column(name = "over_number", nullable = false)
    private int overNumber;

    @Column(name = "ball_in_over", nullable = false)
    private int ballInOver;

    @Column(name = "batting_franchise", length = 10)
    private String battingFranchise;

    @Column(name = "bowling_franchise", length = 10)
    private String bowlingFranchise;

    @Column(name = "batter_id", length = 64)
    private String batterId;

    @Column(name = "bowler_id", length = 64)
    private String bowlerId;

    @Column(name = "outcome", length = 30)
    private String outcome;

    @Column(name = "runs", nullable = false)
    private int runs = 0;

    @Column(name = "wicket", nullable = false)
    private boolean wicket = false;

    @Column(name = "extra", nullable = false)
    private boolean extra = false;

    @Column(name = "score_runs", nullable = false)
    private int scoreRuns = 0;

    @Column(name = "score_wickets", nullable = false)
    private int scoreWickets = 0;

    @Column(name = "score_balls", nullable = false)
    private int scoreBalls = 0;

    @Column(name = "target")
    private Integer target;

    @Column(name = "commentary", columnDefinition = "text")
    private String commentary;

    @Column(name = "shot_intent", length = 20)
    private String shotIntent;

    @Column(name = "bowl_plan", length = 20)
    private String bowlPlan;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "simulation_payload", columnDefinition = "jsonb")
    private String simulationPayload;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public MatchBallEntity() {}

    public String getMatchBallId() { return matchBallId; }
    public void setMatchBallId(String matchBallId) { this.matchBallId = matchBallId; }

    public String getMatchId() { return matchId; }
    public void setMatchId(String matchId) { this.matchId = matchId; }

    public long getDeliverySequence() { return deliverySequence; }
    public void setDeliverySequence(long deliverySequence) { this.deliverySequence = deliverySequence; }

    public int getInnings() { return innings; }
    public void setInnings(int innings) { this.innings = innings; }

    public int getOverNumber() { return overNumber; }
    public void setOverNumber(int overNumber) { this.overNumber = overNumber; }

    public int getBallInOver() { return ballInOver; }
    public void setBallInOver(int ballInOver) { this.ballInOver = ballInOver; }

    public String getBattingFranchise() { return battingFranchise; }
    public void setBattingFranchise(String battingFranchise) { this.battingFranchise = battingFranchise; }

    public String getBowlingFranchise() { return bowlingFranchise; }
    public void setBowlingFranchise(String bowlingFranchise) { this.bowlingFranchise = bowlingFranchise; }

    public String getBatterId() { return batterId; }
    public void setBatterId(String batterId) { this.batterId = batterId; }

    public String getBowlerId() { return bowlerId; }
    public void setBowlerId(String bowlerId) { this.bowlerId = bowlerId; }

    public String getOutcome() { return outcome; }
    public void setOutcome(String outcome) { this.outcome = outcome; }

    public int getRuns() { return runs; }
    public void setRuns(int runs) { this.runs = runs; }

    public boolean isWicket() { return wicket; }
    public void setWicket(boolean wicket) { this.wicket = wicket; }

    public boolean isExtra() { return extra; }
    public void setExtra(boolean extra) { this.extra = extra; }

    public int getScoreRuns() { return scoreRuns; }
    public void setScoreRuns(int scoreRuns) { this.scoreRuns = scoreRuns; }

    public int getScoreWickets() { return scoreWickets; }
    public void setScoreWickets(int scoreWickets) { this.scoreWickets = scoreWickets; }

    public int getScoreBalls() { return scoreBalls; }
    public void setScoreBalls(int scoreBalls) { this.scoreBalls = scoreBalls; }

    public Integer getTarget() { return target; }
    public void setTarget(Integer target) { this.target = target; }

    public String getCommentary() { return commentary; }
    public void setCommentary(String commentary) { this.commentary = commentary; }

    public String getShotIntent() { return shotIntent; }
    public void setShotIntent(String shotIntent) { this.shotIntent = shotIntent; }

    public String getBowlPlan() { return bowlPlan; }
    public void setBowlPlan(String bowlPlan) { this.bowlPlan = bowlPlan; }

    public String getSimulationPayload() { return simulationPayload; }
    public void setSimulationPayload(String simulationPayload) { this.simulationPayload = simulationPayload; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
