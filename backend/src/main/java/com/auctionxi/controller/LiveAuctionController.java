package com.auctionxi.controller;

import com.auctionxi.model.dto.AuctionRequests.*;
import com.auctionxi.model.dto.RoomStateSnapshotDto;
import com.auctionxi.service.LiveAuctionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms/{roomCode}")
public class LiveAuctionController {

    private final LiveAuctionService liveAuctionService;

    @Autowired
    public LiveAuctionController(LiveAuctionService liveAuctionService) {
        this.liveAuctionService = liveAuctionService;
    }

    @GetMapping("/state")
    public ResponseEntity<RoomStateSnapshotDto> getRoomSnapshot(@PathVariable String roomCode) {
        return ResponseEntity.ok(liveAuctionService.getRoomSnapshot(roomCode));
    }

    @PostMapping("/auction/start")
    public ResponseEntity<RoomStateSnapshotDto> startAuction(
            @PathVariable String roomCode,
            @RequestBody AuctionControlRequest req
    ) {
        return ResponseEntity.ok(liveAuctionService.startAuction(roomCode, req.hostMemberId()));
    }

    @PostMapping("/auction/draw")
    public ResponseEntity<RoomStateSnapshotDto> drawNextPlayer(
            @PathVariable String roomCode,
            @RequestBody DrawChitRequest req
    ) {
        return ResponseEntity.ok(liveAuctionService.drawNextPlayer(roomCode, req.hostMemberId()));
    }

    @PostMapping("/auction/bid")
    public ResponseEntity<RoomStateSnapshotDto> placeBid(
            @PathVariable String roomCode,
            @RequestBody PlaceBidRequest req
    ) {
        return ResponseEntity.ok(liveAuctionService.placeBid(roomCode, req.memberId(), req.franchiseCode(), req.amountLakhs()));
    }

    @PostMapping("/auction/finalize")
    public ResponseEntity<RoomStateSnapshotDto> finalizeCurrentLot(@PathVariable String roomCode) {
        return ResponseEntity.ok(liveAuctionService.finalizeCurrentLot(roomCode));
    }

    @PostMapping("/auction/pause")
    public ResponseEntity<RoomStateSnapshotDto> pauseAuction(
            @PathVariable String roomCode,
            @RequestBody AuctionControlRequest req
    ) {
        return ResponseEntity.ok(liveAuctionService.pauseAuction(roomCode, req.hostMemberId()));
    }

    @PostMapping("/auction/resume")
    public ResponseEntity<RoomStateSnapshotDto> resumeAuction(
            @PathVariable String roomCode,
            @RequestBody AuctionControlRequest req
    ) {
        return ResponseEntity.ok(liveAuctionService.resumeAuction(roomCode, req.hostMemberId()));
    }

    @PostMapping("/auction/stop")
    public ResponseEntity<RoomStateSnapshotDto> stopAuction(
            @PathVariable String roomCode,
            @RequestBody AuctionControlRequest req
    ) {
        return ResponseEntity.ok(liveAuctionService.stopAuction(roomCode, req.hostMemberId()));
    }

    @PostMapping("/auction/proceed-category")
    public ResponseEntity<RoomStateSnapshotDto> proceedCategory(
            @PathVariable String roomCode,
            @RequestBody ProceedCategoryRequest req
    ) {
        return ResponseEntity.ok(liveAuctionService.proceedToCategory(roomCode, req.memberId(), req.franchiseCode()));
    }

    @PostMapping("/auction/skip")
    public ResponseEntity<RoomStateSnapshotDto> skipPlayer(
            @PathVariable String roomCode,
            @RequestBody SkipPlayerRequest req
    ) {
        return ResponseEntity.ok(liveAuctionService.skipPlayer(roomCode, req.memberId(), req.franchiseCode()));
    }

    @PostMapping("/auction/intro-complete")
    public ResponseEntity<RoomStateSnapshotDto> introComplete(
            @PathVariable String roomCode,
            @RequestBody IntroCompleteRequest req
    ) {
        return ResponseEntity.ok(liveAuctionService.introComplete(roomCode, req.memberId()));
    }

    @PostMapping("/auction/skip-category")
    public ResponseEntity<RoomStateSnapshotDto> skipCategory(
            @PathVariable String roomCode,
            @RequestBody AuctionControlRequest req
    ) {
        return ResponseEntity.ok(liveAuctionService.skipCategory(roomCode, req.hostMemberId()));
    }

    @PostMapping("/auction/pre-skip")
    public ResponseEntity<RoomStateSnapshotDto> preSkipPlayer(
            @PathVariable String roomCode,
            @RequestBody PreSkipPlayerRequest req
    ) {
        return ResponseEntity.ok(liveAuctionService.preSkipPlayer(roomCode, req.memberId(), req.franchiseCode(), req.playerId()));
    }
}
