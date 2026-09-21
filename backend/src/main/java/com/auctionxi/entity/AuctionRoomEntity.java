package com.auctionxi.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "auction_rooms")
public class AuctionRoomEntity {

    @Id
    @Column(name = "room_id", length = 64)
    private String roomId;

    @Column(name = "code", nullable = false, unique = true, length = 10)
    private String code;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "host_member_id", nullable = false, length = 64)
    private String hostMemberId;

    @Column(name = "status", nullable = false, length = 40)
    private String status;

    @Column(name = "max_franchises", nullable = false)
    private int maxFranchises = 10;

    @Column(name = "starting_purse_lakhs", nullable = false)
    private long startingPurseLakhs = 10000;

    @Column(name = "version", nullable = false)
    private long version = 1;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public AuctionRoomEntity() {}

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getHostMemberId() { return hostMemberId; }
    public void setHostMemberId(String hostMemberId) { this.hostMemberId = hostMemberId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getMaxFranchises() { return maxFranchises; }
    public void setMaxFranchises(int maxFranchises) { this.maxFranchises = maxFranchises; }

    public long getStartingPurseLakhs() { return startingPurseLakhs; }
    public void setStartingPurseLakhs(long startingPurseLakhs) { this.startingPurseLakhs = startingPurseLakhs; }

    public long getVersion() { return version; }
    public void setVersion(long version) { this.version = version; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
