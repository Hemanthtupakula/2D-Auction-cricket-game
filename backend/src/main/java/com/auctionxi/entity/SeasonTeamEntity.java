package com.auctionxi.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "season_teams")
public class SeasonTeamEntity {

    @Id
    @Column(name = "season_team_id", length = 64)
    private String seasonTeamId;

    @Column(name = "season_id", nullable = false, length = 64)
    private String seasonId;

    @Column(name = "franchise_code", nullable = false, length = 10)
    private String franchiseCode;

    @Column(name = "seed_order")
    private Integer seedOrder;

    public SeasonTeamEntity() {}

    public String getSeasonTeamId() { return seasonTeamId; }
    public void setSeasonTeamId(String seasonTeamId) { this.seasonTeamId = seasonTeamId; }

    public String getSeasonId() { return seasonId; }
    public void setSeasonId(String seasonId) { this.seasonId = seasonId; }

    public String getFranchiseCode() { return franchiseCode; }
    public void setFranchiseCode(String franchiseCode) { this.franchiseCode = franchiseCode; }

    public Integer getSeedOrder() { return seedOrder; }
    public void setSeedOrder(Integer seedOrder) { this.seedOrder = seedOrder; }
}
