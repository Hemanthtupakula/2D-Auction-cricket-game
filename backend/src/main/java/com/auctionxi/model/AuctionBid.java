package com.auctionxi.model;

import java.time.Instant;

public record AuctionBid(
        String franchiseCode,
        String franchiseName,
        String memberId,
        String displayName,
        long amountLakhs,
        Instant timestamp
) {}
