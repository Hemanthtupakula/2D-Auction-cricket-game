package com.auctionxi.service;

import com.auctionxi.exception.AllocationException;
import com.auctionxi.model.*;
import com.auctionxi.model.dto.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class LiveAuctionServiceTest {

    private RoomStore roomStore;
    private PlayerDataService playerDataService;
    private RealtimePublisher realtimePublisher;
    private FairFranchiseAllocationService allocationService;
    private LiveAuctionService liveAuctionService;

    @BeforeEach
    void setUp() {
        roomStore = new RoomStore();
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        MediaIngestionService mediaIngestionService = new MediaIngestionService(mapper);
        mediaIngestionService.init();
        playerDataService = new PlayerDataService(mapper, mediaIngestionService);
        playerDataService.init();
        realtimePublisher = new RealtimePublisher() {
            @Override
            public void broadcastAllocationState(String roomCode, AllocationStateDto state) {}
            @Override
            public void broadcastSystemAlert(String roomCode, String message) {}
        };
        allocationService = new FairFranchiseAllocationService(roomStore, realtimePublisher);
        liveAuctionService = new LiveAuctionService(roomStore, playerDataService, realtimePublisher, allocationService);
    }

    private AuctionRoom setupTwoPlayerRoom() {
        AuctionRoom room = allocationService.createRoom("IPL Mega Auction", "Hemanth");
        AllocationStateDto state = allocationService.handleMemberJoin(room.getRoomCode(), "Akshay");
        String akshayId = state.members().stream()
                .filter(m -> m.displayName().equals("Akshay"))
                .findFirst().orElseThrow().memberId();

        // Host claims MI, Akshay claims CSK
        allocationService.claimFranchise(room.getRoomCode(), room.getHostMemberId(), "MI");
        allocationService.claimFranchise(room.getRoomCode(), akshayId, "CSK");
        return room;
    }

    private RoomStateSnapshotDto startAuctionAndProceedToBidding(AuctionRoom room) {
        liveAuctionService.startAuction(room.getRoomCode(), room.getHostMemberId());
        liveAuctionService.proceedToCategory(room.getRoomCode(), room.getHostMemberId(), "MI");
        return liveAuctionService.introComplete(room.getRoomCode(), room.getHostMemberId());
    }

    @Test
    void testStartAuctionDrawsFirstPlayerAndInitializesStates() {
        AuctionRoom room = setupTwoPlayerRoom();
        RoomStateSnapshotDto initialSnap = liveAuctionService.startAuction(room.getRoomCode(), room.getHostMemberId());
        assertEquals(RoomStatus.AUCTION_ACTIVE, initialSnap.status());

        // Confirm category to draw first player in REVEALING phase
        RoomStateSnapshotDto revealingSnap = liveAuctionService.proceedToCategory(room.getRoomCode(), room.getHostMemberId(), "MI");
        assertNotNull(revealingSnap.currentLot());
        assertEquals(1, revealingSnap.currentLot().lotNumber());
        assertNotNull(revealingSnap.currentLot().player());
        assertEquals(AuctionPhase.REVEALING, revealingSnap.currentLot().phase());

        // Complete 3D reveal intro to open bidding
        RoomStateSnapshotDto snapshot = liveAuctionService.introComplete(room.getRoomCode(), room.getHostMemberId());
        assertEquals(AuctionPhase.BIDDING, snapshot.currentLot().phase());

        // Check franchise states: MI & CSK are active, others inactive
        assertTrue(snapshot.franchises().get("MI").active());
        assertTrue(snapshot.franchises().get("CSK").active());
        assertFalse(snapshot.franchises().get("RCB").active());
        assertEquals(room.getStartingPurseLakhs(), snapshot.franchises().get("MI").purseLakhs());
    }

    @Test
    void testNonHostCannotDrawChit() {
        AuctionRoom room = setupTwoPlayerRoom();
        startAuctionAndProceedToBidding(room);

        String akshayId = room.getMembers().values().stream()
                .filter(m -> m.getDisplayName().equals("Akshay"))
                .findFirst().orElseThrow().getMemberId();

        assertThrows(AllocationException.class, () ->
                liveAuctionService.drawNextPlayer(room.getRoomCode(), akshayId)
        );
    }

    @Test
    void testHostDrawNextPlayerIdempotent() {
        AuctionRoom room = setupTwoPlayerRoom();
        RoomStateSnapshotDto snap1 = startAuctionAndProceedToBidding(room);
        String player1Name = snap1.currentLot().player().getFullName();

        // Draw next player while current lot is still actively bidding
        RoomStateSnapshotDto snap2 = liveAuctionService.drawNextPlayer(room.getRoomCode(), room.getHostMemberId());
        assertEquals(player1Name, snap2.currentLot().player().getFullName(), "Should return existing active lot (idempotent)");
    }

    @Test
    void testPlaceBidValidAndExtendsTimer() {
        AuctionRoom room = setupTwoPlayerRoom();
        RoomStateSnapshotDto snap = startAuctionAndProceedToBidding(room);

        String akshayId = room.getMembers().values().stream()
                .filter(m -> m.getDisplayName().equals("Akshay"))
                .findFirst().orElseThrow().getMemberId();

        long basePrice = snap.currentLot().basePriceLakhs();
        RoomStateSnapshotDto afterBid = liveAuctionService.placeBid(room.getRoomCode(), akshayId, "CSK", basePrice + 50L);

        assertEquals("CSK", afterBid.currentLot().highestBidderFranchise());
        assertEquals(basePrice + 50L, afterBid.currentLot().currentBidLakhs());
        assertEquals(1, afterBid.currentLot().bidHistory().size());
        assertTrue(afterBid.currentLot().deadlineEpochMillis() > System.currentTimeMillis());
    }

    @Test
    void testPlaceBidRejectsSelfBidding() {
        AuctionRoom room = setupTwoPlayerRoom();
        RoomStateSnapshotDto snap = startAuctionAndProceedToBidding(room);

        String akshayId = room.getMembers().values().stream()
                .filter(m -> m.getDisplayName().equals("Akshay"))
                .findFirst().orElseThrow().getMemberId();

        long basePrice = snap.currentLot().basePriceLakhs();
        liveAuctionService.placeBid(room.getRoomCode(), akshayId, "CSK", basePrice + 50L);

        // Akshay tries to bid against CSK with CSK again
        assertThrows(AllocationException.class, () ->
                liveAuctionService.placeBid(room.getRoomCode(), akshayId, "CSK", basePrice + 100L)
        );
    }

    @Test
    void testPlaceBidRejectsUnauthorizedFranchise() {
        AuctionRoom room = setupTwoPlayerRoom();
        startAuctionAndProceedToBidding(room);

        String akshayId = room.getMembers().values().stream()
                .filter(m -> m.getDisplayName().equals("Akshay"))
                .findFirst().orElseThrow().getMemberId();

        // Akshay tries to bid as MI (owned by Hemanth)
        assertThrows(AllocationException.class, () ->
                liveAuctionService.placeBid(room.getRoomCode(), akshayId, "MI", 500L)
        );

        // Akshay tries to bid as RCB (inactive)
        assertThrows(AllocationException.class, () ->
                liveAuctionService.placeBid(room.getRoomCode(), akshayId, "RCB", 500L)
        );
    }

    @Test
    void testFinalizeCurrentLotSoldDeductsPurseAndAddsToSquad() {
        AuctionRoom room = setupTwoPlayerRoom();
        RoomStateSnapshotDto snap = startAuctionAndProceedToBidding(room);

        String akshayId = room.getMembers().values().stream()
                .filter(m -> m.getDisplayName().equals("Akshay"))
                .findFirst().orElseThrow().getMemberId();

        long bidAmount = snap.currentLot().basePriceLakhs() + 100L;
        liveAuctionService.placeBid(room.getRoomCode(), akshayId, "CSK", bidAmount);

        // Manually expire deadline to test finalization
        room.getCurrentLot().setDeadlineEpochMillis(System.currentTimeMillis() - 1000L);

        RoomStateSnapshotDto finalized = liveAuctionService.finalizeCurrentLot(room.getRoomCode());
        assertEquals(AuctionPhase.SOLD, finalized.completedLots().getFirst().phase());
        assertEquals("CSK", finalized.completedLots().getFirst().highestBidderFranchise());

        FranchiseAuctionStateDto cskState = finalized.franchises().get("CSK");
        assertEquals(room.getStartingPurseLakhs() - bidAmount, cskState.purseLakhs());
        assertEquals(bidAmount, cskState.spentLakhs());
        assertEquals(1, cskState.squadSize());
    }

    @Test
    void testFinalizeCurrentLotUnsold() {
        AuctionRoom room = setupTwoPlayerRoom();
        startAuctionAndProceedToBidding(room);

        // No bids placed, expire deadline
        room.getCurrentLot().setDeadlineEpochMillis(System.currentTimeMillis() - 1000L);

        RoomStateSnapshotDto finalized = liveAuctionService.finalizeCurrentLot(room.getRoomCode());
        assertEquals(AuctionPhase.UNSOLD, finalized.completedLots().getFirst().phase());
        assertNull(finalized.completedLots().getFirst().highestBidderFranchise());
    }

    @Test
    void testPauseResumeStopAuction() {
        AuctionRoom room = setupTwoPlayerRoom();
        startAuctionAndProceedToBidding(room);

        // Pause
        RoomStateSnapshotDto paused = liveAuctionService.pauseAuction(room.getRoomCode(), room.getHostMemberId());
        assertEquals(RoomStatus.PAUSED, paused.status());
        assertTrue(paused.isPaused());

        // Bidding during pause is rejected
        String akshayId = room.getMembers().values().stream()
                .filter(m -> m.getDisplayName().equals("Akshay"))
                .findFirst().orElseThrow().getMemberId();
        assertThrows(AllocationException.class, () ->
                liveAuctionService.placeBid(room.getRoomCode(), akshayId, "CSK", 500L)
        );

        // Resume
        RoomStateSnapshotDto resumed = liveAuctionService.resumeAuction(room.getRoomCode(), room.getHostMemberId());
        assertEquals(RoomStatus.AUCTION_ACTIVE, resumed.status());
        assertFalse(resumed.isPaused());

        // Stop
        RoomStateSnapshotDto stopped = liveAuctionService.stopAuction(room.getRoomCode(), room.getHostMemberId());
        assertEquals(RoomStatus.STOPPED, stopped.status());
    }
}
