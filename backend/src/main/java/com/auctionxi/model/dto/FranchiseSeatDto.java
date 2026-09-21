package com.auctionxi.model.dto;

import com.auctionxi.model.FranchiseOwnerType;
import com.auctionxi.model.FranchiseSeat;

public record FranchiseSeatDto(
        String code,
        String name,
        String primaryColor,
        String secondaryColor,
        String city,
        FranchiseOwnerType ownerType,
        String ownerMemberId,
        String ownerDisplayName,
        boolean isOpen,
        boolean isHuman,
        boolean isInactive
) {
    public static FranchiseSeatDto from(FranchiseSeat seat) {
        return new FranchiseSeatDto(
                seat.getFranchiseCode(),
                seat.getFranchiseName(),
                seat.getFranchise().getPrimaryColor(),
                seat.getFranchise().getSecondaryColor(),
                seat.getFranchise().getCity(),
                seat.getOwnerType(),
                seat.getOwnerMemberId(),
                seat.getOwnerDisplayName(),
                seat.isOpen(),
                seat.isHuman(),
                seat.isInactive()
        );
    }
}
