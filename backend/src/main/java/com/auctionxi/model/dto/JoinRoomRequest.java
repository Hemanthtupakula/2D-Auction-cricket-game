package com.auctionxi.model.dto;

public record JoinRoomRequest(
        String roomCode,
        String displayName
) {}
