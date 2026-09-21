package com.auctionxi.match.model;

import java.time.Instant;
import java.util.UUID;

public class MiniMatchProposal {
    private String proposalId;
    private String roomId;
    private String creatorOwnerId;
    private String opponentOwnerId;
    private String franchiseA;
    private String franchiseB;
    private int overs;
    private String status; // PROPOSED, ACCEPTED, DECLINED, CANCELLED
    private Instant createdAt;
    private Instant updatedAt;

    public MiniMatchProposal() {
        this.proposalId = UUID.randomUUID().toString();
        this.status = "PROPOSED";
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public MiniMatchProposal(String roomId, String creatorOwnerId, String opponentOwnerId, String franchiseA, String franchiseB, int overs) {
        this();
        this.roomId = roomId;
        this.creatorOwnerId = creatorOwnerId;
        this.opponentOwnerId = opponentOwnerId;
        this.franchiseA = franchiseA;
        this.franchiseB = franchiseB;
        this.overs = overs;
    }

    public String getProposalId() { return proposalId; }
    public void setProposalId(String proposalId) { this.proposalId = proposalId; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getCreatorOwnerId() { return creatorOwnerId; }
    public void setCreatorOwnerId(String creatorOwnerId) { this.creatorOwnerId = creatorOwnerId; }

    public String getOpponentOwnerId() { return opponentOwnerId; }
    public void setOpponentOwnerId(String opponentOwnerId) { this.opponentOwnerId = opponentOwnerId; }

    public String getFranchiseA() { return franchiseA; }
    public void setFranchiseA(String franchiseA) { this.franchiseA = franchiseA; }

    public String getFranchiseB() { return franchiseB; }
    public void setFranchiseB(String franchiseB) { this.franchiseB = franchiseB; }

    public int getOvers() { return overs; }
    public void setOvers(int overs) { this.overs = overs; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
