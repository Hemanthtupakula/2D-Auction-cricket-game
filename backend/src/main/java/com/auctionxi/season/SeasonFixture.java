package com.auctionxi.season;

/**
 * One fixture in a season: a league match or a playoff tie.
 */
public class SeasonFixture {

    public enum Status { PENDING, IN_PROGRESS, COMPLETED }

    private final String fixtureId;
    private final String label;          // "League Match 3", "Qualifier 1", "Eliminator", "Qualifier 2", "Final"
    private final String stage;          // LEAGUE | PLAYOFF
    private final String homeFranchise;
    private final String awayFranchise;
    private Status status;
    private String matchId;
    private String winnerFranchise;
    private String loserFranchise;
    private int homeRuns;
    private int homeBalls;
    private int awayRuns;
    private int awayBalls;
    private String resultText;

    public SeasonFixture(String fixtureId, String label, String stage, String homeFranchise, String awayFranchise) {
        this.fixtureId = fixtureId;
        this.label = label;
        this.stage = stage;
        this.homeFranchise = homeFranchise;
        this.awayFranchise = awayFranchise;
        this.status = Status.PENDING;
    }

    public String getFixtureId() { return fixtureId; }
    public String getLabel() { return label; }
    public String getStage() { return stage; }
    public String getHomeFranchise() { return homeFranchise; }
    public String getAwayFranchise() { return awayFranchise; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
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

    public boolean involves(String franchiseCode) {
        return homeFranchise.equalsIgnoreCase(franchiseCode) || awayFranchise.equalsIgnoreCase(franchiseCode);
    }
}
