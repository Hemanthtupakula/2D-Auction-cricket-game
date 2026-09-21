package com.auctionxi.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;

@Entity
@Table(name = "seasons")
public class SeasonEntity {

    @Id
    @Column(name = "season_id", length = 64)
    private String seasonId;

    @Column(name = "room_id", nullable = false, length = 64)
    private String roomId;

    @Column(name = "overs", nullable = false)
    private int overs = 2;

    @Column(name = "double_round_robin", nullable = false)
    private boolean doubleRoundRobin = false;

    @Column(name = "stage", nullable = false, length = 30)
    private String stage;

    @Column(name = "champion_franchise", length = 10)
    private String championFranchise;

    @Column(name = "runner_up_franchise", length = 10)
    private String runnerUpFranchise;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "awards", columnDefinition = "jsonb")
    private String awards;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    public SeasonEntity() {}

    public String getSeasonId() { return seasonId; }
    public void setSeasonId(String seasonId) { this.seasonId = seasonId; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public int getOvers() { return overs; }
    public void setOvers(int overs) { this.overs = overs; }

    public boolean isDoubleRoundRobin() { return doubleRoundRobin; }
    public void setDoubleRoundRobin(boolean doubleRoundRobin) { this.doubleRoundRobin = doubleRoundRobin; }

    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }

    public String getChampionFranchise() { return championFranchise; }
    public void setChampionFranchise(String championFranchise) { this.championFranchise = championFranchise; }

    public String getRunnerUpFranchise() { return runnerUpFranchise; }
    public void setRunnerUpFranchise(String runnerUpFranchise) { this.runnerUpFranchise = runnerUpFranchise; }

    public String getAwards() { return awards; }
    public void setAwards(String awards) { this.awards = awards; }

    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
}
