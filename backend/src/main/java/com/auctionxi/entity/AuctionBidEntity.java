package com.auctionxi.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "auction_bids")
public class AuctionBidEntity {

    @Id
    @Column(name = "bid_id", length = 64)
    private String bidId;

    @Column(name = "room_id", nullable = false, length = 64)
    private String roomId;

    @Column(name = "lot_id", length = 64)
    private String lotId;

    @Column(name = "player_id", nullable = false, length = 64)
    private String playerId;

    @Column(name = "franchise_code", nullable = false, length = 10)
    private String franchiseCode;

    @Column(name = "member_id", length = 64)
    private String memberId;

    @Column(name = "amount_lakhs", nullable = false)
    private long amountLakhs;

    @Column(name = "sequence_no", nullable = false)
    private long sequenceNo;

    @Column(name = "server_timestamp", nullable = false)
    private Instant serverTimestamp = Instant.now();

    public AuctionBidEntity() {}

    public String getBidId() { return bidId; }
    public void setBidId(String bidId) { this.bidId = bidId; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getLotId() { return lotId; }
    public void setLotId(String lotId) { this.lotId = lotId; }

    public String getPlayerId() { return playerId; }
    public void setPlayerId(String playerId) { this.playerId = playerId; }

    public String getFranchiseCode() { return franchiseCode; }
    public void setFranchiseCode(String franchiseCode) { this.franchiseCode = franchiseCode; }

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public long getAmountLakhs() { return amountLakhs; }
    public void setAmountLakhs(long amountLakhs) { this.amountLakhs = amountLakhs; }

    public long getSequenceNo() { return sequenceNo; }
    public void setSequenceNo(long sequenceNo) { this.sequenceNo = sequenceNo; }

    public Instant getServerTimestamp() { return serverTimestamp; }
    public void setServerTimestamp(Instant serverTimestamp) { this.serverTimestamp = serverTimestamp; }
}
