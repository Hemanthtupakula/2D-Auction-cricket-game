package com.auctionxi.model;

import java.time.Instant;
import java.util.Objects;

public class FranchiseSeat {
    private final Franchise franchise;
    private FranchiseOwnerType ownerType;
    private String ownerMemberId;
    private String ownerDisplayName;
    private Instant assignedAt;

    public FranchiseSeat(Franchise franchise) {
        this.franchise = Objects.requireNonNull(franchise, "franchise cannot be null");
        this.ownerType = FranchiseOwnerType.UNASSIGNED;
        this.ownerMemberId = null;
        this.ownerDisplayName = null;
        this.assignedAt = null;
    }

    public synchronized void claimByHuman(String memberId, String displayName) {
        this.ownerType = FranchiseOwnerType.HUMAN;
        this.ownerMemberId = memberId;
        this.ownerDisplayName = displayName;
        this.assignedAt = Instant.now();
    }

    public synchronized void release() {
        this.ownerType = FranchiseOwnerType.UNASSIGNED;
        this.ownerMemberId = null;
        this.ownerDisplayName = null;
        this.assignedAt = null;
    }

    public synchronized void markInactive() {
        this.ownerType = FranchiseOwnerType.INACTIVE;
        this.ownerMemberId = null;
        this.ownerDisplayName = null;
    }

    public boolean isOpen() {
        return ownerType == FranchiseOwnerType.UNASSIGNED;
    }

    public boolean isHuman() {
        return ownerType == FranchiseOwnerType.HUMAN;
    }

    public boolean isInactive() {
        return ownerType == FranchiseOwnerType.INACTIVE;
    }

    public Franchise getFranchise() {
        return franchise;
    }

    public String getFranchiseCode() {
        return franchise.getCode();
    }

    public String getFranchiseName() {
        return franchise.getFullName();
    }

    public FranchiseOwnerType getOwnerType() {
        return ownerType;
    }

    public String getOwnerMemberId() {
        return ownerMemberId;
    }

    public String getOwnerDisplayName() {
        return ownerDisplayName;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }
}
