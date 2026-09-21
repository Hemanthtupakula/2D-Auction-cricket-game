package com.auctionxi.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "player_match_stats")
public class PlayerMatchStatEntity {

    @Id
    @Column(name = "player_match_stat_id", length = 64)
    private String playerMatchStatId;

    @Column(name = "match_id", nullable = false, length = 64)
    private String matchId;

    @Column(name = "player_id", nullable = false, length = 64)
    private String playerId;

    @Column(name = "franchise_code", nullable = false, length = 10)
    private String franchiseCode;

    @Column(name = "runs", nullable = false)
    private int runs = 0;

    @Column(name = "balls_faced", nullable = false)
    private int ballsFaced = 0;

    @Column(name = "fours", nullable = false)
    private int fours = 0;

    @Column(name = "sixes", nullable = false)
    private int sixes = 0;

    @Column(name = "wickets", nullable = false)
    private int wickets = 0;

    @Column(name = "balls_bowled", nullable = false)
    private int ballsBowled = 0;

    @Column(name = "runs_conceded", nullable = false)
    private int runsConceded = 0;

    public PlayerMatchStatEntity() {}

    public String getPlayerMatchStatId() { return playerMatchStatId; }
    public void setPlayerMatchStatId(String playerMatchStatId) { this.playerMatchStatId = playerMatchStatId; }

    public String getMatchId() { return matchId; }
    public void setMatchId(String matchId) { this.matchId = matchId; }

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }

    public String getFranchiseCode() { return franchiseCode; }
    public void setFranchiseCode(String franchiseCode) { this.franchiseCode = franchiseCode; }

    public int getRuns() { return runs; }
    public void setRuns(int runs) { this.runs = runs; }

    public int getBallsFaced() { return ballsFaced; }
    public void setBallsFaced(int ballsFaced) { this.ballsFaced = ballsFaced; }

    public int getFours() { return fours; }
    public void setFours(int fours) { this.fours = fours; }

    public int getSixes() { return sixes; }
    public void setSixes(int sixes) { this.sixes = sixes; }

    public int getWickets() { return wickets; }
    public void setWickets(int wickets) { this.wickets = wickets; }

    public int getBallsBowled() { return ballsBowled; }
    public void setBallsBowled(int ballsBowled) { this.ballsBowled = ballsBowled; }

    public int getRunsConceded() { return runsConceded; }
    public void setRunsConceded(int runsConceded) { this.runsConceded = runsConceded; }
}
