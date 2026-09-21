package com.auctionxi.model.dto;

import com.auctionxi.model.MemberRole;
import com.auctionxi.model.RoomMember;

import java.util.List;

public record RoomMemberDto(
        String memberId,
        String displayName,
        MemberRole role,
        boolean isHost,
        int recommendedQuota,
        int requestedQuota,
        int targetQuota,
        int heldCount,
        List<String> ownedFranchises
) {
    public static RoomMemberDto from(RoomMember member, int recommendedQuota, List<String> ownedFranchises) {
        int target = member.getRequestedQuota() > 0 ? member.getRequestedQuota() : recommendedQuota;
        return new RoomMemberDto(
                member.getMemberId(),
                member.getDisplayName(),
                member.getRole(),
                member.isHost(),
                recommendedQuota,
                member.getRequestedQuota(),
                target,
                ownedFranchises.size(),
                ownedFranchises
        );
    }
}
