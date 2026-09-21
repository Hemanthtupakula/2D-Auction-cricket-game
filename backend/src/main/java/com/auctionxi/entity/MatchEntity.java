package com.auctionxi.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;

@Entity
@Table(name = "matches")
public class MatchEntity {

    @Id
    @Column(name = "match_id", length = 64)
    private String matchId;

    @Column(name = "room_id", nullable = false, length = 64)
    private String roomId;

    @Column(name = "season_fixture_id", length = 64)
    private String seasonFixtureId;

    @Column(name = "home_franchise", nullable = false, length = 10)
    private String homeFranchise;

    @Column(name = "away_franchise", nullable = false, length = 10)
    private String awayFranchise;

    @Column(name = "overs", nullable = false)
    private int overs;

    @Column(name = "status", nullable = false, length = 40)
    private String status;

    @Column(name = "winner_franchise", length = 10)
    private String winnerFranchise;

    @Column(name = "result_text", columnDefinition = "text")
    private String resultText;

    @Column(name = "home_runs", nullable = false)
    private int homeRuns = 0;

    @Column(name = "home_wickets", nullable = false)
    private int homeWickets = 0;

    @Column(name = "home_balls", nullable = false)
    private int homeBalls = 0;

    @Column(name = "away_runs", nullable = false)
    private int awayRuns = 0;

    @Column(name = "away_wickets", nullable = false)
    private int awayWickets = 0;

    @Column(name = "away_balls", nullable = false)
    private int awayBalls = 0;

    @Column(name = "seed", nullable = false)
    private long seed;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "state_snapshot", columnDefinition = "jsonb")
    private String stateSnapshot;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    public MatchEntity() {}

    public String getMatchId() { return matchId; }
    public void setMatchId(String matchId) { this.matchId = matchId; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getSeasonFixtureId() { return seasonFixtureId; }
    public void setSeasonFixtureId(String seasonFixtureId) { this.seasonFixtureId = seasonFixtureId; }

    public String getHomeFranchise() { return homeFranchise; }
    public void setHomeFranchise(String homeFranchise) { this.homeFranchise = homeFranchise; }

    public String getAwayFranchise() { return awayFranchise; }
    public void setAwayFranchise(String awayFranchise) { this.awayFranchise = awayFranchise; }

    public int getOvers() { return overs; }
    public void setOvers(int overs) { this.overs = overs; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getWinnerFranchise() { return winnerFranchise; }
    public void setWinnerFranchise(String winnerFranchise) { this.winnerFranchise = winnerFranchise; }

    public String getResultText() { return resultText; }
    public void setResultText(String resultText) { this.resultText = resultText; }

    public int getHomeRuns() { return homeRuns; }
    public void setHomeRuns(int homeRuns) { this.homeRuns = homeRuns; }

    public int getHomeWickets() { return homeWickets; }
    public void setHomeWickets(int homeWickets) { this.homeWickets = homeWickets; }

    public int getHomeBalls() { return homeBalls; }
    public void setHomeBalls(int homeBalls) { this.homeBalls = homeBalls; }

    public int getAwayRuns() { return awayRuns; }
    public void setAwayRuns(int awayRuns) { this.awayRuns = awayRuns; }

    public int getAwayWickets() { return awayWickets; }
    public void setAwayWickets(int awayWickets) { this.awayWickets = awayWickets; }

    public int getAwayBalls() { return awayBalls; }
    public void setAwayBalls(int awayBalls) { this.awayBalls = awayBalls; }

    public long getSeed() { return seed; }
    public void setSeed(long seed) { this.seed = seed; }

    public String getStateSnapshot() { return stateSnapshot; }
    public void setStateSnapshot(String stateSnapshot) { this.stateSnapshot = stateSnapshot; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
}
