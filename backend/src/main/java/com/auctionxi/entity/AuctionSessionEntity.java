package com.auctionxi.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "auction_sessions")
public class AuctionSessionEntity {

    @Id
    @Column(name = "auction_session_id", length = 64)
    private String auctionSessionId;

    @Column(name = "room_id", nullable = false, length = 64)
    private String roomId;

    @Column(name = "status", nullable = false, length = 40)
    private String status;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "version", nullable = false)
    private long version = 1;

    public AuctionSessionEntity() {}

    public String getAuctionSessionId() { return auctionSessionId; }
    public void setAuctionSessionId(String auctionSessionId) { this.auctionSessionId = auctionSessionId; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    public long getVersion() { return version; }
    public void setVersion(long version) { this.version = version; }
}
