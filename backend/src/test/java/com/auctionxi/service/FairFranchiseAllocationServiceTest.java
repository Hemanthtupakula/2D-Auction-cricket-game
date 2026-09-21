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

import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

class FairFranchiseAllocationServiceTest {

    private RoomStore roomStore;
    private FairFranchiseAllocationService allocationService;

    @BeforeEach
    void setUp() {
        roomStore = new RoomStore();
        RealtimePublisher noopPublisher = new RealtimePublisher() {
            @Override
            public void broadcastAllocationState(String roomCode, AllocationStateDto state) {}
            @Override
            public void broadcastSystemAlert(String roomCode, String message) {}
        };
        allocationService = new FairFranchiseAllocationService(roomStore, noopPublisher);
    }

    record BalancedTestCase(int totalMembers, int[] expectedDistribution) {}

    static Stream<BalancedTestCase> balancedTestCases() {
        return Stream.of(
                new BalancedTestCase(2, new int[]{5, 5}),
                new BalancedTestCase(3, new int[]{4, 3, 3}),
                new BalancedTestCase(4, new int[]{3, 3, 2, 2}),
                new BalancedTestCase(5, new int[]{2, 2, 2, 2, 2}),
                new BalancedTestCase(6, new int[]{2, 2, 2, 2, 1, 1}),
                new BalancedTestCase(7, new int[]{2, 2, 2, 1, 1, 1, 1}),
                new BalancedTestCase(8, new int[]{2, 2, 1, 1, 1, 1, 1, 1}),
                new BalancedTestCase(9, new int[]{2, 1, 1, 1, 1, 1, 1, 1, 1}),
                new BalancedTestCase(10, new int[]{1, 1, 1, 1, 1, 1, 1, 1, 1, 1})
        );
    }

    @ParameterizedTest(name = "{0} members")
    @MethodSource("balancedTestCases")
    @DisplayName("Verify Balanced Recommendation Algorithm for 2 to 10 members")
    void testBalancedRecommendations(BalancedTestCase tc) {
        int sum = 0;
        for (int i = 0; i < tc.totalMembers(); i++) {
            int rec = allocationService.calculateRecommendedAllocation(i, tc.totalMembers());
            assertEquals(tc.expectedDistribution()[i], rec,
                    String.format("Member %d in %d-member room expected %d", i, tc.totalMembers(), tc.expectedDistribution()[i]));
            sum += rec;
        }
        assertEquals(10, sum, "Sum of recommended quotas must always equal exactly 10 franchises");
    }

    @Test
    @DisplayName("Custom Allocation Validation: Test valid and invalid 2-member and 3-member distributions")
    void testCustomAllocationValidation() {
        // 2 members: 1/9, 2/8, 3/7, 4/6, 5/5 are all valid
        assertTrue(allocationService.validateRequestedAllocation(List.of(1, 9), 2));
        assertTrue(allocationService.validateRequestedAllocation(List.of(2, 8), 2));
        assertTrue(allocationService.validateRequestedAllocation(List.of(3, 7), 2));
        assertTrue(allocationService.validateRequestedAllocation(List.of(4, 6), 2));
        assertTrue(allocationService.validateRequestedAllocation(List.of(5, 5), 2));

        // Invalid 2-member distributions
        assertFalse(allocationService.validateRequestedAllocation(List.of(0, 10), 2), "Every member must own at least 1");
        assertFalse(allocationService.validateRequestedAllocation(List.of(6, 6), 2), "Sum must equal 10");
        assertFalse(allocationService.validateRequestedAllocation(List.of(4, 5), 2), "Sum must equal 10");

        // 3 members: 4/3/3, 5/3/2, 6/2/2, 8/1/1
        assertTrue(allocationService.validateRequestedAllocation(List.of(4, 3, 3), 3));
        assertTrue(allocationService.validateRequestedAllocation(List.of(5, 3, 2), 3));
        assertTrue(allocationService.validateRequestedAllocation(List.of(6, 2, 2), 3));
        assertTrue(allocationService.validateRequestedAllocation(List.of(8, 1, 1), 3));

        // Invalid 3-member distributions
        assertFalse(allocationService.validateRequestedAllocation(List.of(9, 1, 0), 3), "Member cannot have 0");
        assertFalse(allocationService.validateRequestedAllocation(List.of(9, 1, 1), 3), "Sum 11 != 10");
    }

