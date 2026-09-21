package com.auctionxi.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "auction_members")
public class AuctionMemberEntity {

    @Id
    @Column(name = "member_id", length = 64)
    private String memberId;

    @Column(name = "room_id", nullable = false, length = 64)
    private String roomId;

    @Column(name = "account_id", length = 64)
    private String accountId;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "role", nullable = false, length = 30)
    private String role = "PARTICIPANT";

    @Column(name = "requested_quota", nullable = false)
    private int requestedQuota = 1;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt = Instant.now();

    @Column(name = "last_heartbeat", nullable = false)
    private Instant lastHeartbeat = Instant.now();

    public AuctionMemberEntity() {}

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public int getRequestedQuota() { return requestedQuota; }
    public void setRequestedQuota(int requestedQuota) { this.requestedQuota = requestedQuota; }

    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }

    public Instant getLastHeartbeat() { return lastHeartbeat; }
    public void setLastHeartbeat(Instant lastHeartbeat) { this.lastHeartbeat = lastHeartbeat; }
}
