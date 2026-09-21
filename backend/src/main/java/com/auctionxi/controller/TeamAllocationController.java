package com.auctionxi.controller;

import com.auctionxi.auth.AuthService;
import com.auctionxi.service.RoomStore;
import com.auctionxi.exception.AllocationErrorCode;
import com.auctionxi.exception.AllocationException;
import com.auctionxi.model.AuctionRoom;
import com.auctionxi.model.dto.*;
import com.auctionxi.model.dto.FranchiseRequests.*;
import com.auctionxi.service.FairFranchiseAllocationService;
import com.auctionxi.service.LiveAuctionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
public class TeamAllocationController {

    private final FairFranchiseAllocationService allocationService;
    private final LiveAuctionService liveAuctionService;
    private final AuthService authService;
    private final RoomStore roomStore;

    @Autowired
    public TeamAllocationController(
            FairFranchiseAllocationService allocationService,
            @Autowired(required = false) LiveAuctionService liveAuctionService,
            @Autowired(required = false) AuthService authService,
            RoomStore roomStore
    ) {
        this.allocationService = allocationService;
        this.liveAuctionService = liveAuctionService;
        this.authService = authService;
        this.roomStore = roomStore;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createRoom(
            @RequestBody CreateRoomRequest req,
            @RequestHeader(value = "X-Auth-Token", required = false) String authToken
    ) {
        String memberOverride = authService != null ? authService.resolveMemberId(authToken) : null;
        AuctionRoom room = allocationService.createRoom(req.roomName(), req.hostDisplayName(), req.startingPurseLakhs(), memberOverride);
        AllocationStateDto state = allocationService.getAllocationState(room.getRoomCode());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "roomCode", room.getRoomCode(),
                "roomId", room.getRoomId(),
                "hostMemberId", room.getHostMemberId(),
                "state", state
        ));
    }

    @PostMapping("/join")
    public ResponseEntity<AllocationStateDto> joinRoom(
            @RequestBody JoinRoomRequest req,
            @RequestHeader(value = "X-Auth-Token", required = false) String authToken
    ) {
        String memberOverride = authService != null ? authService.resolveMemberId(authToken) : null;
        AllocationStateDto state = allocationService.handleMemberJoin(req.roomCode(), req.displayName(), memberOverride);
        return ResponseEntity.ok(state);
    }

    @GetMapping("/{roomCode}/allocation")
    public ResponseEntity<AllocationStateDto> getAllocationState(@PathVariable String roomCode) {
        return ResponseEntity.ok(allocationService.getAllocationState(roomCode));
    }

    @PostMapping("/{roomCode}/quota")
    public ResponseEntity<AllocationStateDto> setMemberRequestedQuota(
            @PathVariable String roomCode,
            @RequestBody SetQuotaRequest req
    ) {
        AllocationStateDto state = allocationService.setMemberRequestedQuota(roomCode, req.memberId(), req.requestedQuota());
        return ResponseEntity.ok(state);
    }

    @PostMapping("/{roomCode}/apply-recommended")
    public ResponseEntity<AllocationStateDto> applyRecommendedAllocation(@PathVariable String roomCode) {
        AllocationStateDto state = allocationService.applyRecommendedAllocation(roomCode);
        return ResponseEntity.ok(state);
    }

    @PostMapping("/{roomCode}/claim")
    public ResponseEntity<AllocationStateDto> claimFranchise(
            @PathVariable String roomCode,
            @RequestBody ClaimFranchiseRequest req
    ) {
        AllocationStateDto state = allocationService.claimFranchise(roomCode, req.memberId(), req.franchiseCode());
        return ResponseEntity.ok(state);
    }

    @PostMapping("/{roomCode}/release")
    public ResponseEntity<AllocationStateDto> releaseFranchise(
            @PathVariable String roomCode,
            @RequestBody ReleaseFranchiseRequest req
    ) {
        AllocationStateDto state = allocationService.releaseFranchise(roomCode, req.memberId(), req.franchiseCode());
        return ResponseEntity.ok(state);
    }

    @PostMapping("/{roomCode}/switch")
    public ResponseEntity<AllocationStateDto> switchFranchise(
            @PathVariable String roomCode,
            @RequestBody SwitchFranchiseRequest req
    ) {
        AllocationStateDto state = allocationService.changeFranchise(
                roomCode, req.memberId(), req.currentFranchiseCode(), req.newFranchiseCode()
        );
        return ResponseEntity.ok(state);
    }

    @PostMapping("/{roomCode}/leave")
    public ResponseEntity<AllocationStateDto> leaveRoom(
            @PathVariable String roomCode,
            @RequestParam String memberId
    ) {
        AllocationStateDto state = allocationService.handleMemberLeave(roomCode, memberId);
        return ResponseEntity.ok(state);
    }

    /** The host can delete a room they created — e.g. clear an old paused game and start fresh. */
    @DeleteMapping("/{roomCode}")
    public ResponseEntity<Map<String, String>> deleteRoom(
            @PathVariable String roomCode,
            @RequestParam(required = false) String memberId,
            @RequestHeader(value = "X-Auth-Token", required = false) String authToken
    ) {
        AuctionRoom room = roomStore.findByCode(roomCode)
                .orElseThrow(() -> new AllocationException(AllocationErrorCode.ROOM_NOT_FOUND, "Room not found: " + roomCode));
        String authMember = authService != null ? authService.resolveMemberId(authToken) : null;
        String effective = authMember != null ? authMember : memberId;
        if (effective == null || !effective.equals(room.getHostMemberId())) {
            throw new AllocationException(AllocationErrorCode.NOT_ROOM_HOST, "Only the room host can delete this room.");
        }
        roomStore.remove(room.getRoomId());
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @PostMapping("/{roomCode}/lock-start")
    public ResponseEntity<AllocationStateDto> lockAndStartAuction(
            @PathVariable String roomCode,
            @RequestBody LockStartRequest req
    ) {
        if (liveAuctionService != null) {
            liveAuctionService.startAuction(roomCode, req.hostMemberId());
        } else {
            allocationService.lockAllocation(roomCode, req.hostMemberId());
        }
        AllocationStateDto state = allocationService.getAllocationState(roomCode);
        return ResponseEntity.ok(state);
    }

    @ExceptionHandler(AllocationException.class)
    public ResponseEntity<Map<String, Object>> handleAllocationException(AllocationException ex) {
        HttpStatus status = switch (ex.getErrorCode()) {
            case ROOM_NOT_FOUND, MEMBER_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case FRANCHISE_ALREADY_TAKEN, REBALANCE_REQUIRED, AUCTION_ALREADY_STARTED -> HttpStatus.CONFLICT;
            case QUOTA_EXCEEDED, NOT_FRANCHISE_OWNER, INVALID_REBALANCE_SELECTION, UNOWNED_FRANCHISES_REMAIN, QUOTA_INCOMPLETE, INVALID_REQUEST -> HttpStatus.BAD_REQUEST;
            case NOT_ROOM_HOST -> HttpStatus.FORBIDDEN;
            default -> HttpStatus.BAD_REQUEST;
        };

        return ResponseEntity.status(status).body(Map.of(
                "errorCode", ex.getErrorCode().name(),
                "message", ex.getMessage(),
                "timestamp", System.currentTimeMillis()
        ));
    }
}
