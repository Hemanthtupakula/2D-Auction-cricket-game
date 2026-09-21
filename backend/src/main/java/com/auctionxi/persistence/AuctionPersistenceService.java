package com.auctionxi.persistence;

import com.auctionxi.entity.*;
import com.auctionxi.model.*;
import com.auctionxi.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class AuctionPersistenceService {

    private static final Logger log = LoggerFactory.getLogger(AuctionPersistenceService.class);

    private final AuctionRoomRepository roomRepository;
    private final AuctionMemberRepository memberRepository;
    private final FranchiseAllocationRepository allocationRepository;
    private final SquadRepository squadRepository;
    private final SquadPlayerRepository squadPlayerRepository;
    private final AuctionSessionRepository sessionRepository;
    private final AuctionLotRepository lotRepository;
    private final AuctionBidRepository bidRepository;
    private final AuctionPurchaseRepository purchaseRepository;
    private final AuctionEventRepository eventRepository;
    private final RoomStateSnapshotRepository snapshotRepository;
    private final ObjectMapper objectMapper;

    public AuctionPersistenceService(
            AuctionRoomRepository roomRepository,
            AuctionMemberRepository memberRepository,
            FranchiseAllocationRepository allocationRepository,
            SquadRepository squadRepository,
            SquadPlayerRepository squadPlayerRepository,
            AuctionSessionRepository sessionRepository,
            AuctionLotRepository lotRepository,
            AuctionBidRepository bidRepository,
            AuctionPurchaseRepository purchaseRepository,
            AuctionEventRepository eventRepository,
            RoomStateSnapshotRepository snapshotRepository,
            ObjectMapper objectMapper) {
        this.roomRepository = roomRepository;
        this.memberRepository = memberRepository;
        this.allocationRepository = allocationRepository;
        this.squadRepository = squadRepository;
        this.squadPlayerRepository = squadPlayerRepository;
        this.sessionRepository = sessionRepository;
        this.lotRepository = lotRepository;
        this.bidRepository = bidRepository;
        this.purchaseRepository = purchaseRepository;
        this.eventRepository = eventRepository;
        this.snapshotRepository = snapshotRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void saveRoom(AuctionRoom room) {
        if (room == null || room.getRoomId() == null) return;
        try {
            AuctionRoomEntity entity = roomRepository.findById(room.getRoomId())
                    .orElseGet(() -> {
                        AuctionRoomEntity e = new AuctionRoomEntity();
                        e.setRoomId(room.getRoomId());
                        e.setCreatedAt(Instant.now());
                        return e;
                    });

            entity.setCode(room.getRoomCode());
            entity.setName(room.getRoomName());
            entity.setHostMemberId(room.getHostMemberId());
            entity.setStatus(room.getStatus() != null ? room.getStatus().name() : "LOBBY");
            entity.setMaxFranchises(room.getSeats() != null ? room.getSeats().size() : 10);
            entity.setStartingPurseLakhs(room.getStartingPurseLakhs());
            entity.setVersion(room.getVersion());
            entity.setUpdatedAt(Instant.now());

            roomRepository.save(entity);
        } catch (Exception e) {
            log.error("Failed to persist room {}: {}", room.getRoomId(), e.getMessage());
        }
    }

    @Transactional
    public void saveMember(String roomId, RoomMember member) {
        if (roomId == null || member == null || member.getMemberId() == null) return;
        try {
            AuctionMemberEntity entity = memberRepository.findById(member.getMemberId())
                    .orElseGet(() -> {
                        AuctionMemberEntity e = new AuctionMemberEntity();
                        e.setMemberId(member.getMemberId());
                        e.setRoomId(roomId);
                        e.setJoinedAt(Instant.now());
                        return e;
                    });

            entity.setDisplayName(member.getDisplayName());
            entity.setRole(member.getRole() != null ? member.getRole().name() : "PARTICIPANT");
            entity.setRequestedQuota(member.getRequestedQuota());
            entity.setLastHeartbeat(Instant.now());

            memberRepository.save(entity);
        } catch (Exception e) {
            log.error("Failed to persist member {}: {}", member.getMemberId(), e.getMessage());
        }
    }

    @Transactional
    public void saveAllocation(String roomId, FranchiseSeat seat) {
        if (roomId == null || seat == null || seat.getFranchiseCode() == null) return;
        try {
            String allocId = roomId + ":" + seat.getFranchiseCode();
            FranchiseAllocationEntity entity = allocationRepository.findById(allocId)
                    .orElseGet(() -> {
                        FranchiseAllocationEntity e = new FranchiseAllocationEntity();
                        e.setAllocationId(allocId);
                        e.setRoomId(roomId);
                        e.setFranchiseCode(seat.getFranchiseCode());
                        return e;
                    });

            entity.setOwnerType(seat.getOwnerType() != null ? seat.getOwnerType().name() : "UNASSIGNED");
            entity.setMemberId(seat.getOwnerMemberId());
            entity.setMemberDisplayName(seat.getOwnerDisplayName());
            if (seat.getOwnerMemberId() != null && entity.getAssignedAt() == null) {
                entity.setAssignedAt(Instant.now());
            }

            allocationRepository.save(entity);
        } catch (Exception e) {
            log.error("Failed to persist allocation {}/{}: {}", roomId, seat.getFranchiseCode(), e.getMessage());
        }
    }

    @Transactional
    public void saveBid(String roomId, String playerId, AuctionBid bid) {
        if (roomId == null || bid == null || playerId == null) return;
        try {
            AuctionBidEntity entity = new AuctionBidEntity();
            entity.setBidId(UUID.randomUUID().toString());
            entity.setRoomId(roomId);
            entity.setPlayerId(playerId);
            entity.setFranchiseCode(bid.franchiseCode());
            entity.setMemberId(bid.memberId());
            entity.setAmountLakhs(bid.amountLakhs());
            entity.setSequenceNo(System.currentTimeMillis());
            entity.setServerTimestamp(bid.timestamp() != null ? bid.timestamp() : Instant.now());

            bidRepository.save(entity);
        } catch (Exception e) {
            log.error("Failed to persist bid for room {}: {}", roomId, e.getMessage());
        }
    }

    @Transactional
    public void savePurchase(String roomId, String playerId, String franchiseCode, long amountLakhs) {
        if (roomId == null || playerId == null || franchiseCode == null) return;
        try {
            String purchaseId = roomId + ":" + playerId;
            AuctionPurchaseEntity purchase = new AuctionPurchaseEntity();
            purchase.setPurchaseId(purchaseId);
            purchase.setRoomId(roomId);
            purchase.setPlayerId(playerId);
            purchase.setFranchiseCode(franchiseCode);
            purchase.setAmountLakhs(amountLakhs);
            purchase.setStatus("SOLD");
            purchase.setCreatedAt(Instant.now());

            purchaseRepository.save(purchase);

            String squadPlayerId = roomId + ":" + franchiseCode + ":" + playerId;
            SquadPlayerEntity squadPlayer = squadPlayerRepository.findById(squadPlayerId)
                    .orElseGet(() -> {
                        SquadPlayerEntity spe = new SquadPlayerEntity();
                        spe.setSquadPlayerId(squadPlayerId);
                        spe.setRoomId(roomId);
                        spe.setFranchiseCode(franchiseCode);
                        spe.setPlayerId(playerId);
                        return spe;
                    });
            squadPlayer.setPurchaseId(purchaseId);
            squadPlayer.setPriceLakhs(amountLakhs);
            squadPlayer.setAcquiredAt(Instant.now());

            squadPlayerRepository.save(squadPlayer);
        } catch (Exception e) {
            log.error("Failed to persist purchase {}/{}/{}: {}", roomId, playerId, franchiseCode, e.getMessage());
        }
    }

    @Transactional
    public void saveSnapshot(String roomId, long version, Object state) {
        if (roomId == null || state == null) return;
        try {
            String snapshotId = roomId + ":" + version;
            RoomStateSnapshotEntity snapshot = new RoomStateSnapshotEntity();
            snapshot.setSnapshotId(snapshotId);
            snapshot.setRoomId(roomId);
            snapshot.setVersion(version);
            snapshot.setState(objectMapper.writeValueAsString(state));
            snapshot.setCreatedAt(Instant.now());

            snapshotRepository.save(snapshot);
        } catch (Exception e) {
            log.error("Failed to persist room state snapshot {}/{}: {}", roomId, version, e.getMessage());
        }
    }
}
