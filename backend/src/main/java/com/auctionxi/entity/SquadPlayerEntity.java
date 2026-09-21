package com.auctionxi.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "squad_players")
public class SquadPlayerEntity {

    @Id
    @Column(name = "squad_player_id", length = 64)
    private String squadPlayerId;

    @Column(name = "room_id", nullable = false, length = 64)
    private String roomId;

    @Column(name = "franchise_code", nullable = false, length = 10)
    private String franchiseCode;

    @Column(name = "player_id", nullable = false, length = 64)
    private String playerId;

    @Column(name = "purchase_id", length = 64)
    private String purchaseId;

    @Column(name = "price_lakhs")
    private Long priceLakhs;

    @Column(name = "acquired_at", nullable = false)
    private Instant acquiredAt = Instant.now();

    public SquadPlayerEntity() {}

    public String getSquadPlayerId() { return squadPlayerId; }
    public void setSquadPlayerId(String squadPlayerId) { this.squadPlayerId = squadPlayerId; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getFranchiseCode() { return franchiseCode; }
    public void setFranchiseCode(String franchiseCode) { this.franchiseCode = franchiseCode; }

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }

    public String getPurchaseId() { return purchaseId; }
    public void setPurchaseId(String purchaseId) { this.purchaseId = purchaseId; }

    public Long getPriceLakhs() { return priceLakhs; }
    public void setPriceLakhs(Long priceLakhs) { this.priceLakhs = priceLakhs; }

    public Instant getAcquiredAt() { return acquiredAt; }
    public void setAcquiredAt(Instant acquiredAt) { this.acquiredAt = acquiredAt; }
}
