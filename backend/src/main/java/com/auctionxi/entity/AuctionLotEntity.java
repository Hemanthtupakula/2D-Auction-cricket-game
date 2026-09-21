package com.auctionxi.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "auction_lots")
public class AuctionLotEntity {

    @Id
    @Column(name = "lot_id", length = 64)
    private String lotId;

    @Column(name = "auction_session_id", nullable = false, length = 64)
    private String auctionSessionId;

    @Column(name = "player_id", nullable = false, length = 64)
    private String playerId;

    @Column(name = "sequence_no", nullable = false)
    private long sequenceNo;

    @Column(name = "category", length = 30)
    private String category;

    @Column(name = "category_name", length = 100)
    private String categoryName;

    @Column(name = "base_price_lakhs", nullable = false)
    private long basePriceLakhs;

    @Column(name = "current_bid_lakhs", nullable = false)
    private long currentBidLakhs;

    @Column(name = "highest_bidder_franchise", length = 10)
    private String highestBidderFranchise;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "opened_at")
    private Instant openedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    public AuctionLotEntity() {}

    public String getLotId() { return lotId; }
    public void setLotId(String lotId) { this.lotId = lotId; }

    public String getAuctionSessionId() { return auctionSessionId; }
    public void setAuctionSessionId(String auctionSessionId) { this.auctionSessionId = auctionSessionId; }

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }

    public long getSequenceNo() { return sequenceNo; }
    public void setSequenceNo(long sequenceNo) { this.sequenceNo = sequenceNo; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public long getBasePriceLakhs() { return basePriceLakhs; }
    public void setBasePriceLakhs(long basePriceLakhs) { this.basePriceLakhs = basePriceLakhs; }

    public long getCurrentBidLakhs() { return currentBidLakhs; }
    public void setCurrentBidLakhs(long currentBidLakhs) { this.currentBidLakhs = currentBidLakhs; }

    public String getHighestBidderFranchise() { return highestBidderFranchise; }
    public void setHighestBidderFranchise(String highestBidderFranchise) { this.highestBidderFranchise = highestBidderFranchise; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getOpenedAt() { return openedAt; }
    public void setOpenedAt(Instant openedAt) { this.openedAt = openedAt; }

    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }
}
