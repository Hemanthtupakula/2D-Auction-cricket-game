package com.auctionxi.model.dto;

import com.auctionxi.model.Player;
import com.auctionxi.model.RoomStatus;
import java.util.List;
import java.util.Map;

public record RoomStateSnapshotDto(
        String roomCode,
        String roomName,
        String hostMemberId,
        RoomStatus status,
        long version,
        AllocationStateDto allocation,
        AuctionLotDto currentLot,
        Map<String, FranchiseAuctionStateDto> franchises,
        List<AuctionLotDto> completedLots,
        boolean isPaused,
        long startingPurseLakhs,
        long serverNowEpochMillis,
        String currentCategory,
        String currentCategoryName,
        Integer categoryIndex,
        Integer totalCategories,
        Integer categoryPlayerCount,
        Integer categoryRemainingCount,
        Integer categoryCompletedCount,
        List<String> categoryConfirmedFranchises,
        Boolean categoryActive,
        List<Player> categoryPlayers,
        Map<String, List<String>> playerPreSkips,
        String championFranchise
) {}
