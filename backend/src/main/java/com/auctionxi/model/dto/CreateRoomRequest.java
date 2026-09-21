package com.auctionxi.model.dto;

public record CreateRoomRequest(
        String roomName,
        String hostDisplayName,
        Long startingPurseLakhs
) {
    public CreateRoomRequest(String roomName, String hostDisplayName) {
        this(roomName, hostDisplayName, 10000L);
    }
}
