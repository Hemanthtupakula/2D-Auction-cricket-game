package com.auctionxi.match.dto;

public class MatchPauseDto {
    private String ownerId;
    private String reason;

    public MatchPauseDto() {}

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
