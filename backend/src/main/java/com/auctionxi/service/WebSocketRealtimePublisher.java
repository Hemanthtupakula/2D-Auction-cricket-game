package com.auctionxi.service;

import com.auctionxi.model.dto.AllocationStateDto;
import com.auctionxi.model.dto.AuctionBidDto;
import com.auctionxi.model.dto.RoomStateSnapshotDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class WebSocketRealtimePublisher implements RealtimePublisher {
    private static final Logger log = LoggerFactory.getLogger(WebSocketRealtimePublisher.class);

    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public WebSocketRealtimePublisher(@Autowired(required = false) SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void broadcastAllocationState(String roomCode, AllocationStateDto state) {
        log.info("Broadcasting allocation state for room {} (version {})", roomCode, state.version());
        if (messagingTemplate != null) {
            messagingTemplate.convertAndSend("/topic/room/" + roomCode.toUpperCase() + "/allocation", state);
        }
    }

    @Override
    public void broadcastSystemAlert(String roomCode, String message) {
        log.info("Broadcasting alert to room {}: {}", roomCode, message);
        if (messagingTemplate != null) {
            messagingTemplate.convertAndSend(
                    "/topic/room/" + roomCode.toUpperCase() + "/alerts",
                    Map.of("message", message, "timestamp", System.currentTimeMillis())
            );
        }
    }

    @Override
    public void broadcastRoomState(String roomCode, RoomStateSnapshotDto snapshot) {
        log.info("Broadcasting authoritative room snapshot for room {} (status: {}, version {})",
                roomCode, snapshot.status(), snapshot.version());
        if (messagingTemplate != null) {
            messagingTemplate.convertAndSend("/topic/room/" + roomCode.toUpperCase() + "/state", snapshot);
        }
    }

    @Override
    public void broadcastAuctionEvent(String roomCode, String eventType, Object payload) {
        log.info("Broadcasting auction event {} to room {}", eventType, roomCode);
        if (messagingTemplate != null) {
            messagingTemplate.convertAndSend(
                    "/topic/room/" + roomCode.toUpperCase() + "/auction",
                    Map.of("eventType", eventType, "payload", payload, "timestamp", System.currentTimeMillis())
            );
        }
    }

    @Override
    public void broadcastBid(String roomCode, AuctionBidDto bid) {
        log.info("Broadcasting bid of ₹{} L by {} ({}) to room {}",
                bid.amountLakhs(), bid.displayName(), bid.franchiseCode(), roomCode);
        if (messagingTemplate != null) {
            messagingTemplate.convertAndSend("/topic/room/" + roomCode.toUpperCase() + "/bids", bid);
        }
    }
}
