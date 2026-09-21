package com.auctionxi.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "match_players")
public class MatchPlayerEntity {

    @Id
    @Column(name = "match_player_id", length = 64)
    private String matchPlayerId;

    @Column(name = "match_id", nullable = false, length = 64)
    private String matchId;

    @Column(name = "player_id", nullable = false, length = 64)
    private String playerId;

    @Column(name = "franchise_code", nullable = false, length = 10)
    private String franchiseCode;

    @Column(name = "role_in_match", length = 30)
    private String roleInMatch;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadata;

    public MatchPlayerEntity() {}

    public String getMatchPlayerId() { return matchPlayerId; }
    public void setMatchPlayerId(String matchPlayerId) { this.matchPlayerId = matchPlayerId; }

    public String getMatchId() { return matchId; }
    public void setMatchId(String matchId) { this.matchId = matchId; }

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }

    public String getFranchiseCode() { return franchiseCode; }
    public void setFranchiseCode(String franchiseCode) { this.franchiseCode = franchiseCode; }

    public String getRoleInMatch() { return roleInMatch; }
    public void setRoleInMatch(String roleInMatch) { this.roleInMatch = roleInMatch; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }
}
