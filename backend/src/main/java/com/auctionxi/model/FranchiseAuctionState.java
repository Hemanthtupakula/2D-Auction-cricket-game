package com.auctionxi.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class FranchiseAuctionState {
    private final String franchiseCode;
    private final String franchiseName;
    private String ownerMemberId;
    private String ownerDisplayName;
    private boolean active;
    private long purseLakhs;
    private long spentLakhs;
    private final List<Player> squad;
    private int overseasCount;

    public FranchiseAuctionState(Franchise franchise) {
        this(franchise, 10000L); // Default ₹100.00 Cr (10,000 Lakhs)
    }

    public FranchiseAuctionState(Franchise franchise, long startingPurseLakhs) {
        this.franchiseCode = franchise.getCode();
        this.franchiseName = franchise.getFullName();
        this.ownerMemberId = null;
        this.ownerDisplayName = null;
        this.active = false;
        this.purseLakhs = startingPurseLakhs > 0 ? startingPurseLakhs : 10000L;
        this.spentLakhs = 0L;
        this.squad = new ArrayList<>();
        this.overseasCount = 0;
    }

    public String getFranchiseCode() {
        return franchiseCode;
    }

    public String getFranchiseName() {
        return franchiseName;
    }

    public String getOwnerMemberId() {
        return ownerMemberId;
    }

    public void setOwnerMemberId(String ownerMemberId) {
        this.ownerMemberId = ownerMemberId;
    }

    public String getOwnerDisplayName() {
        return ownerDisplayName;
    }

    public void setOwnerDisplayName(String ownerDisplayName) {
        this.ownerDisplayName = ownerDisplayName;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public long getPurseLakhs() {
        return purseLakhs;
    }

    public void setPurseLakhs(long purseLakhs) {
        this.purseLakhs = purseLakhs;
    }

    public long getSpentLakhs() {
        return spentLakhs;
    }

    public void setSpentLakhs(long spentLakhs) {
        this.spentLakhs = spentLakhs;
    }

    public List<Player> getSquad() {
        return Collections.unmodifiableList(squad);
    }

    public int getOverseasCount() {
        return overseasCount;
    }

    public void addPlayer(Player player, long priceLakhs) {
        this.squad.add(player);
        this.purseLakhs -= priceLakhs;
        this.spentLakhs += priceLakhs;
        if (player.isOverseas()) {
            this.overseasCount++;
        }
    }
}
