package com.auctionxi.model.dto;

import com.auctionxi.model.AuctionPhase;
import com.auctionxi.model.Player;
import java.util.List;
import java.util.Set;

public record AuctionLotDto(
        int lotNumber,
        Player player,
        long basePriceLakhs,
        long currentBidLakhs,
        String highestBidderFranchise,
        String highestBidderName,
        String highestBidderMemberId,
        long deadlineEpochMillis,
        AuctionPhase phase,
        List<AuctionBidDto> bidHistory,
        Set<String> skippedFranchises,
        boolean biddingOpen,
        long introductionDeadlineEpochMillis,
        boolean bypassed
) {}
