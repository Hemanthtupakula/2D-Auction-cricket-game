package com.auctionxi.model.dto;

import com.auctionxi.model.Player;
import java.util.List;

public record FranchiseAuctionStateDto(
        String franchiseCode,
        String franchiseName,
        String ownerMemberId,
        String ownerDisplayName,
        boolean active,
        long purseLakhs,
        long spentLakhs,
        List<Player> squad,
        int squadSize,
        int overseasCount
) {}
