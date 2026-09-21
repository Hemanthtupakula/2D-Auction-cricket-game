package com.auctionxi.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "squads")
public class SquadEntity {

    @Id
    @Column(name = "squad_id", length = 64)
    private String squadId;

    @Column(name = "room_id", nullable = false, length = 64)
    private String roomId;

    @Column(name = "franchise_code", nullable = false, length = 10)
    private String franchiseCode;

    @Column(name = "remaining_purse_lakhs", nullable = false)
    private long remainingPurseLakhs = 10000;

    @Column(name = "total_players", nullable = false)
    private int totalPlayers = 0;

    @Column(name = "overseas_players", nullable = false)
    private int overseasPlayers = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public SquadEntity() {}

    public String getSquadId() { return squadId; }
    public void setSquadId(String squadId) { this.squadId = squadId; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getFranchiseCode() { return franchiseCode; }
    public void setFranchiseCode(String franchiseCode) { this.franchiseCode = franchiseCode; }

    public long getRemainingPurseLakhs() { return remainingPurseLakhs; }
    public void setRemainingPurseLakhs(long remainingPurseLakhs) { this.remainingPurseLakhs = remainingPurseLakhs; }

    public int getTotalPlayers() { return totalPlayers; }
    public void setTotalPlayers(int totalPlayers) { this.totalPlayers = totalPlayers; }

    public int getOverseasPlayers() { return overseasPlayers; }
    public void setOverseasPlayers(int overseasPlayers) { this.overseasPlayers = overseasPlayers; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
