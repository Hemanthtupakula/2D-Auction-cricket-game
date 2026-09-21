package com.auctionxi.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "auction_purchases")
public class AuctionPurchaseEntity {

    @Id
    @Column(name = "purchase_id", length = 64)
    private String purchaseId;

    @Column(name = "room_id", nullable = false, length = 64)
    private String roomId;

    @Column(name = "player_id", nullable = false, length = 64)
    private String playerId;

    @Column(name = "franchise_code", nullable = false, length = 10)
    private String franchiseCode;

    @Column(name = "amount_lakhs", nullable = false)
    private long amountLakhs;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "SOLD";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public AuctionPurchaseEntity() {}

    public String getPurchaseId() { return purchaseId; }
    public void setPurchaseId(String purchaseId) { this.purchaseId = purchaseId; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }

    public String getFranchiseCode() { return franchiseCode; }
    public void setFranchiseCode(String franchiseCode) { this.franchiseCode = franchiseCode; }

    public long getAmountLakhs() { return amountLakhs; }
    public void setAmountLakhs(long amountLakhs) { this.amountLakhs = amountLakhs; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
