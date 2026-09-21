package com.auctionxi.service;

import com.auctionxi.exception.AllocationErrorCode;
import com.auctionxi.exception.AllocationException;
import com.auctionxi.model.*;
import com.auctionxi.model.dto.AllocationStateDto;
import com.auctionxi.model.dto.FranchiseSeatDto;
import com.auctionxi.model.dto.RoomMemberDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class FairFranchiseAllocationService {
    private static final Logger log = LoggerFactory.getLogger(FairFranchiseAllocationService.class);

    private final RoomStore roomStore;
    private final RealtimePublisher realtimePublisher;

    @Autowired
    public FairFranchiseAllocationService(RoomStore roomStore, RealtimePublisher realtimePublisher) {
        this.roomStore = roomStore;
        this.realtimePublisher = realtimePublisher;
    }

    /**
     * BALANCED RECOMMENDATION ALGORITHM:
     * baseShare = floor(10 / humanMemberCount)
     * remainder = 10 % humanMemberCount
     *
     * Distribute baseShare to everyone.
     * Distribute remainder one by one using deterministic fairness (index 0 first, then join order).
     *
     * Examples:
     * 2 members: 5 / 5
     * 3 members: 4 / 3 / 3
     * 4 members: 3 / 3 / 2 / 2
     * 5 members: 2 / 2 / 2 / 2 / 2
     * 6 members: 2 / 2 / 2 / 2 / 1 / 1
     * 7 members: 2 / 2 / 2 / 1 / 1 / 1 / 1
     * 8 members: 2 / 2 / 1 / 1 / 1 / 1 / 1 / 1
     * 9 members: 2 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1
     * 10 members: 1 each
     */
    public int calculateRecommendedAllocation(int memberIndex, int humanMemberCount) {
        if (humanMemberCount <= 0 || memberIndex < 0 || memberIndex >= humanMemberCount) return 0;
        int baseShare = 10 / humanMemberCount;
        int remainder = 10 % humanMemberCount;
        return baseShare + (memberIndex < remainder ? 1 : 0);
    }

    /**
     * Validates if a custom allocation is mathematically permissible:
     * 1. At least 2 human members required.
     * 2. Every member owns at least 1 team (quota >= 1).
     * 3. Total sum of quotas equals exactly 10.
     * 4. No member exceeds 10 - (humanMemberCount - 1).
     */
    public boolean validateRequestedAllocation(List<Integer> requestedQuotas, int humanMemberCount) {
        if (humanMemberCount < 2 || requestedQuotas == null || requestedQuotas.size() != humanMemberCount) {
            return false;
        }
        int sum = 0;
        int maxAllowedForAnyOne = 10 - (humanMemberCount - 1);
        for (int q : requestedQuotas) {
            if (q < 1 || q > maxAllowedForAnyOne) {
                return false;
            }
            sum += q;
        }
        return sum == 10;
    }

    /**
     * Creates a new auction room with host member.
     */
    public AuctionRoom createRoom(String roomName, String hostDisplayName) {
        return createRoom(roomName, hostDisplayName, 10000L);
    }

    public AuctionRoom createRoom(String roomName, String hostDisplayName, Long startingPurseLakhs) {
        return createRoom(roomName, hostDisplayName, startingPurseLakhs, null);
    }

    public AuctionRoom createRoom(String roomName, String hostDisplayName, Long startingPurseLakhs, String memberIdOverride) {
        String roomId = UUID.randomUUID().toString();
        String roomCode = generateRoomCode();
        // Logged-in accounts keep a stable member id across devices
        String hostMemberId = (memberIdOverride != null && !memberIdOverride.isBlank())
                ? memberIdOverride : UUID.randomUUID().toString();
        long purse = (startingPurseLakhs != null && startingPurseLakhs > 0) ? startingPurseLakhs : 10000L;

        AuctionRoom room = new AuctionRoom(roomId, roomCode, roomName, hostMemberId, purse);
        RoomMember host = new RoomMember(hostMemberId, hostDisplayName, MemberRole.HOST);
        host.setRequestedQuota(10); // initial default for solo lobby before participants join
        room.getMembers().put(hostMemberId, host);
        room.addActivity(hostDisplayName + " created room " + roomCode + ".");

        roomStore.save(room);
        log.info("Created room {} ({}) with host {} and starting purse ₹{} Cr",
                roomCode, roomId, hostDisplayName, purse / 100.0);
        return room;
    }

    /**
     * Member joins room. Triggers balanced allocation recalculation.
     */
    public AllocationStateDto handleMemberJoin(String roomCode, String displayName) {
        return handleMemberJoin(roomCode, displayName, null);
    }

    public AllocationStateDto handleMemberJoin(String roomCode, String displayName, String memberIdOverride) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            // Account resume: a logged-in member already in this room just re-enters
            // (works even if the auction is paused / they closed the tab / play later).
            if (memberIdOverride != null && room.getMembers().containsKey(memberIdOverride)) {
                return buildState(room);
            }

            validateRoomMutable(room);

            if (room.getHumanMemberCount() >= 10) {
                throw new AllocationException(AllocationErrorCode.ROOM_FULL, "Room has reached the maximum of 10 human members.");
            }

            String memberId = (memberIdOverride != null && !memberIdOverride.isBlank())
                    ? memberIdOverride : UUID.randomUUID().toString();
            RoomMember member = new RoomMember(memberId, displayName, MemberRole.PARTICIPANT);
            room.getMembers().put(memberId, member);
            room.addActivity(displayName + " joined the room.");

            // Recalculate balanced recommended quotas
            applyRecommendedQuotasInternal(room);
            checkRebalanceNeeded(room);
            updateReadiness(room);
            room.incrementVersion();

            AllocationStateDto state = buildState(room);
            realtimePublisher.broadcastAllocationState(room.getRoomCode(), state);
            realtimePublisher.broadcastSystemAlert(room.getRoomCode(), displayName + " joined the room.");
            return state;
        } finally {
            room.getLock().unlock();
        }
    }

    /**
     * Member adjusts their requested quota.
     */
    public AllocationStateDto setMemberRequestedQuota(String roomCode, String memberId, int requestedQuota) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            validateRoomMutable(room);

            RoomMember member = room.getMembers().get(memberId);
            if (member == null) {
                throw new AllocationException(AllocationErrorCode.MEMBER_NOT_FOUND, "Member not found: " + memberId);
            }

            int n = room.getHumanMemberCount();
            int maxAllowed = Math.max(1, 10 - (n - 1));
            if (requestedQuota < 1 || requestedQuota > maxAllowed) {
                throw new AllocationException(AllocationErrorCode.QUOTA_EXCEEDED,
                        String.format("Requested quota must be between 1 and %d teams.", maxAllowed));
            }

            member.setRequestedQuota(requestedQuota);
            room.addActivity(member.getDisplayName() + " changed requested quota to " + requestedQuota + ".");

            checkRebalanceNeeded(room);
            updateReadiness(room);
            room.incrementVersion();

            AllocationStateDto state = buildState(room);
            realtimePublisher.broadcastAllocationState(room.getRoomCode(), state);
            return state;
        } finally {
            room.getLock().unlock();
        }
    }

    /**
     * One-click apply balanced allocation for all current members.
     */
    public AllocationStateDto applyRecommendedAllocation(String roomCode) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            validateRoomMutable(room);
            applyRecommendedQuotasInternal(room);
            room.addActivity("Applied balanced allocation preset (" + getBalancedDistributionSummary(room) + ").");

            checkRebalanceNeeded(room);
            updateReadiness(room);
            room.incrementVersion();

            AllocationStateDto state = buildState(room);
            realtimePublisher.broadcastAllocationState(room.getRoomCode(), state);
            return state;
        } finally {
            room.getLock().unlock();
        }
    }

    /**
     * Claim franchise by member.
     */
    public AllocationStateDto claimFranchise(String roomCode, String memberId, String franchiseCode) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            validateRoomMutable(room);

            RoomMember member = room.getMembers().get(memberId);
            if (member == null) {
                throw new AllocationException(AllocationErrorCode.MEMBER_NOT_FOUND, "Member not found: " + memberId);
            }

            Franchise franchise = Franchise.fromCode(franchiseCode)
                    .orElseThrow(() -> new AllocationException(AllocationErrorCode.FRANCHISE_INVALID, "Unknown franchise code: " + franchiseCode));

            FranchiseSeat seat = room.getSeat(franchise.getCode());
            if (!seat.isOpen()) {
                throw new AllocationException(AllocationErrorCode.FRANCHISE_ALREADY_TAKEN,
                        "Franchise " + franchise.getFullName() + " (" + franchise.getCode() + ") is already taken by " + seat.getOwnerDisplayName());
            }

            List<FranchiseSeat> currentSeats = room.getSeatsForMember(memberId);
            int targetQuota = member.getRequestedQuota();

            if (currentSeats.size() >= targetQuota) {
                throw new AllocationException(AllocationErrorCode.QUOTA_EXCEEDED,
                        String.format("%s already holds their requested quota of %d franchise(s).",
                                member.getDisplayName(), targetQuota));
            }

            seat.claimByHuman(member.getMemberId(), member.getDisplayName());
            FranchiseAuctionState fState = room.getFranchiseAuctionState(franchise.getCode());
            if (fState != null) {
                fState.setOwnerMemberId(member.getMemberId());
                fState.setActive(true);
            }
            room.addActivity(member.getDisplayName() + " selected " + franchise.getCode() + ".");

            checkRebalanceNeeded(room);
            updateReadiness(room);
            room.incrementVersion();

            AllocationStateDto state = buildState(room);
            realtimePublisher.broadcastAllocationState(room.getRoomCode(), state);
            return state;
        } finally {
            room.getLock().unlock();
        }
    }

    /**
     * Release franchise by owner.
     */
    public AllocationStateDto releaseFranchise(String roomCode, String memberId, String franchiseCode) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            validateRoomMutable(room);

            Franchise franchise = Franchise.fromCode(franchiseCode)
                    .orElseThrow(() -> new AllocationException(AllocationErrorCode.FRANCHISE_INVALID, "Unknown franchise code: " + franchiseCode));

            FranchiseSeat seat = room.getSeat(franchise.getCode());
            if (seat.isOpen() || !memberId.equals(seat.getOwnerMemberId())) {
                throw new AllocationException(AllocationErrorCode.NOT_FRANCHISE_OWNER, "You do not own franchise " + franchise.getCode());
            }

            RoomMember member = room.getMembers().get(memberId);
            String name = member != null ? member.getDisplayName() : "Member";

            seat.release();
            room.addActivity(name + " released " + franchise.getCode() + ".");

            checkRebalanceNeeded(room);
            updateReadiness(room);
            room.incrementVersion();

            AllocationStateDto state = buildState(room);
            realtimePublisher.broadcastAllocationState(room.getRoomCode(), state);
            return state;
        } finally {
            room.getLock().unlock();
        }
    }

    /**
     * Change / switch franchise from old to new.
     */
    public AllocationStateDto changeFranchise(String roomCode, String memberId, String oldCode, String newCode) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            validateRoomMutable(room);

            RoomMember member = room.getMembers().get(memberId);
            if (member == null) {
                throw new AllocationException(AllocationErrorCode.MEMBER_NOT_FOUND, "Member not found: " + memberId);
            }

            Franchise oldFranchise = Franchise.fromCode(oldCode)
                    .orElseThrow(() -> new AllocationException(AllocationErrorCode.FRANCHISE_INVALID, "Invalid old franchise: " + oldCode));
            Franchise newFranchise = Franchise.fromCode(newCode)
                    .orElseThrow(() -> new AllocationException(AllocationErrorCode.FRANCHISE_INVALID, "Invalid new franchise: " + newCode));

            FranchiseSeat oldSeat = room.getSeat(oldFranchise.getCode());
            FranchiseSeat newSeat = room.getSeat(newFranchise.getCode());

            if (!memberId.equals(oldSeat.getOwnerMemberId())) {
                throw new AllocationException(AllocationErrorCode.NOT_FRANCHISE_OWNER, "You do not own " + oldFranchise.getCode());
            }

            if (!newSeat.isOpen()) {
                throw new AllocationException(AllocationErrorCode.FRANCHISE_ALREADY_TAKEN,
                        "Franchise " + newFranchise.getFullName() + " is already taken by " + newSeat.getOwnerDisplayName());
            }

            // Atomic switch
            oldSeat.release();
            newSeat.claimByHuman(member.getMemberId(), member.getDisplayName());
            room.addActivity(member.getDisplayName() + " switched from " + oldFranchise.getCode() + " to " + newFranchise.getCode() + ".");

            checkRebalanceNeeded(room);
            updateReadiness(room);
            room.incrementVersion();

            AllocationStateDto state = buildState(room);
            realtimePublisher.broadcastAllocationState(room.getRoomCode(), state);
            return state;
        } finally {
            room.getLock().unlock();
        }
    }

    /**
     * Member leaves room. Automatically releases all held franchises and recalculates quotas.
     */
    public AllocationStateDto handleMemberLeave(String roomCode, String memberId) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            validateRoomMutable(room);

            RoomMember member = room.getMembers().remove(memberId);
            if (member == null) {
                return buildState(room);
            }

            for (FranchiseSeat seat : room.getSeatsForMember(memberId)) {
                seat.release();
            }
            room.addActivity(member.getDisplayName() + " left the room.");

            // If leaving member was host, reassign host
            if (member.isHost() && !room.getMembers().isEmpty()) {
                RoomMember newHost = room.getOrderedMembers().getFirst();
                newHost.setRole(MemberRole.HOST);
                room.setHostMemberId(newHost.getMemberId());
                room.addActivity("Host reassigned to " + newHost.getDisplayName() + ".");
            }

            applyRecommendedQuotasInternal(room);
            checkRebalanceNeeded(room);
            updateReadiness(room);
            room.incrementVersion();

            AllocationStateDto state = buildState(room);
            realtimePublisher.broadcastAllocationState(room.getRoomCode(), state);
            realtimePublisher.broadcastSystemAlert(room.getRoomCode(), member.getDisplayName() + " left the room. Allocation quotas updated.");
            return state;
        } finally {
            room.getLock().unlock();
        }
    }

    /**
     * Pre-start validation:
     * - At least 2 human members
     * - Every member owns at least 1 team
     * - Selected franchise count <= 10
     * - No duplicate franchise
     * - Zero AI
     */
    public String validateBeforeStart(AuctionRoom room) {
        int humanMembers = room.getHumanMemberCount();
        if (humanMembers < 2) {
            return "At least 2 human members are required to start an auction.";
        }

        for (RoomMember m : room.getOrderedMembers()) {
            int held = room.getSeatsForMember(m.getMemberId()).size();
            if (held < 1) {
                return String.format("Every human member must own at least 1 franchise. %s has 0 teams.", m.getDisplayName());
            }
        }

        long claimedCount = room.getSeats().values().stream().filter(FranchiseSeat::isHuman).count();
        if (claimedCount > 10) {
            return "Maximum 10 franchises can be selected.";
        }

        if (room.isRebalancePending()) {
            return "Room allocation must be balanced before auction can start.";
        }

        return null; // Valid and ready to start
    }

    /**
     * LOCK TEAMS & START AUCTION:
     * Permanent lock. No modifications permitted after this call.
     * Unselected franchises remain INACTIVE (not AI, cannot bid).
     */
    public AllocationStateDto lockAllocation(String roomCode, String hostMemberId) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            validateRoomMutable(room);

            if (!hostMemberId.equals(room.getHostMemberId())) {
                throw new AllocationException(AllocationErrorCode.NOT_ROOM_HOST, "Only the host can lock teams and start the auction.");
            }

            String validationError = validateBeforeStart(room);
            if (validationError != null) {
                throw new AllocationException(AllocationErrorCode.QUOTA_INCOMPLETE, validationError);
            }

            // Mark all unselected franchises as INACTIVE
            for (FranchiseSeat seat : room.getSeats().values()) {
                if (seat.isOpen()) {
                    seat.markInactive();
                }
            }

            // Permanent lock
            room.setStatus(RoomStatus.AUCTION_ACTIVE);
            long selectedCount = room.getSeats().values().stream().filter(FranchiseSeat::isHuman).count();
            long inactiveCount = room.getSeats().values().stream().filter(FranchiseSeat::isInactive).count();
            room.addActivity(String.format("Teams locked! %d Human Franchises active. %d Unselected Franchises inactive (Zero AI). Auction starting.",
                    selectedCount, inactiveCount));
            room.incrementVersion();

            log.info("AUCTION LOCKED & STARTED for room {}. Selected: {}, Inactive: {}. ZERO AI.",
                    room.getRoomCode(), selectedCount, inactiveCount);

            AllocationStateDto state = buildState(room);
            realtimePublisher.broadcastAllocationState(room.getRoomCode(), state);
            realtimePublisher.broadcastSystemAlert(room.getRoomCode(), "Teams locked! Auction starting with " + selectedCount + " human franchises.");
            return state;
        } finally {
            room.getLock().unlock();
        }
    }

    public AllocationStateDto getAllocationState(String roomCode) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            return buildState(room);
        } finally {
            room.getLock().unlock();
        }
    }

    private void applyRecommendedQuotasInternal(AuctionRoom room) {
        List<RoomMember> ordered = room.getOrderedMembers();
        int n = ordered.size();
        for (int i = 0; i < n; i++) {
            int rec = calculateRecommendedAllocation(i, n);
            ordered.get(i).setRequestedQuota(rec);
        }
    }

    private void checkRebalanceNeeded(AuctionRoom room) {
        boolean needed = false;
        for (RoomMember m : room.getOrderedMembers()) {
            int held = room.getSeatsForMember(m.getMemberId()).size();
            if (held > m.getRequestedQuota()) {
                needed = true;
                break;
            }
        }
        room.setRebalancePending(needed);
    }

    private void validateRoomMutable(AuctionRoom room) {
        if (room.getStatus() != RoomStatus.LOBBY && room.getStatus() != RoomStatus.READY) {
            throw new AllocationException(AllocationErrorCode.AUCTION_ALREADY_STARTED,
                    "Action not permitted: Room allocation is locked as auction is " + room.getStatus());
        }
    }

    private void updateReadiness(AuctionRoom room) {
        if (room.getStatus() == RoomStatus.AUCTION_ACTIVE || room.getStatus() == RoomStatus.COMPLETED) {
            return;
        }
        String error = validateBeforeStart(room);
        if (error == null) {
            room.setStatus(RoomStatus.READY);
        } else {
            room.setStatus(RoomStatus.LOBBY);
        }
    }

    private String getBalancedDistributionSummary(AuctionRoom room) {
        List<String> shares = new ArrayList<>();
        List<RoomMember> ordered = room.getOrderedMembers();
        for (RoomMember m : ordered) {
            shares.add(String.valueOf(m.getRequestedQuota()));
        }
        return String.join(" / ", shares);
    }

    private AllocationStateDto buildState(AuctionRoom room) {
        int humanCount = room.getHumanMemberCount();
        long claimedCount = room.getSeats().values().stream().filter(FranchiseSeat::isHuman).count();
        long unselectedCount = 10 - claimedCount;

        String validationError = validateBeforeStart(room);
        boolean canStart = (validationError == null);

        int totalRequested = room.getOrderedMembers().stream()
                .mapToInt(RoomMember::getRequestedQuota)
                .sum();

        List<FranchiseSeatDto> seatDtos = room.getSeats().values().stream()
                .sorted(Comparator.comparing(s -> s.getFranchise().ordinal()))
                .map(FranchiseSeatDto::from)
                .toList();

        List<RoomMemberDto> memberDtos = room.getOrderedMembers().stream()
                .map(m -> {
                    int idx = room.getMemberIndex(m.getMemberId());
                    int recQuota = calculateRecommendedAllocation(idx, humanCount);
                    List<String> owned = room.getSeatsForMember(m.getMemberId()).stream()
                            .map(FranchiseSeat::getFranchiseCode)
                            .toList();
                    return RoomMemberDto.from(m, recQuota, owned);
                })
                .toList();

        return new AllocationStateDto(
                room.getRoomId(),
                room.getRoomCode(),
                room.getRoomName(),
                room.getStatus(),
                room.getHostMemberId(),
                humanCount,
                (int) unselectedCount,
                (int) claimedCount,
                canStart,
                canStart,
                validationError,
                totalRequested,
                room.isRebalancePending(),
                seatDtos,
                memberDtos,
                room.getActivityFeed(),
                room.getVersion()
        );
    }

    private AuctionRoom getRoomOrThrow(String roomCode) {
        return roomStore.findByCode(roomCode)
                .orElseThrow(() -> new AllocationException(AllocationErrorCode.ROOM_NOT_FOUND, "Room not found with code: " + roomCode));
    }

    private String generateRoomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder(6);
        Random random = new Random();
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
