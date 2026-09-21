package com.auctionxi.match.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class ProposalRequestDto {
    @NotBlank
    private String roomId;
    @NotBlank
    private String creatorOwnerId;
    @NotBlank
    private String opponentOwnerId;
    @NotBlank
    private String franchiseA;
    @NotBlank
    private String franchiseB;

    @Min(2)
    @Max(20)
    private int overs = 5;

    public ProposalRequestDto() {}

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
}
