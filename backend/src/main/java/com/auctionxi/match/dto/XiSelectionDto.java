package com.auctionxi.match.dto;

import java.util.List;

public class XiSelectionDto {
    private String ownerId;
    private String franchiseCode;
    private List<String> playerIds;
    private String captainId;
    private String wicketkeeperId;

    public XiSelectionDto() {}

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public String getFranchiseCode() { return franchiseCode; }
    public void setFranchiseCode(String franchiseCode) { this.franchiseCode = franchiseCode; }

    public List<String> getPlayerIds() { return playerIds; }
    public void setPlayerIds(List<String> playerIds) { this.playerIds = playerIds; }

    public String getCaptainId() { return captainId; }
    public void setCaptainId(String captainId) { this.captainId = captainId; }

    public String getWicketkeeperId() { return wicketkeeperId; }
    public void setWicketkeeperId(String wicketkeeperId) { this.wicketkeeperId = wicketkeeperId; }
}
