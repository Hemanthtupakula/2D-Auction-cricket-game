package com.auctionxi.model;

import java.time.Instant;
import java.util.Objects;

public class RoomMember {
    private final String memberId;
    private final String displayName;
    private MemberRole role;
    private int requestedQuota;
    private final Instant joinedAt;
    private Instant lastHeartbeat;

    public RoomMember(String memberId, String displayName, MemberRole role) {
        this.memberId = Objects.requireNonNull(memberId, "memberId cannot be null");
        this.displayName = Objects.requireNonNull(displayName, "displayName cannot be null");
        this.role = Objects.requireNonNull(role, "role cannot be null");
        this.requestedQuota = 1;
        this.joinedAt = Instant.now();
        this.lastHeartbeat = Instant.now();
    }

    public String getMemberId() {
        return memberId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public MemberRole getRole() {
        return role;
    }

    public void setRole(MemberRole role) {
        this.role = role;
    }

    public int getRequestedQuota() {
        return requestedQuota;
    }

    public void setRequestedQuota(int requestedQuota) {
        this.requestedQuota = requestedQuota;
    }

    public boolean isHost() {
        return role == MemberRole.HOST;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public Instant getLastHeartbeat() {
        return lastHeartbeat;
    }

    public void updateHeartbeat() {
        this.lastHeartbeat = Instant.now();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RoomMember that = (RoomMember) o;
        return Objects.equals(memberId, that.memberId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(memberId);
    }
}
