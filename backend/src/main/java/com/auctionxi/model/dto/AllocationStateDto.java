package com.auctionxi.model.dto;

import com.auctionxi.model.RoomStatus;

import java.util.List;

public record AllocationStateDto(
        String roomId,
        String roomCode,
        String roomName,
        RoomStatus status,
        String hostMemberId,
        int humanMemberCount,
        int openTeamCount,
        int claimedTeamCount,
        boolean readyToLock,
        boolean canStartAuction,
        String validationMessage,
        int totalRequestedQuota,
        boolean rebalanceRequired,
        List<FranchiseSeatDto> seats,
        List<RoomMemberDto> members,
        List<String> activityFeed,
        long version
) {
}
