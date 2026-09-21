package com.auctionxi.model.dto;

import java.util.List;

public class FranchiseRequests {
    public record ClaimFranchiseRequest(
            String memberId,
            String franchiseCode
    ) {}

    public record ReleaseFranchiseRequest(
            String memberId,
            String franchiseCode
    ) {}

    public record SwitchFranchiseRequest(
            String memberId,
            String currentFranchiseCode,
            String newFranchiseCode
    ) {}

    public record SetQuotaRequest(
            String memberId,
            int requestedQuota
    ) {}

    public record RebalanceHostRequest(
            String hostMemberId,
            List<String> franchisesToKeep
    ) {}

    public record LockStartRequest(
            String hostMemberId
    ) {}
}
