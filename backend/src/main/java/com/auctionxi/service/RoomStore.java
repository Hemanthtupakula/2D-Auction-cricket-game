package com.auctionxi.service;

import com.auctionxi.model.AuctionRoom;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RoomStore {
    private final Map<String, AuctionRoom> roomsById = new ConcurrentHashMap<>();
    private final Map<String, String> idByRoomCode = new ConcurrentHashMap<>();
    private final com.auctionxi.persistence.AuctionPersistenceService auctionPersistenceService;

    public RoomStore() {
        this(null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public RoomStore(@org.springframework.lang.Nullable com.auctionxi.persistence.AuctionPersistenceService auctionPersistenceService) {
        this.auctionPersistenceService = auctionPersistenceService;
    }

    public void save(AuctionRoom room) {
        roomsById.put(room.getRoomId(), room);
        idByRoomCode.put(room.getRoomCode().toUpperCase(), room.getRoomId());
        if (auctionPersistenceService != null) {
            auctionPersistenceService.saveRoom(room);
        }
    }

    /** All live rooms — used by the server-side deadline ticker. */
    public java.util.Collection<AuctionRoom> findAll() {
        return roomsById.values();
    }

    public Optional<AuctionRoom> findById(String roomId) {
        if (roomId == null) return Optional.empty();
        return Optional.ofNullable(roomsById.get(roomId));
    }

    public Optional<AuctionRoom> findByCode(String roomCode) {
        if (roomCode == null) return Optional.empty();
        String id = idByRoomCode.get(roomCode.trim().toUpperCase());
        if (id == null) return Optional.empty();
        return findById(id);
    }

    public void remove(String roomId) {
        AuctionRoom removed = roomsById.remove(roomId);
        if (removed != null) {
            idByRoomCode.remove(removed.getRoomCode().toUpperCase());
        }
    }

    public void clear() {
        roomsById.clear();
        idByRoomCode.clear();
    }
}
