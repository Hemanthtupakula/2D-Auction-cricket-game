package com.auctionxi.service;

import com.auctionxi.exception.AllocationErrorCode;
import com.auctionxi.exception.AllocationException;
import com.auctionxi.model.*;
import com.auctionxi.model.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.stream.Collectors;

@Service
public class LiveAuctionService {
    private static final Logger log = LoggerFactory.getLogger(LiveAuctionService.class);

    // ===== Auction Engine V2 timing (Phase 5) =====
    public static final long OPEN_BIDDING_MS = 10_000L;   // floor open: 10s, refreshed by every new highest bid
    public static final long CALL_STAGE_MS = 5_000L;      // GOING_ONCE / GOING_TWICE / THIRD_CALL: exactly 5s each
    public static final int MIN_SKIP_VOTES = 2;           // a lot can only be bypassed if >= 2 real people voted skip

    private final RoomStore roomStore;
    private final PlayerDataService playerDataService;
    private final RealtimePublisher realtimePublisher;
    private final FairFranchiseAllocationService allocationService;
    private final com.auctionxi.persistence.AuctionPersistenceService auctionPersistenceService;

    public LiveAuctionService(
            RoomStore roomStore,
            PlayerDataService playerDataService,
            RealtimePublisher realtimePublisher,
            FairFranchiseAllocationService allocationService
    ) {
        this(roomStore, playerDataService, realtimePublisher, allocationService, null);
    }

    @Autowired
    public LiveAuctionService(
            RoomStore roomStore,
            PlayerDataService playerDataService,
            RealtimePublisher realtimePublisher,
            FairFranchiseAllocationService allocationService,
            @org.springframework.lang.Nullable com.auctionxi.persistence.AuctionPersistenceService auctionPersistenceService
    ) {
        this.roomStore = roomStore;
        this.playerDataService = playerDataService;
        this.realtimePublisher = realtimePublisher;
        this.allocationService = allocationService;
        this.auctionPersistenceService = auctionPersistenceService;
    }