    @Test
    @DisplayName("Minimum 2 human members required to start auction")
    void testMinimumTwoMembersRequiredToStart() {
        AuctionRoom room = allocationService.createRoom("Solo Test", "Hemanth");
        String code = room.getRoomCode();
        String hostId = room.getHostMemberId();

        // 1 person claims all 10
        for (Franchise f : Franchise.values()) {
            allocationService.claimFranchise(code, hostId, f.getCode());
        }

        AllocationStateDto state = allocationService.getAllocationState(code);
        assertFalse(state.canStartAuction(), "1-person room must NOT be allowed to start live auction");
        assertEquals("At least 2 human members are required to start an auction.", state.validationMessage());

        AllocationException ex = assertThrows(AllocationException.class, () ->
                allocationService.lockAllocation(code, hostId)
        );
        assertEquals(AllocationErrorCode.QUOTA_INCOMPLETE, ex.getErrorCode());
    }

    @Test
    @DisplayName("Start auction succeeds with 2 members when all 10 are claimed (Custom 4/6 split)")
    void testStartAuctionWithCustomAllocation() {
        AuctionRoom room = allocationService.createRoom("IPL Duo", "Hemanth");
        String code = room.getRoomCode();
        String hostId = room.getHostMemberId();

        AllocationStateDto join2 = allocationService.handleMemberJoin(code, "Akshay");
        String akshayId = join2.members().stream().filter(m -> !m.isHost()).findFirst().orElseThrow().memberId();

        // Set Custom Quotas: Hemanth = 4, Akshay = 6
        allocationService.setMemberRequestedQuota(code, hostId, 4);
        allocationService.setMemberRequestedQuota(code, akshayId, 6);

        // Hemanth claims 4
        allocationService.claimFranchise(code, hostId, "MI");
        allocationService.claimFranchise(code, hostId, "CSK");
        allocationService.claimFranchise(code, hostId, "RCB");
        allocationService.claimFranchise(code, hostId, "KKR");

        // Akshay claims 6
        allocationService.claimFranchise(code, akshayId, "SRH");
        allocationService.claimFranchise(code, akshayId, "RR");
        allocationService.claimFranchise(code, akshayId, "DC");
        allocationService.claimFranchise(code, akshayId, "PBKS");
        allocationService.claimFranchise(code, akshayId, "GT");
        allocationService.claimFranchise(code, akshayId, "LSG");

        AllocationStateDto state = allocationService.getAllocationState(code);
        assertTrue(state.canStartAuction(), "Room must be ready to start with 10 human teams assigned");
        assertNull(state.validationMessage());

        // Lock & Start
        AllocationStateDto locked = allocationService.lockAllocation(code, hostId);
        assertEquals(RoomStatus.AUCTION_ACTIVE, locked.status());
        assertEquals(10, locked.claimedTeamCount());
        assertEquals(0, locked.openTeamCount());

        // Post-start mutation rejected
        assertThrows(AllocationException.class, () ->
                allocationService.handleMemberJoin(code, "Intruder")
        );
    }

    @Test
    @DisplayName("Start auction with only 2 selected teams and 8 unselected teams (Must ALLOW start)")
    void testStartAuctionWithPartialFranchiseSelection() {
        AuctionRoom room = allocationService.createRoom("Duo Room", "Hemanth");
        String code = room.getRoomCode();
        String hostId = room.getHostMemberId();

        AllocationStateDto join = allocationService.handleMemberJoin(code, "Akshay");
        String akshayId = join.members().stream().filter(m -> !m.isHost()).findFirst().orElseThrow().memberId();

        // 2 humans join, each selects only ONE team:
        // Host selects MI (1)
        // Akshay selects CSK (1)
        // Remaining 8 franchises are unselected!
        allocationService.claimFranchise(code, hostId, "MI");
        allocationService.claimFranchise(code, akshayId, "CSK");

        AllocationStateDto state = allocationService.getAllocationState(code);
        assertEquals(2, state.claimedTeamCount());
        assertEquals(8, state.openTeamCount());
        assertTrue(state.canStartAuction(), "Start condition must be satisfied with 2 members owning >=1 franchise each!");

        // Lock & Start
        AllocationStateDto locked = allocationService.lockAllocation(code, hostId);
        assertEquals(RoomStatus.AUCTION_ACTIVE, locked.status());
        assertEquals(2, locked.claimedTeamCount());
        assertEquals(8, locked.openTeamCount());

        // Unselected franchises remain INACTIVE and not AI
        FranchiseSeatDto rcb = locked.seats().stream().filter(s -> "RCB".equals(s.code())).findFirst().orElseThrow();
        assertTrue(rcb.isInactive(), "Unselected franchise must be marked INACTIVE");
        assertFalse(rcb.isHuman(), "Unselected franchise must not be human");
    }
}
