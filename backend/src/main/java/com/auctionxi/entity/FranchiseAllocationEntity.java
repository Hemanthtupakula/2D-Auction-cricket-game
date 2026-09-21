package com.auctionxi.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "franchise_allocations")
public class FranchiseAllocationEntity {

    @Id
    @Column(name = "allocation_id", length = 64)
    private String allocationId;

    @Column(name = "room_id", nullable = false, length = 64)
    private String roomId;

    @Column(name = "franchise_code", nullable = false, length = 10)
    private String franchiseCode;

    @Column(name = "owner_type", nullable = false, length = 20)
    private String ownerType = "UNASSIGNED";

    @Column(name = "member_id", length = 64)
    private String memberId;

    @Column(name = "member_display_name", length = 100)
    private String memberDisplayName;

    @Column(name = "assigned_at")
    private Instant assignedAt;

    @Column(name = "released_at")
    private Instant releasedAt;

    public FranchiseAllocationEntity() {}

    public String getAllocationId() { return allocationId; }
    public void setAllocationId(String allocationId) { this.allocationId = allocationId; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getFranchiseCode() { return franchiseCode; }
    public void setFranchiseCode(String franchiseCode) { this.franchiseCode = franchiseCode; }

    public String getOwnerType() { return ownerType; }
    public void setOwnerType(String ownerType) { this.ownerType = ownerType; }

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public String getMemberDisplayName() { return memberDisplayName; }
    public void setMemberDisplayName(String memberDisplayName) { this.memberDisplayName = memberDisplayName; }

    public Instant getAssignedAt() { return assignedAt; }
    public void setAssignedAt(Instant assignedAt) { this.assignedAt = assignedAt; }

    public Instant getReleasedAt() { return releasedAt; }
    public void setReleasedAt(Instant releasedAt) { this.releasedAt = releasedAt; }
}