    // ===== Server-side deadline ticker =====
    // Phase transitions must not depend on clients polling: the server advances lot
    // timers itself every 500ms, so the 10s/5s phases and SOLD/UNSOLD fire exactly on
    // time even if a client's socket hiccups.
    private final ScheduledExecutorService deadlineTicker = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "auction-deadline-ticker");
        t.setDaemon(true);
        return t;
    });

    @PostConstruct
    public void startDeadlineTicker() {
        deadlineTicker.scheduleWithFixedDelay(this::tickAllRooms, 500L, 500L, TimeUnit.MILLISECONDS);
    }

    @PreDestroy
    public void stopDeadlineTicker() {
        deadlineTicker.shutdownNow();
    }

    private void tickAllRooms() {
        for (AuctionRoom room : roomStore.findAll()) {
            if (room.getStatus() != RoomStatus.AUCTION_ACTIVE || room.isPaused()) {
                continue;
            }
            try {
                room.getLock().lock();
                try {
                    checkDeadlineExpiredInternal(room);
                } finally {
                    room.getLock().unlock();
                }
            } catch (Exception e) {
                log.warn("Deadline tick failed for room {}: {}", room.getRoomCode(), e.getMessage());
            }
        }
    }

    public RoomStateSnapshotDto getRoomSnapshot(String roomCode) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            // Check if active lot's deadline has expired and auto-finalize
            checkDeadlineExpiredInternal(room);
            return buildSnapshot(room);
        } finally {
            room.getLock().unlock();
        }
    }

    public RoomStateSnapshotDto startAuction(String roomCode, String hostMemberId) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            // 1. Validate & Lock allocation (freezes seats, sets inactive, sets status AUCTION_ACTIVE)
            allocationService.lockAllocation(roomCode, hostMemberId);

            // 2. Initialize franchise auction states based on human claimed seats
            for (FranchiseSeat seat : room.getSeats().values()) {
                FranchiseAuctionState fState = room.getFranchiseAuctionState(seat.getFranchiseCode());
                if (fState != null) {
                    if (seat.isHuman()) {
                        fState.setOwnerMemberId(seat.getOwnerMemberId());
                        fState.setOwnerDisplayName(seat.getOwnerDisplayName());
                        fState.setActive(true);
                    } else {
                        fState.setActive(false);
                    }
                }
            }

            // 3. Initialize category progression
            initRoomCategories(room);

            room.incrementVersion();
            RoomStateSnapshotDto snapshot = buildSnapshot(room);

            // 4. Broadcast state & events to all connected clients
            realtimePublisher.broadcastRoomState(room.getRoomCode(), snapshot);
            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "AUCTION_STARTED", snapshot);
            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "CATEGORY_PREVIEW", snapshot);

            log.info("Live Auction successfully started for room {}. Initial category: {}",
                    roomCode, room.getCurrentCategory());
            return snapshot;
        } finally {
            room.getLock().unlock();
        }
    }

    public RoomStateSnapshotDto proceedToCategory(String roomCode, String memberId, String franchiseCode) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            if (room.getStatus() != RoomStatus.AUCTION_ACTIVE) {
                throw new AllocationException(AllocationErrorCode.ROOM_NOT_MUTABLE, "Auction is not active.");
            }

            if (franchiseCode != null && !franchiseCode.isBlank()) {
                FranchiseAuctionState fState = room.getFranchiseAuctionState(franchiseCode);
                if (fState != null && fState.isActive() && memberId.equals(fState.getOwnerMemberId())) {
                    room.confirmFranchiseForCategory(franchiseCode);
                }
            }

            // Determine if all active human franchises have confirmed
            Set<String> activeFranchises = room.getFranchiseAuctionStates().values().stream()
                    .filter(FranchiseAuctionState::isActive)
                    .map(FranchiseAuctionState::getFranchiseCode)
                    .collect(Collectors.toSet());

            boolean allConfirmed = !activeFranchises.isEmpty() && room.getCategoryConfirmedFranchises().containsAll(activeFranchises);
            boolean isHost = memberId.equals(room.getHostMemberId());

            if (allConfirmed || isHost) {
                room.setCategoryActive(true);
                // If no lot on block, draw first lot of category
                if (room.getCurrentLot() == null || room.getCurrentLot().getPhase() == AuctionPhase.SOLD || room.getCurrentLot().getPhase() == AuctionPhase.UNSOLD) {
                    drawNextPlayerInternal(room);
                }
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "CATEGORY_STARTED", Map.of(
                        "category", room.getCurrentCategory() != null ? room.getCurrentCategory() : "",
                        "categoryName", room.getCurrentCategoryName() != null ? room.getCurrentCategoryName() : ""
                ));
            }

            room.incrementVersion();
            RoomStateSnapshotDto snapshot = buildSnapshot(room);
            realtimePublisher.broadcastRoomState(room.getRoomCode(), snapshot);
            return snapshot;
        } finally {
            room.getLock().unlock();
        }
    }

    public RoomStateSnapshotDto drawNextPlayer(String roomCode, String hostMemberId) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            if (room.getStatus() != RoomStatus.AUCTION_ACTIVE) {
                throw new AllocationException(AllocationErrorCode.ROOM_NOT_MUTABLE, "Auction is not active.");
            }
            if (!hostMemberId.equals(room.getHostMemberId())) {
                throw new AllocationException(AllocationErrorCode.NOT_ROOM_HOST, "Only the host/auctioneer can draw the next chit.");
            }

            // Host calling draw automatically activates the category if previewing
            if (!room.isCategoryActive()) {
                room.setCategoryActive(true);
            }

            // Idempotency check: if current lot is active and deadline not expired, return existing
            if (room.getCurrentLot() != null) {
                AuctionPhase phase = room.getCurrentLot().getPhase();
                if (phase == AuctionPhase.BIDDING || phase == AuctionPhase.REVEALING || phase == AuctionPhase.GOING_ONCE || phase == AuctionPhase.GOING_TWICE || phase == AuctionPhase.THIRD_CALL) {
                    long now = System.currentTimeMillis();
                    if (now < room.getCurrentLot().getDeadlineEpochMillis()) {
                        log.info("Idempotent draw request for room {}: current lot {} is already active.",
                                roomCode, room.getCurrentLot().getLotNumber());
                        return buildSnapshot(room);
                    } else {
                        // Deadline has passed: finalize current lot first
                        finalizeCurrentLotInternal(room);
                    }
                }
            }

            // Draw next player server-side from active category
            boolean hasPlayer = drawNextPlayerInternal(room);
            if (!hasPlayer) {
                if (room.getStatus() != RoomStatus.COMPLETED) {
                    // Category finished, wait for proceed to next category
                    log.info("Category {} complete for room {}. Waiting for next category.", room.getCurrentCategory(), roomCode);
                }
            }

            room.incrementVersion();
            RoomStateSnapshotDto snapshot = buildSnapshot(room);

            realtimePublisher.broadcastRoomState(room.getRoomCode(), snapshot);
            if (snapshot.currentLot() != null) {
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "PLAYER_REVEALED", snapshot.currentLot());
            }

            return snapshot;
        } finally {
            room.getLock().unlock();
        }
    }

    public RoomStateSnapshotDto introComplete(String roomCode, String memberId) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            AuctionLot currentLot = room.getCurrentLot();
            if (currentLot != null && currentLot.getPhase() == AuctionPhase.REVEALING) {
                currentLot.setPhase(AuctionPhase.BIDDING);
                currentLot.setBiddingOpen(true);
                currentLot.setDeadlineEpochMillis(System.currentTimeMillis() + OPEN_BIDDING_MS); // 10s open bidding window

                room.incrementVersion();
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "BIDDING_OPENED", toLotDto(currentLot));
                RoomStateSnapshotDto snapshot = buildSnapshot(room);
                realtimePublisher.broadcastRoomState(room.getRoomCode(), snapshot);
                return snapshot;
            }
            return buildSnapshot(room);
        } finally {
            room.getLock().unlock();
        }
    }

    public RoomStateSnapshotDto skipPlayer(String roomCode, String memberId, String franchiseCode) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            if (room.getStatus() != RoomStatus.AUCTION_ACTIVE || room.isPaused()) {
                throw new AllocationException(AllocationErrorCode.ROOM_NOT_MUTABLE, "Auction is currently paused or inactive.");
            }

            AuctionLot currentLot = room.getCurrentLot();
            if (currentLot == null || !isBiddablePhase(currentLot.getPhase())) {
                return buildSnapshot(room);
            }

            // User-based skip: apply skip vote to all active franchises owned by this member
            List<String> memberFranchises = room.getFranchiseAuctionStates().values().stream()
                    .filter(f -> f.isActive() && memberId.equals(f.getOwnerMemberId()))
                    .map(FranchiseAuctionState::getFranchiseCode)
                    .collect(Collectors.toList());

            if (memberFranchises.isEmpty() && franchiseCode != null && !franchiseCode.isBlank()) {
                memberFranchises = List.of(franchiseCode);
            }

            for (String fCode : memberFranchises) {
                currentLot.addSkippedFranchise(fCode);
            }

            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "PLAYER_SKIPPED", Map.of(
                    "memberId", memberId,
                    "franchiseCode", franchiseCode != null ? franchiseCode : "",
                    "lotNumber", currentLot.getLotNumber()
            ));

            // Check if all active human franchises skipped -> immediate UNSOLD!
            Set<String> activeFranchises = room.getFranchiseAuctionStates().values().stream()
                    .filter(FranchiseAuctionState::isActive)
                    .map(FranchiseAuctionState::getFranchiseCode)
                    .collect(Collectors.toSet());

            if (!activeFranchises.isEmpty()
                    && currentLot.getSkippedFranchises().containsAll(activeFranchises)
                    && currentLot.getSkippedFranchises().size() >= MIN_SKIP_VOTES) {
                if (currentLot.getHighestBidderFranchise() != null) {
                    // Bids exist: a unanimous skip means "end this lot now" — the player is
                    // SOLD to the current highest bidder (never silently voided), and the
                    // normal SOLD card + draw flow continues so everyone sees the result.
                    log.info("Lot #{} skip vote with active bids — fast-forwarding SOLD to {}.",
                            currentLot.getLotNumber(), currentLot.getHighestBidderFranchise());
                    realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "LOT_FAST_FORWARDED", Map.of(
                            "lot", toLotDto(currentLot),
                            "winner", currentLot.getHighestBidderFranchise()
                    ));
                    finalizeCurrentLotInternal(room);
                    return buildSnapshot(room);
                }
                log.info("Lot #{} unanimously bypassed by {} franchises. Instant UNSOLD + auto-advance.",
                        currentLot.getLotNumber(), currentLot.getSkippedFranchises().size());
                currentLot.setBypassed(true);
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "LOT_BYPASSED", Map.of(
                        "lot", toLotDto(currentLot),
                        "skipVotes", currentLot.getSkippedFranchises().size()
                ));
                finalizeCurrentLotInternal(room);
                // Bypass path must feel instant: auto-advance straight to the next lot (no cinematic delay)
                if (room.getStatus() == RoomStatus.AUCTION_ACTIVE && room.isCategoryActive()) {
                    boolean drawn = drawNextPlayerInternal(room);
                    if (drawn && room.getCurrentLot() != null) {
                        room.incrementVersion();
                        RoomStateSnapshotDto advanced = buildSnapshot(room);
                        realtimePublisher.broadcastRoomState(room.getRoomCode(), advanced);
                        realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "PLAYER_REVEALED", toLotDto(room.getCurrentLot()));
                        return advanced;
                    }
                }
                return buildSnapshot(room);
            }

            room.incrementVersion();
            RoomStateSnapshotDto snapshot = buildSnapshot(room);
            realtimePublisher.broadcastRoomState(room.getRoomCode(), snapshot);
            return snapshot;
        } finally {
            room.getLock().unlock();
        }
    }

    public RoomStateSnapshotDto preSkipPlayer(String roomCode, String memberId, String franchiseCode, String playerId) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            if (room.getStatus() != RoomStatus.AUCTION_ACTIVE) {
                throw new AllocationException(AllocationErrorCode.ROOM_NOT_MUTABLE, "Auction is not active.");
            }

            boolean isHost = memberId.equals(room.getHostMemberId());

            // User-based pre-skip: apply skip vote to all active franchises owned by this member
            List<String> memberFranchises = room.getFranchiseAuctionStates().values().stream()
                    .filter(f -> f.isActive() && memberId.equals(f.getOwnerMemberId()))
                    .map(FranchiseAuctionState::getFranchiseCode)
                    .collect(Collectors.toList());

            if (!memberFranchises.isEmpty()) {
                Set<String> existingPreSkips = room.getPreSkippedFranchises(playerId);
                boolean currentlySkipped = existingPreSkips.containsAll(memberFranchises);
                for (String fCode : memberFranchises) {
                    if (currentlySkipped) {
                        Set<String> set = room.getPlayerPreSkips().get(playerId);
                        if (set != null) set.remove(fCode);
                    } else {
                        room.togglePlayerPreSkip(playerId, fCode);
                    }
                }
            } else if (franchiseCode != null && !franchiseCode.isBlank()) {
                room.togglePlayerPreSkip(playerId, franchiseCode);
            } else if (isHost) {
                // Host bypassing player directly
                Set<String> activeFranchises = room.getFranchiseAuctionStates().values().stream()
                        .filter(FranchiseAuctionState::isActive)
                        .map(FranchiseAuctionState::getFranchiseCode)
                        .collect(Collectors.toSet());
                for (String f : activeFranchises) {
                    room.togglePlayerPreSkip(playerId, f);
                }
            }

            Set<String> activeFranchises = room.getFranchiseAuctionStates().values().stream()
                    .filter(FranchiseAuctionState::isActive)
                    .map(FranchiseAuctionState::getFranchiseCode)
                    .collect(Collectors.toSet());

            Set<String> skippedBy = room.getPreSkippedFranchises(playerId);
            boolean allSkipped = !activeFranchises.isEmpty() && skippedBy.containsAll(activeFranchises);

            if (allSkipped || (isHost && (franchiseCode == null || franchiseCode.isBlank()))) {
                // Bypass player from remaining draw pool & mark as UNSOLD
                room.getRemainingCategoryPlayerIds().remove(playerId);
                room.addAuctionedPlayerId(playerId);

                Player p = playerDataService.getPlayerById(playerId).orElse(null);
                String name = p != null ? p.getFullName() : playerId;

                if (p != null) {
                    int lotNum = room.getCompletedLots().size() + 1;
                    AuctionLot preUnsoldLot = new AuctionLot(lotNum, p);
                    preUnsoldLot.setPhase(AuctionPhase.UNSOLD);
                    room.addCompletedLot(preUnsoldLot);
                }

                room.addActivity(String.format("PRE-SKIPPED! %s was bypassed from auction block.", name));
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "PLAYER_PRE_SKIPPED", Map.of(
                        "playerId", playerId,
                        "playerName", name,
                        "byAll", true
                ));
            }

            room.incrementVersion();
            RoomStateSnapshotDto snapshot = buildSnapshot(room);
            realtimePublisher.broadcastRoomState(room.getRoomCode(), snapshot);
            return snapshot;
        } finally {
            room.getLock().unlock();
        }
    }

    public RoomStateSnapshotDto placeBid(String roomCode, String memberId, String franchiseCode, long amountLakhs) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            if (room.getStatus() != RoomStatus.AUCTION_ACTIVE || room.isPaused()) {
                throw new AllocationException(AllocationErrorCode.ROOM_NOT_MUTABLE, "Auction is currently paused or inactive.");
            }

            AuctionLot currentLot = room.getCurrentLot();
            if (currentLot == null || !isBiddablePhase(currentLot.getPhase())) {
                throw new AllocationException(AllocationErrorCode.ROOM_NOT_MUTABLE, "No player is currently open for bidding.");
            }

            // If bidding is not open yet because player introduction is in progress (REVEALING phase),
            // automatically open bidding immediately when an owner places a bid!
            if (!currentLot.isBiddingOpen() || currentLot.getPhase() == AuctionPhase.REVEALING) {
                currentLot.setBiddingOpen(true);
                currentLot.setPhase(AuctionPhase.BIDDING);
            }

            long now = System.currentTimeMillis();
            if (now >= currentLot.getDeadlineEpochMillis() && currentLot.getPhase() == AuctionPhase.THIRD_CALL) {
                finalizeCurrentLotInternal(room);
                throw new AllocationException(AllocationErrorCode.ROOM_NOT_MUTABLE, "Bidding for this lot has already closed.");
            }

            // 1. Validate member belongs to room
            RoomMember member = room.getMembers().get(memberId);
            if (member == null) {
                throw new AllocationException(AllocationErrorCode.MEMBER_NOT_FOUND, "Member not recognized in this room.");
            }

            // 2. Validate franchise ownership
            FranchiseAuctionState fState = room.getFranchiseAuctionState(franchiseCode);
            if (fState == null || !fState.isActive() || !memberId.equals(fState.getOwnerMemberId())) {
                throw new AllocationException(AllocationErrorCode.NOT_FRANCHISE_OWNER,
                        "You do not control franchise " + franchiseCode + ".");
            }

            // 3. Cannot bid against self
            if (franchiseCode.equalsIgnoreCase(currentLot.getHighestBidderFranchise())) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST,
                        franchiseCode + " already holds the highest bid.");
            }

            // 4. Validate bid amount & minimum increment
            long currentBid = currentLot.getCurrentBidLakhs();
            long minIncrement = calculateMinimumIncrement(currentBid);
            long minimumAllowed = currentLot.getHighestBidderFranchise() == null ? currentLot.getBasePriceLakhs() : currentBid + minIncrement;

            if (amountLakhs < minimumAllowed) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST,
                        String.format("Bid of ₹%.2f Cr is invalid. Minimum required bid is ₹%.2f Cr.",
                                amountLakhs / 100.0, minimumAllowed / 100.0));
            }

            // 5. Validate purse
            if (fState.getPurseLakhs() < amountLakhs) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST,
                        String.format("Insufficient purse! %s has ₹%.2f Cr remaining, cannot bid ₹%.2f Cr.",
                                franchiseCode, fState.getPurseLakhs() / 100.0, amountLakhs / 100.0));
            }

            // 6. Validate squad limits
            if (fState.getSquad().size() >= 25) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST,
                        franchiseCode + " has reached the maximum squad size of 25 players.");
            }

            // 7. Validate overseas quota
            if (currentLot.getPlayer().isOverseas() && fState.getOverseasCount() >= 8) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST,
                        franchiseCode + " has reached the maximum overseas player limit of 8.");
            }

            // Commit Bid (Auction Engine V2):
            // - During OPEN_BIDDING the 10s floor timer simply refreshes.
            // - During any call stage a new highest bid drops the lot back to GOING_ONCE (fresh 5s),
            //   so every remaining team gets a fair two-step chance before the hammer falls.
            AuctionPhase phaseBeforeBid = currentLot.getPhase();
            if (phaseBeforeBid != AuctionPhase.BIDDING) {
                currentLot.setPhase(AuctionPhase.GOING_ONCE);
            }
            currentLot.clearSkips();

            AuctionBid bid = new AuctionBid(
                    fState.getFranchiseCode(),
                    fState.getFranchiseName(),
                    member.getMemberId(),
                    member.getDisplayName(),
                    amountLakhs,
                    Instant.now()
            );
            currentLot.addBid(bid);
            if (auctionPersistenceService != null) {
                auctionPersistenceService.saveBid(room.getRoomId(), currentLot.getPlayer().getId(), bid);
            }

            // Timer rules: OPEN_BIDDING resets to a fresh 10s; call stages reset to GOING_ONCE + 5s
            if (phaseBeforeBid == AuctionPhase.BIDDING) {
                currentLot.setDeadlineEpochMillis(now + OPEN_BIDDING_MS);
            } else {
                currentLot.setDeadlineEpochMillis(now + CALL_STAGE_MS);
            }

            room.addActivity(String.format("Bid: %s (%s) bids ₹%.2f Cr for %s.",
                    fState.getFranchiseCode(), member.getDisplayName(), amountLakhs / 100.0, currentLot.getPlayer().getFullName()));

            room.incrementVersion();
            RoomStateSnapshotDto snapshot = buildSnapshot(room);
            AuctionBidDto bidDto = toBidDto(bid);

            realtimePublisher.broadcastBid(room.getRoomCode(), bidDto);
            if (phaseBeforeBid != AuctionPhase.BIDDING) {
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "GOING_ONCE", toLotDto(currentLot));
            }
            realtimePublisher.broadcastRoomState(room.getRoomCode(), snapshot);
            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "BID_PLACED", Map.of(
                    "lot", snapshot.currentLot(),
                    "bid", bidDto
            ));

            return snapshot;
        } finally {
            room.getLock().unlock();
        }
    }

    public RoomStateSnapshotDto finalizeCurrentLot(String roomCode) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            finalizeCurrentLotInternal(room);
            return buildSnapshot(room);
        } finally {
            room.getLock().unlock();
        }
    }

    /**
     * Phase 5, Section 4.2 — host-only category skip: bulk-bypass remaining lots, jump to next category.
     */
    public RoomStateSnapshotDto skipCategory(String roomCode, String hostMemberId) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            validateHost(room, hostMemberId);
            if (room.getStatus() != RoomStatus.AUCTION_ACTIVE) {
                throw new AllocationException(AllocationErrorCode.ROOM_NOT_MUTABLE, "Auction is not active.");
            }

            String skippedCategory = room.getCurrentCategory() != null ? room.getCurrentCategory() : "";
            String skippedCategoryName = room.getCurrentCategoryName() != null ? room.getCurrentCategoryName() : skippedCategory;

            int bypassedCount = 0;

            AuctionLot currentLot = room.getCurrentLot();
            if (currentLot != null && currentLot.getPhase() != AuctionPhase.SOLD && currentLot.getPhase() != AuctionPhase.UNSOLD) {
                currentLot.setBypassed(true);
                currentLot.setPhase(AuctionPhase.UNSOLD);
                room.addCompletedLot(currentLot);
                room.setCurrentLot(null);
                bypassedCount++;
            }

            for (String playerId : new ArrayList<>(room.getRemainingCategoryPlayerIds())) {
                Player p = playerDataService.getPlayerById(playerId).orElse(null);
                if (p == null) continue;
                room.getRemainingCategoryPlayerIds().remove(playerId);
                room.addAuctionedPlayerId(playerId);
                AuctionLot bypassedLot = new AuctionLot(room.getCompletedLots().size() + 1, p);
                bypassedLot.setPhase(AuctionPhase.UNSOLD);
                bypassedLot.setBypassed(true);
                room.addCompletedLot(bypassedLot);
                bypassedCount++;
            }

            room.addActivity(String.format("CATEGORY SKIPPED! Host bypassed %d remaining players in %s.", bypassedCount, skippedCategoryName));

            advanceToNextCategory(room);

            room.incrementVersion();
            RoomStateSnapshotDto snapshot = buildSnapshot(room);
            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "CATEGORY_SKIPPED", Map.of(
                    "skippedCategory", skippedCategory,
                    "skippedCategoryName", skippedCategoryName,
                    "bypassedCount", bypassedCount,
                    "nextCategory", room.getCurrentCategory() != null ? room.getCurrentCategory() : "",
                    "nextCategoryName", room.getCurrentCategoryName() != null ? room.getCurrentCategoryName() : ""
            ));
            realtimePublisher.broadcastRoomState(room.getRoomCode(), snapshot);
            return snapshot;
        } finally {
            room.getLock().unlock();
        }
    }

    /**
     * Advances the room to the next category in the sequence, or completes the auction
     * when every category has been exhausted. Shared by natural completion and host category-skip.
     */
    private void advanceToNextCategory(AuctionRoom room) {
        room.setCategoryActive(false);
        int nextIdx = room.getCurrentCategoryIndex() + 1;
        List<String> sequence = getCategorySequence();

        if (nextIdx < sequence.size()) {
            room.setCurrentCategoryIndex(nextIdx);
            String nextCat = sequence.get(nextIdx);
            room.setCurrentCategory(nextCat);
            room.setCurrentCategoryName(getCategoryDisplayName(nextCat));
            room.clearCategoryConfirmations();

            Set<String> nextCatPlayerIds = playerDataService.getAllPlayers().stream()
                    .filter(p -> nextCat.equalsIgnoreCase(p.getAuctionSet()))
                    .map(Player::getId)
                    .collect(Collectors.toSet());
            room.setRemainingCategoryPlayerIds(nextCatPlayerIds);

            room.addActivity("Category " + room.getCurrentCategory() + " completed! Next: " + room.getCurrentCategoryName());
            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "CATEGORY_COMPLETE", Map.of(
                    "completedCategory", sequence.get(nextIdx - 1),
                    "nextCategory", nextCat,
                    "nextCategoryName", room.getCurrentCategoryName()
            ));
        } else {
            room.setStatus(RoomStatus.COMPLETED);
            room.addActivity("All categories in auction pool have been completed! Auction XI is finished.");
            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "AUCTION_COMPLETE", Map.of());
        }
    }

    public RoomStateSnapshotDto pauseAuction(String roomCode, String hostMemberId) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            validateHost(room, hostMemberId);
            if (!room.isPaused()) {
                if (room.getCurrentLot() != null) {
                    long remaining = Math.max(0, room.getCurrentLot().getDeadlineEpochMillis() - System.currentTimeMillis());
                    room.setPauseRemainingMillis(remaining);
                }
                room.setPaused(true);
                room.setStatus(RoomStatus.PAUSED);
                room.addActivity("Auction paused by host.");
                room.incrementVersion();

                RoomStateSnapshotDto snapshot = buildSnapshot(room);
                realtimePublisher.broadcastRoomState(room.getRoomCode(), snapshot);
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "AUCTION_PAUSED", snapshot);
                return snapshot;
            }
            return buildSnapshot(room);
        } finally {
            room.getLock().unlock();
        }
    }

    public RoomStateSnapshotDto resumeAuction(String roomCode, String hostMemberId) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            validateHost(room, hostMemberId);
            if (room.isPaused()) {
                if (room.getCurrentLot() != null) {
                    long remaining = room.getPauseRemainingMillis() > 0 ? room.getPauseRemainingMillis() : 15000L;
                    room.getCurrentLot().setDeadlineEpochMillis(System.currentTimeMillis() + remaining);
                }
                room.setPaused(false);
                room.setStatus(RoomStatus.AUCTION_ACTIVE);
                room.addActivity("Auction resumed by host.");
                room.incrementVersion();

                RoomStateSnapshotDto snapshot = buildSnapshot(room);
                realtimePublisher.broadcastRoomState(room.getRoomCode(), snapshot);
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "AUCTION_RESUMED", snapshot);
                return snapshot;
            }
            return buildSnapshot(room);
        } finally {
            room.getLock().unlock();
        }
    }

    public RoomStateSnapshotDto stopAuction(String roomCode, String hostMemberId) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            validateHost(room, hostMemberId);
            room.setStatus(RoomStatus.STOPPED);
            room.addActivity("Auction stopped by host.");
            room.incrementVersion();

            RoomStateSnapshotDto snapshot = buildSnapshot(room);
            realtimePublisher.broadcastRoomState(room.getRoomCode(), snapshot);
            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "AUCTION_STOPPED", snapshot);
            return snapshot;
        } finally {
            room.getLock().unlock();
        }
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    private void initRoomCategories(AuctionRoom room) {
        List<String> sequence = getCategorySequence();
        room.setCurrentCategoryIndex(0);
        String firstCat = sequence.isEmpty() ? "M1" : sequence.get(0);
        room.setCurrentCategory(firstCat);
        room.setCurrentCategoryName(getCategoryDisplayName(firstCat));
        room.clearCategoryConfirmations();
        room.setCategoryActive(false);

        Set<String> catPlayerIds = playerDataService.getAllPlayers().stream()
                .filter(p -> firstCat.equalsIgnoreCase(p.getAuctionSet()))
                .map(Player::getId)
                .collect(Collectors.toSet());
        room.setRemainingCategoryPlayerIds(catPlayerIds);
    }

    public List<String> getCategorySequence() {
        List<String> raw = playerDataService.getAllPlayers().stream()
                .map(Player::getAuctionSet)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        List<String> sequence = new java.util.ArrayList<>();
        if (raw.removeIf("STAR"::equalsIgnoreCase)) {
            sequence.add("STAR");
        }
        sequence.addAll(raw);
        return sequence;
    }

    public static String getCategoryDisplayName(String code) {
        if (code == null) return "Auction Pool";
        String upper = code.toUpperCase();
        if ("M1".equalsIgnoreCase(upper)) return "Marquee Players Set 1";
        if ("M2".equalsIgnoreCase(upper)) return "Marquee Players Set 2";
        if ("STAR".equalsIgnoreCase(upper) || upper.startsWith("STAR")) return "Star & Retained Superstars";
        if (upper.startsWith("UBA")) return "Uncapped Batters Set " + upper.substring(3);
        if (upper.startsWith("UAL")) return "Uncapped All-Rounders Set " + upper.substring(3);
        if (upper.startsWith("UWK")) return "Uncapped Wicket-Keepers Set " + upper.substring(3);
        if (upper.startsWith("UFA")) return "Uncapped Fast Bowlers Set " + upper.substring(3);
        if (upper.startsWith("USP")) return "Uncapped Spin Bowlers Set " + upper.substring(3);
        if (upper.startsWith("BA")) return "Capped Batters Set " + upper.substring(2);
        if (upper.startsWith("AL")) return "Capped All-Rounders Set " + upper.substring(2);
        if (upper.startsWith("WK")) return "Capped Wicket-Keepers Set " + upper.substring(2);
        if (upper.startsWith("FA")) return "Capped Fast Bowlers Set " + upper.substring(2);
        if (upper.startsWith("SP")) return "Capped Spin Bowlers Set " + upper.substring(2);
        if (upper.startsWith("ACC")) return "Accelerated Auction Set " + upper.substring(3);
        return "Set " + upper;
    }

    private boolean drawNextPlayerInternal(AuctionRoom room) {
        // Ensure category is initialized
        if (room.getCurrentCategory() == null) {
            initRoomCategories(room);
        }

        Set<String> catRemaining = room.getRemainingCategoryPlayerIds();
        Set<String> alreadyDrawn = room.getAuctionedPlayerIds();

        List<Player> available = playerDataService.getAllPlayers().stream()
                .filter(p -> catRemaining.contains(p.getId()) && !alreadyDrawn.contains(p.getId()))
                .collect(Collectors.toList());

        if (available.isEmpty()) {
            // Category Complete! Advance to the next category (or finish the auction)
            advanceToNextCategory(room);
            return false;
        }

        Player selected = available.get(ThreadLocalRandom.current().nextInt(available.size()));
        int lotNumber = room.getCompletedLots().size() + 1;

        AuctionLot lot = new AuctionLot(lotNumber, selected);
        lot.setPhase(AuctionPhase.REVEALING);
        lot.setBiddingOpen(false);
        // Watchdog timeout: max 10 seconds for voice intro before live bidding automatically unlocks
        lot.setIntroductionDeadlineEpochMillis(System.currentTimeMillis() + 10000L);
        lot.setDeadlineEpochMillis(System.currentTimeMillis() + 10000L + OPEN_BIDDING_MS); // intro watchdog + 10s open bidding

        room.setCurrentLot(lot);
        room.getRemainingCategoryPlayerIds().remove(selected.getId());
        room.addAuctionedPlayerId(selected.getId());

        room.addActivity(String.format("Lot #%d revealed: %s (%s, %s, Base ₹%d L, %s).",
                lotNumber, selected.getFullName(), selected.getCountry(), selected.getRole(), lot.getBasePriceLakhs(), room.getCurrentCategoryName()));
        return true;
    }

    private void checkDeadlineExpiredInternal(AuctionRoom room) {
        AuctionLot lot = room.getCurrentLot();
        if (lot == null || room.isPaused()) {
            return;
        }

        long now = System.currentTimeMillis();
        AuctionPhase phase = lot.getPhase();

        if (phase == AuctionPhase.REVEALING) {
            if (now >= lot.getIntroductionDeadlineEpochMillis()) {
                // Watchdog expired: open bidding immediately
                lot.setPhase(AuctionPhase.BIDDING);
                lot.setBiddingOpen(true);
                lot.setDeadlineEpochMillis(now + OPEN_BIDDING_MS); // 10s open bidding window
                room.incrementVersion();
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "BIDDING_OPENED", toLotDto(lot));
                realtimePublisher.broadcastRoomState(room.getRoomCode(), buildSnapshot(room));
            }
        } else if (phase == AuctionPhase.BIDDING) {
            if (now >= lot.getDeadlineEpochMillis()) {
                if (lot.getHighestBidderFranchise() == null) {
                    // 10s expired with zero bids ever placed -> UNSOLD instantly, no ceremony
                    finalizeCurrentLotInternal(room);
                } else {
                    // Bid exists -> transition to GOING_ONCE (5 seconds)
                    lot.setPhase(AuctionPhase.GOING_ONCE);
                    lot.setDeadlineEpochMillis(now + CALL_STAGE_MS);
                    room.incrementVersion();
                    realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "GOING_ONCE", toLotDto(lot));
                    realtimePublisher.broadcastRoomState(room.getRoomCode(), buildSnapshot(room));
                }
            }
        } else if (phase == AuctionPhase.GOING_ONCE) {
            if (now >= lot.getDeadlineEpochMillis()) {
                // 5s expired with no new bids -> transition to GOING_TWICE (5 seconds)
                lot.setPhase(AuctionPhase.GOING_TWICE);
                lot.setDeadlineEpochMillis(now + CALL_STAGE_MS);
                room.incrementVersion();
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "GOING_TWICE", toLotDto(lot));
                realtimePublisher.broadcastRoomState(room.getRoomCode(), buildSnapshot(room));
            }
        } else if (phase == AuctionPhase.GOING_TWICE) {
            if (now >= lot.getDeadlineEpochMillis()) {
                // 5s expired with no new bids -> THIRD_CALL (final 5 seconds, still biddable)
                lot.setPhase(AuctionPhase.THIRD_CALL);
                lot.setDeadlineEpochMillis(now + CALL_STAGE_MS);
                room.incrementVersion();
                realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "THIRD_CALL", toLotDto(lot));
                realtimePublisher.broadcastRoomState(room.getRoomCode(), buildSnapshot(room));
            }
        } else if (phase == AuctionPhase.THIRD_CALL) {
            if (now >= lot.getDeadlineEpochMillis()) {
                // Final call expired with no new bid -> hammer falls, SOLD
                finalizeCurrentLotInternal(room);
            }
        }
    }

    private static boolean isBiddablePhase(AuctionPhase phase) {
        return phase == AuctionPhase.REVEALING
                || phase == AuctionPhase.BIDDING
                || phase == AuctionPhase.GOING_ONCE
                || phase == AuctionPhase.GOING_TWICE
                || phase == AuctionPhase.THIRD_CALL;
    }

    private void finalizeCurrentLotInternal(AuctionRoom room) {
        AuctionLot lot = room.getCurrentLot();
        if (lot == null || (lot.getPhase() != AuctionPhase.BIDDING && lot.getPhase() != AuctionPhase.REVEALING && lot.getPhase() != AuctionPhase.GOING_ONCE && lot.getPhase() != AuctionPhase.GOING_TWICE && lot.getPhase() != AuctionPhase.THIRD_CALL)) {
            return;
        }

        if (lot.getHighestBidderFranchise() != null) {
            lot.setPhase(AuctionPhase.SOLD);
            FranchiseAuctionState fState = room.getFranchiseAuctionState(lot.getHighestBidderFranchise());
            if (fState != null) {
                fState.addPlayer(lot.getPlayer(), lot.getCurrentBidLakhs());
            }
            if (auctionPersistenceService != null) {
                auctionPersistenceService.savePurchase(room.getRoomId(), lot.getPlayer().getId(), lot.getHighestBidderFranchise(), lot.getCurrentBidLakhs());
            }
            room.addActivity(String.format("SOLD! Lot #%d %s sold to %s for ₹%.2f Cr.",
                    lot.getLotNumber(), lot.getPlayer().getFullName(), lot.getHighestBidderFranchise(),
                    lot.getCurrentBidLakhs() / 100.0));

            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "PLAYER_SOLD", Map.of(
                    "lot", toLotDto(lot),
                    "winner", lot.getHighestBidderFranchise(),
                    "priceLakhs", lot.getCurrentBidLakhs()
            ));
        } else {
            lot.setPhase(AuctionPhase.UNSOLD);
            room.addActivity(String.format("UNSOLD! Lot #%d %s went unsold at base ₹%d L.",
                    lot.getLotNumber(), lot.getPlayer().getFullName(), lot.getBasePriceLakhs()));

            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "PLAYER_UNSOLD", toLotDto(lot));
        }

        room.addCompletedLot(lot);

        // Check if category is now empty
        if (room.getRemainingCategoryPlayerIds().isEmpty()) {
            room.setCategoryActive(false);
            room.addActivity(String.format("Category %s complete!", room.getCurrentCategoryName()));
        }

        room.incrementVersion();
        RoomStateSnapshotDto snapshot = buildSnapshot(room);
        if (auctionPersistenceService != null) {
            auctionPersistenceService.saveSnapshot(room.getRoomId(), room.getVersion(), snapshot);
        }
        realtimePublisher.broadcastRoomState(room.getRoomCode(), snapshot);
    }

    public static long calculateMinimumIncrement(long currentBidLakhs) {
        if (currentBidLakhs < 100L) {
            return 10L; // ₹10 Lakhs below ₹1 Cr
        } else if (currentBidLakhs < 500L) {
            return 20L; // ₹20 Lakhs between ₹1 Cr and ₹5 Cr
        } else {
            return 50L; // ₹50 Lakhs above ₹5 Cr
        }
    }

    private void validateHost(AuctionRoom room, String hostMemberId) {
        if (!hostMemberId.equals(room.getHostMemberId())) {
            throw new AllocationException(AllocationErrorCode.NOT_ROOM_HOST, "Only the host can execute this control action.");
        }
    }

    private AuctionRoom getRoomOrThrow(String roomCode) {
        return roomStore.findByCode(roomCode)
                .orElseThrow(() -> new AllocationException(AllocationErrorCode.ROOM_NOT_FOUND, "Room not found: " + roomCode));
    }

    private RoomStateSnapshotDto buildSnapshot(AuctionRoom room) {
        AllocationStateDto alloc = allocationService.getAllocationState(room.getRoomCode());
        AuctionLotDto lotDto = toLotDto(room.getCurrentLot());

        Map<String, FranchiseAuctionStateDto> franchises = new HashMap<>();
        for (FranchiseAuctionState f : room.getFranchiseAuctionStates().values()) {
            franchises.put(f.getFranchiseCode(), new FranchiseAuctionStateDto(
                    f.getFranchiseCode(),
                    f.getFranchiseName(),
                    f.getOwnerMemberId(),
                    f.getOwnerDisplayName(),
                    f.isActive(),
                    f.getPurseLakhs(),
                    f.getSpentLakhs(),
                    f.getSquad(),
                    f.getSquad().size(),
                    f.getOverseasCount()
            ));
        }

        List<AuctionLotDto> completed = room.getCompletedLots().stream()
                .map(this::toLotDto)
                .collect(Collectors.toList());

        String curCat = room.getCurrentCategory();
        List<Player> categoryPlayers = curCat == null ? List.of() : playerDataService.getAllPlayers().stream()
                .filter(p -> curCat.equalsIgnoreCase(p.getAuctionSet()))
                .collect(Collectors.toList());

        int categoryPlayerCount = categoryPlayers.size();
        int categoryRemainingCount = (int) categoryPlayers.stream()
                .filter(p -> !room.getAuctionedPlayerIds().contains(p.getId()))
                .count();
        int categoryCompletedCount = categoryPlayerCount - categoryRemainingCount;

        Map<String, List<String>> playerPreSkips = new HashMap<>();
        for (Map.Entry<String, Set<String>> entry : room.getPlayerPreSkips().entrySet()) {
            playerPreSkips.put(entry.getKey(), new ArrayList<>(entry.getValue()));
        }

        // Map status for category players
        List<Player> mappedCategoryPlayers = categoryPlayers.stream().map(p -> {
            boolean isAuctioned = room.getAuctionedPlayerIds().contains(p.getId());
            if (!isAuctioned) return p;
            
            // Find if sold or unsold
            Optional<AuctionLot> lotOpt = room.getCompletedLots().stream()
                    .filter(l -> l.getPlayer() != null && l.getPlayer().getId().equals(p.getId()))
                    .findFirst();
            if (lotOpt.isPresent()) {
                AuctionLot lot = lotOpt.get();
                if (lot.getPhase() == AuctionPhase.SOLD) {
                    p.setStatus("SOLD");
                    p.setSoldToFranchise(lot.getHighestBidderFranchise());
                    p.setSoldPrice(lot.getCurrentBidLakhs() * 100000L);
                } else {
                    p.setStatus("UNSOLD");
                }
            } else {
                p.setStatus("UNSOLD");
            }
            return p;
        }).collect(Collectors.toList());

        return new RoomStateSnapshotDto(
                room.getRoomCode(),
                room.getRoomName(),
                room.getHostMemberId(),
                room.getStatus(),
                room.getVersion(),
                alloc,
                lotDto,
                franchises,
                completed,
                room.isPaused(),
                room.getStartingPurseLakhs(),
                System.currentTimeMillis(),
                room.getCurrentCategory(),
                room.getCurrentCategoryName(),
                room.getCurrentCategoryIndex(),
                getCategorySequence().size(),
                categoryPlayerCount,
                categoryRemainingCount,
                categoryCompletedCount,
                new ArrayList<>(room.getCategoryConfirmedFranchises()),
                room.isCategoryActive(),
                mappedCategoryPlayers,
                playerPreSkips,
                room.getChampionFranchise()
        );
    }

    private AuctionLotDto toLotDto(AuctionLot lot) {
        if (lot == null) return null;
        List<AuctionBidDto> bids = lot.getBidHistory().stream()
                .map(this::toBidDto)
                .collect(Collectors.toList());

        return new AuctionLotDto(
                lot.getLotNumber(),
                lot.getPlayer(),
                lot.getBasePriceLakhs(),
                lot.getCurrentBidLakhs(),
                lot.getHighestBidderFranchise(),
                lot.getHighestBidderName(),
                lot.getHighestBidderMemberId(),
                lot.getDeadlineEpochMillis(),
                lot.getPhase(),
                bids,
                lot.getSkippedFranchises(),
                lot.isBiddingOpen(),
                lot.getIntroductionDeadlineEpochMillis(),
                lot.isBypassed()
        );
    }

    private AuctionBidDto toBidDto(AuctionBid bid) {
        if (bid == null) return null;
        return new AuctionBidDto(
                bid.franchiseCode(),
                bid.franchiseName(),
                bid.memberId(),
                bid.displayName(),
                bid.amountLakhs(),
                bid.timestamp().toEpochMilli()
        );
    }
}
