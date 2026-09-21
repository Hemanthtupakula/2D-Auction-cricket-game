package com.auctionxi.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;

@Entity
@Table(name = "room_state_snapshots")
public class RoomStateSnapshotEntity {

    @Id
    @Column(name = "snapshot_id", length = 64)
    private String snapshotId;

    @Column(name = "room_id", nullable = false, length = 64)
    private String roomId;

    @Column(name = "version", nullable = false)
    private long version;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "state", nullable = false, columnDefinition = "jsonb")
    private String state;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public RoomStateSnapshotEntity() {}

    public String getSnapshotId() { return snapshotId; }
    public void setSnapshotId(String snapshotId) { this.snapshotId = snapshotId; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public long getVersion() { return version; }
    public void setVersion(long version) { this.version = version; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
