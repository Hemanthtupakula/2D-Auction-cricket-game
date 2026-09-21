package com.auctionxi.model.dto;

public record AuctionBidDto(
        String franchiseCode,
        String franchiseName,
        String memberId,
        String displayName,
        long amountLakhs,
        long timestampMillis
) {}
