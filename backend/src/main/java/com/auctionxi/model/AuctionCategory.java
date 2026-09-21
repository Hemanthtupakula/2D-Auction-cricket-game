package com.auctionxi.model;

import java.util.List;
import java.util.Set;

public record AuctionCategory(
        String code,
        String name,
        int sequence,
        List<String> playerIds,
        Set<String> remainingPlayerIds,
        int completedCount,
        int soldCount,
        int unsoldCount,
        boolean active,
        String status
) {}
