package com.auctionxi.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "season_fixtures")
public class SeasonFixtureEntity {

    @Id
    @Column(name = "fixture_id", length = 64)
    private String fixtureId;

    @Column(name = "season_id", nullable = false, length = 64)
    private String seasonId;

    @Column(name = "label", nullable = false, length = 120)
    private String label;

    @Column(name = "stage", nullable = false, length = 30)
    private String stage;

    @Column(name = "home_franchise", nullable = false, length = 10)
    private String homeFranchise;

    @Column(name = "away_franchise", nullable = false, length = 10)
    private String awayFranchise;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "match_id", length = 64)
    private String matchId;

    @Column(name = "winner_franchise", length = 10)
    private String winnerFranchise;

    @Column(name = "loser_franchise", length = 10)
    private String loserFranchise;

    @Column(name = "home_runs", nullable = false)
    private int homeRuns = 0;

    @Column(name = "home_balls", nullable = false)
    private int homeBalls = 0;

    @Column(name = "away_runs", nullable = false)
    private int awayRuns = 0;

    @Column(name = "away_balls", nullable = false)
    private int awayBalls = 0;

    @Column(name = "result_text", columnDefinition = "text")
    private String resultText;

    public SeasonFixtureEntity() {}

    public String getFixtureId() { return fixtureId; }
    public void setFixtureId(String fixtureId) { this.fixtureId = fixtureId; }

    public String getSeasonId() { return seasonId; }
    public void setSeasonId(String seasonId) { this.seasonId = seasonId; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }

    public String getHomeFranchise() { return homeFranchise; }
    public void setHomeFranchise(String homeFranchise) { this.homeFranchise = homeFranchise; }

    public String getAwayFranchise() { return awayFranchise; }
    public void setAwayFranchise(String awayFranchise) { this.awayFranchise = awayFranchise; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMatchId() { return matchId; }
    public void setMatchId(String matchId) { this.matchId = matchId; }

    public String getWinnerFranchise() { return winnerFranchise; }
    public void setWinnerFranchise(String winnerFranchise) { this.winnerFranchise = winnerFranchise; }

    public String getLoserFranchise() { return loserFranchise; }
    public void setLoserFranchise(String loserFranchise) { this.loserFranchise = loserFranchise; }

    public int getHomeRuns() { return homeRuns; }
    public void setHomeRuns(int homeRuns) { this.homeRuns = homeRuns; }

    public int getHomeBalls() { return homeBalls; }
    public void setHomeBalls(int homeBalls) { this.homeBalls = homeBalls; }

    public int getAwayRuns() { return awayRuns; }
    public void setAwayRuns(int awayRuns) { this.awayRuns = awayRuns; }

    public int getAwayBalls() { return awayBalls; }
    public void setAwayBalls(int awayBalls) { this.awayBalls = awayBalls; }

    public String getResultText() { return resultText; }
    public void setResultText(String resultText) { this.resultText = resultText; }
}
