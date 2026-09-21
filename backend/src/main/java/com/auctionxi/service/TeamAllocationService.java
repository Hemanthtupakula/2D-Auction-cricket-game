package com.auctionxi.service;

import com.auctionxi.model.AuctionRoom;
import com.auctionxi.model.FranchiseSeat;
import com.auctionxi.model.dto.AllocationStateDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class TeamAllocationService extends FairFranchiseAllocationService {

    public TeamAllocationService(RoomStore roomStore, RealtimePublisher realtimePublisher) {
        super(roomStore, realtimePublisher);
    }

    public AllocationStateDto joinRoom(String roomCode, String displayName) {
        return handleMemberJoin(roomCode, displayName);
    }

    public AllocationStateDto handleMemberLeft(String roomCode, String memberId) {
        return handleMemberLeave(roomCode, memberId);
    }

    public AllocationStateDto switchFranchise(String roomCode, String memberId, String oldCode, String newCode) {
        return changeFranchise(roomCode, memberId, oldCode, newCode);
    }

    public AllocationStateDto lockAndStartAuction(String roomCode, String hostMemberId) {
        return lockAllocation(roomCode, hostMemberId);
    }

    public int calculateMemberQuota(int memberIndex, int totalHumanMembers) {
        return calculateRecommendedAllocation(memberIndex, totalHumanMembers);
    }

    public AllocationStateDto rebalanceMemberTeams(String roomCode, String memberId, List<String> franchisesToKeep) {
        AllocationStateDto state = getAllocationState(roomCode);
        Set<String> keep = new HashSet<>(franchisesToKeep);
        for (var seat : state.seats()) {
            if (memberId.equals(seat.ownerMemberId()) && !keep.contains(seat.code())) {
                releaseFranchise(roomCode, memberId, seat.code());
            }
        }
        return getAllocationState(roomCode);
    }
}
