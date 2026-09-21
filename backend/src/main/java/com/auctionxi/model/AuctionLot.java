package com.auctionxi.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class AuctionLot {
    private final int lotNumber;
    private final Player player;
    private final long basePriceLakhs;
    private long currentBidLakhs;
    private String highestBidderFranchise;
    private String highestBidderName;
    private String highestBidderMemberId;
    private long deadlineEpochMillis;
    private AuctionPhase phase;
    private final List<AuctionBid> bidHistory;
    private final Set<String> skippedFranchises;
    private boolean biddingOpen;
    private long introductionDeadlineEpochMillis;
    private boolean bypassed;

    public AuctionLot(int lotNumber, Player player) {
        this.lotNumber = lotNumber;
        this.player = player;
        long rawPrice = player.getBasePrice();
        if (rawPrice >= 100_000L) {
            this.basePriceLakhs = rawPrice / 100_000L;
        } else if (rawPrice > 0) {
            this.basePriceLakhs = rawPrice;
        } else {
            this.basePriceLakhs = 50L;
        }
        this.currentBidLakhs = this.basePriceLakhs;
        this.highestBidderFranchise = null;
        this.highestBidderName = null;
        this.highestBidderMemberId = null;
        this.deadlineEpochMillis = 0L;
        this.phase = AuctionPhase.REVEALING;
        this.bidHistory = new ArrayList<>();
        this.skippedFranchises = ConcurrentHashMap.newKeySet();
        this.biddingOpen = false;
        this.introductionDeadlineEpochMillis = 0L;
        this.bypassed = false;
    }

    public int getLotNumber() {
        return lotNumber;
    }

    public Player getPlayer() {
        return player;
    }

    public long getBasePriceLakhs() {
        return basePriceLakhs;
    }

    public long getCurrentBidLakhs() {
        return currentBidLakhs;
    }

    public void setCurrentBidLakhs(long currentBidLakhs) {
        this.currentBidLakhs = currentBidLakhs;
    }

    public String getHighestBidderFranchise() {
        return highestBidderFranchise;
    }

    public void setHighestBidderFranchise(String highestBidderFranchise) {
        this.highestBidderFranchise = highestBidderFranchise;
    }

    public String getHighestBidderName() {
        return highestBidderName;
    }

    public void setHighestBidderName(String highestBidderName) {
        this.highestBidderName = highestBidderName;
    }

    public String getHighestBidderMemberId() {
        return highestBidderMemberId;
    }

    public void setHighestBidderMemberId(String highestBidderMemberId) {
        this.highestBidderMemberId = highestBidderMemberId;
    }

    public long getDeadlineEpochMillis() {
        return deadlineEpochMillis;
    }

    public void setDeadlineEpochMillis(long deadlineEpochMillis) {
        this.deadlineEpochMillis = deadlineEpochMillis;
    }

    public AuctionPhase getPhase() {
        return phase;
    }

    public void setPhase(AuctionPhase phase) {
        this.phase = phase;
    }

    public List<AuctionBid> getBidHistory() {
        return Collections.unmodifiableList(bidHistory);
    }

    public void addBid(AuctionBid bid) {
        this.bidHistory.add(0, bid);
        this.currentBidLakhs = bid.amountLakhs();
        this.highestBidderFranchise = bid.franchiseCode();
        this.highestBidderName = bid.displayName();
        this.highestBidderMemberId = bid.memberId();
    }

    public boolean addSkip(String franchiseCode) {
        if (franchiseCode == null) return false;
        return this.skippedFranchises.add(franchiseCode.toUpperCase());
    }

    public boolean addSkippedFranchise(String franchiseCode) {
        return addSkip(franchiseCode);
    }

    public void clearSkips() {
        this.skippedFranchises.clear();
    }

    public boolean hasSkipped(String franchiseCode) {
        if (franchiseCode == null) return false;
        return this.skippedFranchises.contains(franchiseCode.toUpperCase());
    }

    public Set<String> getSkippedFranchises() {
        return Collections.unmodifiableSet(skippedFranchises);
    }

    public boolean isBiddingOpen() {
        return biddingOpen;
    }

    public void setBiddingOpen(boolean biddingOpen) {
        this.biddingOpen = biddingOpen;
    }

    public long getIntroductionDeadlineEpochMillis() {
        return introductionDeadlineEpochMillis;
    }

    public boolean isBypassed() {
        return bypassed;
    }

    public void setBypassed(boolean bypassed) {
        this.bypassed = bypassed;
    }

    public void setIntroductionDeadlineEpochMillis(long introductionDeadlineEpochMillis) {
        this.introductionDeadlineEpochMillis = introductionDeadlineEpochMillis;
    }
}
