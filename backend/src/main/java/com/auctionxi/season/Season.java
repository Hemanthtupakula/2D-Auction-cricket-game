package com.auctionxi.season;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Phase 5, Section 7 — a full season on top of the auction:
 * League (round robin) -> Playoffs -> Final -> Champion.
 */
public class Season {

    public enum Stage { LEAGUE, PLAYOFFS, COMPLETED }

    private final String seasonId;
    private final String roomCode;
    // Match length for every fixture in this season: 2, 5, 10 or 20 overs
    private int overs = 2;
    private final boolean doubleRoundRobin;
    private final List<String> teams;                 // human franchise codes, seeded order
    private final List<SeasonFixture> fixtures;       // league fixtures first, playoffs appended as bracket resolves
    private volatile Stage stage;
    private String championFranchise;
    private String runnerUpFranchise;
    private Map<String, Object> awards;               // Orange Cap, Purple Cap, Best Buy of the Auction
    private final Instant startedAt;
    private Instant completedAt;

    public Season(String seasonId, String roomCode, boolean doubleRoundRobin, List<String> teams) {
        this.seasonId = seasonId;
        this.roomCode = roomCode;
        this.doubleRoundRobin = doubleRoundRobin;
        this.teams = new CopyOnWriteArrayList<>(teams);
        this.fixtures = new CopyOnWriteArrayList<>();
        this.stage = Stage.LEAGUE;
        this.startedAt = Instant.now();
        this.awards = new ConcurrentHashMap<>();
    }

    public String getSeasonId() { return seasonId; }
    public String getRoomCode() { return roomCode; }
    public int getOvers() { return overs; }
    public void setOvers(int v) { this.overs = v; }
    public boolean isDoubleRoundRobin() { return doubleRoundRobin; }
    public List<String> getTeams() { return teams; }
    public List<SeasonFixture> getFixtures() { return fixtures; }
    public Stage getStage() { return stage; }
    public void setStage(Stage stage) { this.stage = stage; }
    public String getChampionFranchise() { return championFranchise; }
    public void setChampionFranchise(String championFranchise) { this.championFranchise = championFranchise; }
    public String getRunnerUpFranchise() { return runnerUpFranchise; }
    public void setRunnerUpFranchise(String runnerUpFranchise) { this.runnerUpFranchise = runnerUpFranchise; }
    public Map<String, Object> getAwards() { return awards; }
    public void setAwards(Map<String, Object> awards) { this.awards = awards; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    public SeasonFixture findFixture(String fixtureId) {
        return fixtures.stream()
                .filter(f -> f.getFixtureId().equals(fixtureId))
                .findFirst()
                .orElse(null);
    }

    public SeasonFixture nextPendingFixture() {
        return fixtures.stream()
                .filter(f -> f.getStatus() == SeasonFixture.Status.PENDING)
                .findFirst()
                .orElse(null);
    }

    public List<SeasonFixture> leagueFixtures() {
        return fixtures.stream().filter(f -> "LEAGUE".equals(f.getStage())).toList();
    }

    public List<SeasonFixture> playoffFixtures() {
        return fixtures.stream().filter(f -> "PLAYOFF".equals(f.getStage())).toList();
    }
}
