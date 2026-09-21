package com.auctionxi.service;

import com.auctionxi.exception.AllocationErrorCode;
import com.auctionxi.exception.AllocationException;
import com.auctionxi.model.*;
import com.auctionxi.model.dto.AllocationStateDto;
import com.auctionxi.model.dto.FranchiseSeatDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

class TeamAllocationServiceTest {

    private RoomStore roomStore;
    private TeamAllocationService allocationService;
    private RealtimePublisher noopPublisher;

    @BeforeEach
    void setUp() {
        roomStore = new RoomStore();
        noopPublisher = new RealtimePublisher() {
            @Override
            public void broadcastAllocationState(String roomCode, AllocationStateDto state) {}
            @Override
            public void broadcastSystemAlert(String roomCode, String message) {}
        };
        allocationService = new TeamAllocationService(roomStore, noopPublisher);
    }

    record QuotaTestCase(int totalMembers, int[] expectedQuotas, String description) {}

    static Stream<QuotaTestCase> quotaTestCases() {
        return Stream.of(
                new QuotaTestCase(1, new int[]{10}, "1 member -> Host 10"),
                new QuotaTestCase(2, new int[]{5, 5}, "2 members -> 5 / 5"),
                new QuotaTestCase(3, new int[]{4, 3, 3}, "3 members -> Host 4, M2: 3, M3: 3"),
                new QuotaTestCase(4, new int[]{3, 3, 2, 2}, "4 members -> Host 3, M2: 3, M3: 2, M4: 2"),
                new QuotaTestCase(5, new int[]{2, 2, 2, 2, 2}, "5 members -> 2 / 2 / 2 / 2 / 2"),
                new QuotaTestCase(6, new int[]{2, 2, 2, 2, 1, 1}, "6 members -> 2 / 2 / 2 / 2 / 1 / 1"),
                new QuotaTestCase(7, new int[]{2, 2, 2, 1, 1, 1, 1}, "7 members -> Host 2, M2: 2, M3: 2, M4-7: 1 each"),
                new QuotaTestCase(8, new int[]{2, 2, 1, 1, 1, 1, 1, 1}, "8 members -> Host 2, M2: 2, M3-8: 1 each"),
                new QuotaTestCase(9, new int[]{2, 1, 1, 1, 1, 1, 1, 1, 1}, "9 members -> Host 2, M2-9: 1 each"),
                new QuotaTestCase(10, new int[]{1, 1, 1, 1, 1, 1, 1, 1, 1, 1}, "10 members -> 1 each")
        );
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("quotaTestCases")
    @DisplayName("Verify Exact Mathematical Fair Quota Formula for 1 to 10 human members")
    void testExactQuotasAllCounts(QuotaTestCase tc) {
        int sum = 0;
        for (int i = 0; i < tc.totalMembers(); i++) {
            int calculated = allocationService.calculateRecommendedAllocation(i, tc.totalMembers());
            assertEquals(tc.expectedQuotas()[i], calculated,
                    String.format("Member at index %d in %d-member room expected %d", i, tc.totalMembers(), tc.expectedQuotas()[i]));
            sum += calculated;
        }
        assertEquals(10, sum, "Sum of all member quotas must always equal exactly 10 franchises");
    }

    @Test
    @DisplayName("Single member (Host) claims all 10 franchises in solo testing mode")
    void testSingleMemberRoom() {
        AuctionRoom room = allocationService.createRoom("Solo Auction", "Hemanth");
        String code = room.getRoomCode();
        String hostId = room.getHostMemberId();

        for (Franchise f : Franchise.values()) {
            allocationService.claimFranchise(code, hostId, f.getCode());
        }

        AllocationStateDto state = allocationService.getAllocationState(code);
        assertEquals(10, state.claimedTeamCount());
        assertEquals(0, state.openTeamCount());
        // Minimum 2 human members required to start auction!
        assertFalse(state.canStartAuction());
    }

    @Test
    @DisplayName("Start condition: Auction cannot start if any active human member has 0 franchises")
    void testCannotStartIfAnyMemberHasZeroFranchises() {
        AuctionRoom room = allocationService.createRoom("IPL Mega", "Hemanth");
        String code = room.getRoomCode();
        String hostId = room.getHostMemberId();

        // Add 2nd member so humanMemberCount >= 2
        allocationService.joinRoom(code, "Akshay");

        // Host claims MI, but Akshay has 0 franchises
        allocationService.claimFranchise(code, hostId, "MI");

        AllocationException ex = assertThrows(AllocationException.class, () ->
                allocationService.lockAndStartAuction(code, hostId)
        );
        assertEquals(AllocationErrorCode.QUOTA_INCOMPLETE, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("Every human member must own at least 1 franchise"));
    }

    @Test
    @DisplayName("Required Rule: 2 humans join, each selects 1 team, lock/start succeeds -> AUCTION_ACTIVE with 8 inactive franchises")
    void testStartAuctionWithTwoHumansOneTeamEach() {
        AuctionRoom room = allocationService.createRoom("IPL Duo", "Hemanth");
        String code = room.getRoomCode();
        String hostId = room.getHostMemberId();

        AllocationStateDto joinState = allocationService.joinRoom(code, "Akshay");
        String akshayId = joinState.members().stream().filter(m -> !m.isHost()).findFirst().orElseThrow().memberId();

        // Each selects 1 team
        allocationService.claimFranchise(code, hostId, "MI");
        allocationService.claimFranchise(code, akshayId, "CSK");

        AllocationStateDto state = allocationService.getAllocationState(code);
        assertEquals(2, state.claimedTeamCount());
        assertEquals(8, state.openTeamCount());
        assertTrue(state.canStartAuction(), "Start must be allowed when each human member has >= 1 team and total <= 10");

        // Lock & Start
        AllocationStateDto locked = allocationService.lockAndStartAuction(code, hostId);
        assertEquals(RoomStatus.AUCTION_ACTIVE, locked.status());
        assertEquals(2, locked.claimedTeamCount());
        assertEquals(8, locked.openTeamCount());

        // Unselected franchises remain INACTIVE and are NOT AI
        long inactiveCount = locked.seats().stream().filter(FranchiseSeatDto::isInactive).count();
        assertEquals(8, inactiveCount, "Exactly 8 unselected franchises must be marked INACTIVE");
    }

    @Test
    @DisplayName("Cannot claim beyond dynamic quota")
    void testCannotExceedDynamicQuota() {
        AuctionRoom room = allocationService.createRoom("IPL Mega", "Hemanth");
        String code = room.getRoomCode();

        // Add 1 member -> total 2 members (Quotas: [5, 5])
        AllocationStateDto joinState = allocationService.joinRoom(code, "Akshay");
        String akshayId = joinState.members().stream().filter(m -> !m.isHost()).findFirst().orElseThrow().memberId();

        // Akshay claims 5 franchises
        allocationService.claimFranchise(code, akshayId, "MI");
        allocationService.claimFranchise(code, akshayId, "CSK");
        allocationService.claimFranchise(code, akshayId, "RCB");
        allocationService.claimFranchise(code, akshayId, "KKR");
        allocationService.claimFranchise(code, akshayId, "SRH");

        // 6th claim must be rejected as QUOTA_EXCEEDED
        AllocationException ex = assertThrows(AllocationException.class, () ->
                allocationService.claimFranchise(code, akshayId, "RR")
        );
        assertEquals(AllocationErrorCode.QUOTA_EXCEEDED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Duplicate franchise selection throws FRANCHISE_ALREADY_TAKEN")
    void testDuplicateSelectionRejected() {
        AuctionRoom room = allocationService.createRoom("IPL Mega", "Hemanth");
        String code = room.getRoomCode();
        String hostId = room.getHostMemberId();

        allocationService.claimFranchise(code, hostId, "MI");

        AllocationStateDto joinState = allocationService.joinRoom(code, "Rahul");
        String rahulId = joinState.members().stream().filter(m -> !m.isHost()).findFirst().orElseThrow().memberId();

        AllocationException ex = assertThrows(AllocationException.class, () ->
                allocationService.claimFranchise(code, rahulId, "MI")
        );
        assertEquals(AllocationErrorCode.FRANCHISE_ALREADY_TAKEN, ex.getErrorCode());
    }

    @Test
    @DisplayName("Switching from owned franchise to another open franchise")
    void testSwitchFranchise() {
        AuctionRoom room = allocationService.createRoom("IPL Mega", "Hemanth");
        String code = room.getRoomCode();
        String hostId = room.getHostMemberId();

        allocationService.claimFranchise(code, hostId, "MI");

        AllocationStateDto switched = allocationService.switchFranchise(code, hostId, "MI", "RCB");

        FranchiseSeatDto mi = switched.seats().stream().filter(s -> "MI".equals(s.code())).findFirst().orElseThrow();
        FranchiseSeatDto rcb = switched.seats().stream().filter(s -> "RCB".equals(s.code())).findFirst().orElseThrow();

        assertTrue(mi.isOpen());
        assertEquals(hostId, rcb.ownerMemberId());
    }

    @Test
    @DisplayName("Member leaves room: all their franchises become immediately OPEN and quotas adjust")
    void testMemberLeaveReleasesFranchises() {
        AuctionRoom room = allocationService.createRoom("IPL Mega", "Hemanth");
        String code = room.getRoomCode();

        AllocationStateDto joinState = allocationService.joinRoom(code, "Akshay");
        String akshayId = joinState.members().stream().filter(m -> !m.isHost()).findFirst().orElseThrow().memberId();

        allocationService.claimFranchise(code, akshayId, "SRH");
        allocationService.claimFranchise(code, akshayId, "RR");

        AllocationStateDto left = allocationService.handleMemberLeft(code, akshayId);

        FranchiseSeatDto srh = left.seats().stream().filter(s -> "SRH".equals(s.code())).findFirst().orElseThrow();
        FranchiseSeatDto rr = left.seats().stream().filter(s -> "RR".equals(s.code())).findFirst().orElseThrow();

        assertTrue(srh.isOpen());
        assertTrue(rr.isOpen());
        assertEquals(1, left.humanMemberCount());
    }

    @Test
    @DisplayName("Member joining triggers rebalance if existing member holds more than new quota")
    void testRebalanceTriggeredOnJoin() {
        AuctionRoom room = allocationService.createRoom("IPL Mega", "Hemanth");
        String code = room.getRoomCode();
        String hostId = room.getHostMemberId();

        // 1 member -> Host holds 10 teams
        for (Franchise f : Franchise.values()) {
            allocationService.claimFranchise(code, hostId, f.getCode());
        }

        // 2nd member joins -> Quotas become 5/5, but Host holds 10!
        AllocationStateDto state2 = allocationService.joinRoom(code, "Akshay");
        assertTrue(state2.rebalanceRequired(), "Rebalance must be required as Host holds 10 but quota is 5");

        // Host rebalances to 5 franchises
        List<String> keep = List.of("MI", "CSK", "RCB", "KKR", "SRH");
        AllocationStateDto rebalanced = allocationService.rebalanceMemberTeams(code, hostId, keep);

        assertFalse(rebalanced.rebalanceRequired(), "Rebalance should be resolved");
        assertEquals(5, rebalanced.members().getFirst().heldCount());
        assertEquals(5, rebalanced.openTeamCount());
    }

    @Test
    @DisplayName("Simultaneous franchise claim race condition: exactly 1 wins, other fails")
    void testSimultaneousClaimRaceSafety() throws Exception {
        AuctionRoom room = allocationService.createRoom("IPL Mega", "Host");
        String code = room.getRoomCode();

        AllocationStateDto join1 = allocationService.joinRoom(code, "Player1");
        AllocationStateDto join2 = allocationService.joinRoom(code, "Player2");

        String id1 = join1.members().stream().filter(m -> "Player1".equals(m.displayName())).findFirst().orElseThrow().memberId();
        String id2 = join2.members().stream().filter(m -> "Player2".equals(m.displayName())).findFirst().orElseThrow().memberId();

        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneGate = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        executor.submit(() -> {
            try {
                startGate.await();
                allocationService.claimFranchise(code, id1, "MI");
                successCount.incrementAndGet();
            } catch (Exception e) {
                failCount.incrementAndGet();
            } finally {
                doneGate.countDown();
            }
        });

        executor.submit(() -> {
            try {
                startGate.await();
                allocationService.claimFranchise(code, id2, "MI");
                successCount.incrementAndGet();
            } catch (Exception e) {
                failCount.incrementAndGet();
            } finally {
                doneGate.countDown();
            }
        });

        startGate.countDown();
        assertTrue(doneGate.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        assertEquals(1, successCount.get(), "Exactly one competitor must claim MI");
        assertEquals(1, failCount.get(), "The other competitor must fail");
    }

    @Test
    @DisplayName("Start Auction Lock: Freeze allocation, immutable state, reject all post-start changes")
    void testLockTeamsAndStartAuctionComplete() {
        AuctionRoom room = allocationService.createRoom("IPL Mega", "Hemanth");
        String code = room.getRoomCode();
        String hostId = room.getHostMemberId();

        // 2-member room: quotas [5, 5]
        AllocationStateDto joinState = allocationService.joinRoom(code, "Akshay");
        String akshayId = joinState.members().stream().filter(m -> !m.isHost()).findFirst().orElseThrow().memberId();

        // Host claims 5 teams
        allocationService.claimFranchise(code, hostId, "MI");
        allocationService.claimFranchise(code, hostId, "CSK");
        allocationService.claimFranchise(code, hostId, "RCB");
        allocationService.claimFranchise(code, hostId, "KKR");
        allocationService.claimFranchise(code, hostId, "SRH");

        // Akshay claims 5 teams
        allocationService.claimFranchise(code, akshayId, "RR");
        allocationService.claimFranchise(code, akshayId, "DC");
        allocationService.claimFranchise(code, akshayId, "PBKS");
        allocationService.claimFranchise(code, akshayId, "GT");
        allocationService.claimFranchise(code, akshayId, "LSG");

        AllocationStateDto stateBeforeStart = allocationService.getAllocationState(code);
        assertTrue(stateBeforeStart.canStartAuction());

        // Lock & Start
        AllocationStateDto locked = allocationService.lockAndStartAuction(code, hostId);
        assertEquals(RoomStatus.AUCTION_ACTIVE, locked.status());
        assertEquals(10, locked.claimedTeamCount());
        assertEquals(0, locked.openTeamCount());

        // Any attempt to join, claim, or switch must throw AUCTION_ALREADY_STARTED
        assertThrows(AllocationException.class, () ->
                allocationService.joinRoom(code, "LateComer")
        );
        assertThrows(AllocationException.class, () ->
                allocationService.claimFranchise(code, hostId, "MI")
        );
        assertThrows(AllocationException.class, () ->
                allocationService.switchFranchise(code, hostId, "MI", "RR")
        );
    }
}
