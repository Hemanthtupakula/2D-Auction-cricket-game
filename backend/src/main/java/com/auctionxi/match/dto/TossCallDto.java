package com.auctionxi.match.dto;

public class TossCallDto {
    private String ownerId;
    private String call; // HEADS or TAILS

    public TossCallDto() {}

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public String getCall() { return call; }
    public void setCall(String call) { this.call = call; }
}
