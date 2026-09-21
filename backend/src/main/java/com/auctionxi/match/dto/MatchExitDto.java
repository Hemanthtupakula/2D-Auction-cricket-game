package com.auctionxi.match.dto;

public class MatchExitDto {
    private String ownerId;
    private String reason;

    public MatchExitDto() {}

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
