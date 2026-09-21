package com.auctionxi.match.dto;

public class TossChoiceDto {
    private String ownerId;
    private String choice; // BAT or BOWL

    public TossChoiceDto() {}

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public String getChoice() { return choice; }
    public void setChoice(String choice) { this.choice = choice; }
}
