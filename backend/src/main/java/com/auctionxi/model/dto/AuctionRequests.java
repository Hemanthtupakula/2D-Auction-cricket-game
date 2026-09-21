package com.auctionxi.model.dto;

public class AuctionRequests {
    public record PlaceBidRequest(
            String memberId,
            String franchiseCode,
            long amountLakhs
    ) {}

    public record DrawChitRequest(
            String hostMemberId
    ) {}

    public record AuctionControlRequest(
            String hostMemberId
    ) {}

    public record ProceedCategoryRequest(
            String memberId,
            String franchiseCode
    ) {}

    public record SkipPlayerRequest(
            String memberId,
            String franchiseCode
    ) {}

    public record IntroCompleteRequest(
            String memberId
    ) {}

    public record PreSkipPlayerRequest(
            String memberId,
            String franchiseCode,
            String playerId
    ) {}
}
