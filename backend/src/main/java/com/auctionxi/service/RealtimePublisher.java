package com.auctionxi.service;

import com.auctionxi.model.dto.AllocationStateDto;
import com.auctionxi.model.dto.AuctionBidDto;
import com.auctionxi.model.dto.RoomStateSnapshotDto;

public interface RealtimePublisher {
    void broadcastAllocationState(String roomCode, AllocationStateDto state);
    void broadcastSystemAlert(String roomCode, String message);
    default void broadcastRoomState(String roomCode, RoomStateSnapshotDto snapshot) {}
    default void broadcastAuctionEvent(String roomCode, String eventType, Object payload) {}
    default void broadcastBid(String roomCode, AuctionBidDto bid) {}
}
