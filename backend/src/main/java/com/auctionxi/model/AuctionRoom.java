package com.auctionxi.model;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.locks.ReentrantLock;

public class AuctionRoom {
    private final String roomId;
    private final String roomCode;
    private final String roomName;
    private String hostMemberId;
    private RoomStatus status;
    private final Map<String, RoomMember> members;
    private final Map<String, FranchiseSeat> seats;
    private final List<String> activityFeed;
    private final ReentrantLock lock;

    private boolean rebalancePending;

    // Season Mode (Phase 5): persists the finished season's champion for lobby bragging rights
    private String championFranchise;

    // Live Auction State
    private AuctionLot currentLot;
    private final List<AuctionLot> completedLots;
    private final Set<String> auctionedPlayerIds;
    private final Map<String, FranchiseAuctionState> franchiseAuctionStates;
    private boolean isPaused;
    private long pauseRemainingMillis;

    // Category Flow State
    private String currentCategory;
    private String currentCategoryName;
    private int currentCategoryIndex;
    private final Set<String> categoryConfirmedFranchises;
    private final Set<String> remainingCategoryPlayerIds;
    private boolean categoryActive;

    private final long startingPurseLakhs;
    private long version;
    private final Instant createdAt;
    private Instant updatedAt;

    public AuctionRoom(String roomId, String roomCode, String roomName, String hostMemberId) {
        this(roomId, roomCode, roomName, hostMemberId, 10000L); // Default ₹100.00 Cr
    }

    public AuctionRoom(String roomId, String roomCode, String roomName, String hostMemberId, long startingPurseLakhs) {
        this.roomId = Objects.requireNonNull(roomId, "roomId cannot be null");
        this.roomCode = Objects.requireNonNull(roomCode, "roomCode cannot be null").toUpperCase();
        this.roomName = Objects.requireNonNull(roomName, "roomName cannot be null");
        this.hostMemberId = Objects.requireNonNull(hostMemberId, "hostMemberId cannot be null");
        this.startingPurseLakhs = startingPurseLakhs > 0 ? startingPurseLakhs : 10000L;
        this.status = RoomStatus.LOBBY;
        this.members = new ConcurrentHashMap<>();
        this.seats = new ConcurrentHashMap<>(10);
        this.activityFeed = new CopyOnWriteArrayList<>();
        this.lock = new ReentrantLock(true); // fair lock for FIFO ordering

        this.completedLots = new CopyOnWriteArrayList<>();
        this.auctionedPlayerIds = ConcurrentHashMap.newKeySet();
        this.franchiseAuctionStates = new ConcurrentHashMap<>(10);
        this.isPaused = false;
        this.pauseRemainingMillis = 0L;

        // Initialize exactly 10 franchises with room's starting purse
        for (Franchise f : Franchise.values()) {
            this.seats.put(f.getCode(), new FranchiseSeat(f));
            this.franchiseAuctionStates.put(f.getCode(), new FranchiseAuctionState(f, this.startingPurseLakhs));
        }

        this.currentCategory = null;
        this.currentCategoryName = null;
        this.currentCategoryIndex = 0;
        this.categoryConfirmedFranchises = ConcurrentHashMap.newKeySet();
        this.remainingCategoryPlayerIds = ConcurrentHashMap.newKeySet();
        this.playerPreSkips = new ConcurrentHashMap<>();
        this.categoryActive = false;

        this.rebalancePending = false;
        this.version = 1L;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    private final Map<String, Set<String>> playerPreSkips;

    public boolean togglePlayerPreSkip(String playerId, String franchiseCode) {
        if (playerId == null || franchiseCode == null) return false;
        String fCode = franchiseCode.toUpperCase();
        Set<String> skips = playerPreSkips.computeIfAbsent(playerId, k -> ConcurrentHashMap.newKeySet());
        boolean added;
        if (skips.contains(fCode)) {
            skips.remove(fCode);
            added = false;
        } else {
            skips.add(fCode);
            added = true;
        }
        this.updatedAt = Instant.now();
        return added;
    }

    public Set<String> getPreSkippedFranchises(String playerId) {
        if (playerId == null) return Set.of();
        Set<String> set = playerPreSkips.get(playerId);
        return set != null ? Collections.unmodifiableSet(set) : Set.of();
    }

    public Map<String, Set<String>> getPlayerPreSkips() {
        return Collections.unmodifiableMap(playerPreSkips);
    }

    public long getStartingPurseLakhs() {
        return startingPurseLakhs;
    }

    public ReentrantLock getLock() {
        return lock;
    }

    public String getRoomId() {
        return roomId;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public String getRoomName() {
        return roomName;
    }

    public String getHostMemberId() {
        return hostMemberId;
    }

    public void setHostMemberId(String hostMemberId) {
        this.hostMemberId = hostMemberId;
    }

    public RoomStatus getStatus() {
        return status;
    }

    public void setStatus(RoomStatus status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }

    public Map<String, RoomMember> getMembers() {
        return members;
    }

    public Map<String, FranchiseSeat> getSeats() {
        return seats;
    }

    public FranchiseSeat getSeat(String franchiseCode) {
        if (franchiseCode == null) return null;
        return seats.get(franchiseCode.toUpperCase());
    }

    public List<FranchiseSeat> getSeatsForMember(String memberId) {
        if (memberId == null) return List.of();
        return seats.values().stream()
                .filter(s -> s.isHuman() && memberId.equals(s.getOwnerMemberId()))
                .toList();
    }

    public List<RoomMember> getOrderedMembers() {
        RoomMember host = members.get(hostMemberId);
        List<RoomMember> list = new ArrayList<>();
        if (host != null) {
            list.add(host);
        }
        members.values().stream()
                .filter(m -> !m.getMemberId().equals(hostMemberId))
                .sorted(Comparator.comparing(RoomMember::getJoinedAt))
                .forEach(list::add);
        return list;
    }

    public int getMemberIndex(String memberId) {
        List<RoomMember> ordered = getOrderedMembers();
        for (int i = 0; i < ordered.size(); i++) {
            if (ordered.get(i).getMemberId().equals(memberId)) {
                return i;
            }
        }
        return -1;
    }

    public int getHumanMemberCount() {
        return members.size();
    }

    public boolean isRebalancePending() {
        return rebalancePending;
    }

    public String getChampionFranchise() {
        return championFranchise;
    }

    public void setChampionFranchise(String championFranchise) {
        this.championFranchise = championFranchise;
        this.updatedAt = Instant.now();
    }

    public void setRebalancePending(boolean rebalancePending) {
        this.rebalancePending = rebalancePending;
        this.updatedAt = Instant.now();
    }

    public void addActivity(String message) {
        activityFeed.add(0, message);
        while (activityFeed.size() > 30) {
            activityFeed.remove(activityFeed.size() - 1);
        }
        this.updatedAt = Instant.now();
    }

    public List<String> getActivityFeed() {
        return Collections.unmodifiableList(activityFeed);
    }

    // Live Auction Getters and Setters
    public AuctionLot getCurrentLot() {
        return currentLot;
    }

    public void setCurrentLot(AuctionLot currentLot) {
        this.currentLot = currentLot;
        if (currentLot != null && currentLot.getPlayer() != null) {
            this.auctionedPlayerIds.add(currentLot.getPlayer().getId());
        }
        this.updatedAt = Instant.now();
    }

    public List<AuctionLot> getCompletedLots() {
        return Collections.unmodifiableList(completedLots);
    }

    public void addCompletedLot(AuctionLot lot) {
        this.completedLots.add(lot);
        this.updatedAt = Instant.now();
    }

    public Set<String> getAuctionedPlayerIds() {
        return Collections.unmodifiableSet(auctionedPlayerIds);
    }

    public void addAuctionedPlayerId(String playerId) {
        this.auctionedPlayerIds.add(playerId);
        this.updatedAt = Instant.now();
    }

    public Map<String, FranchiseAuctionState> getFranchiseAuctionStates() {
        return franchiseAuctionStates;
    }

    public FranchiseAuctionState getFranchiseAuctionState(String franchiseCode) {
        if (franchiseCode == null) return null;
        return franchiseAuctionStates.get(franchiseCode.toUpperCase());
    }

    public boolean isPaused() {
        return isPaused;
    }

    public void setPaused(boolean paused) {
        isPaused = paused;
        this.updatedAt = Instant.now();
    }

    public long getPauseRemainingMillis() {
        return pauseRemainingMillis;
    }

    public void setPauseRemainingMillis(long pauseRemainingMillis) {
        this.pauseRemainingMillis = pauseRemainingMillis;
        this.updatedAt = Instant.now();
    }

    public long incrementVersion() {
        this.updatedAt = Instant.now();
        return ++this.version;
    }

    public long getVersion() {
        return version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public String getCurrentCategory() {
        return currentCategory;
    }

    public void setCurrentCategory(String currentCategory) {
        this.currentCategory = currentCategory;
        this.updatedAt = Instant.now();
    }

    public String getCurrentCategoryName() {
        return currentCategoryName;
    }

    public void setCurrentCategoryName(String currentCategoryName) {
        this.currentCategoryName = currentCategoryName;
        this.updatedAt = Instant.now();
    }

    public int getCurrentCategoryIndex() {
        return currentCategoryIndex;
    }

    public void setCurrentCategoryIndex(int currentCategoryIndex) {
        this.currentCategoryIndex = currentCategoryIndex;
        this.updatedAt = Instant.now();
    }

    public boolean confirmFranchiseForCategory(String franchiseCode) {
        if (franchiseCode == null) return false;
        boolean added = this.categoryConfirmedFranchises.add(franchiseCode.toUpperCase());
        this.updatedAt = Instant.now();
        return added;
    }

    public void clearCategoryConfirmations() {
        this.categoryConfirmedFranchises.clear();
        this.updatedAt = Instant.now();
    }

    public Set<String> getCategoryConfirmedFranchises() {
        return Collections.unmodifiableSet(categoryConfirmedFranchises);
    }

    public boolean isCategoryActive() {
        return categoryActive;
    }

    public void setCategoryActive(boolean categoryActive) {
        this.categoryActive = categoryActive;
        this.updatedAt = Instant.now();
    }

    public Set<String> getRemainingCategoryPlayerIds() {
        return remainingCategoryPlayerIds;
    }

    public void setRemainingCategoryPlayerIds(Set<String> ids) {
        this.remainingCategoryPlayerIds.clear();
        if (ids != null) {
            this.remainingCategoryPlayerIds.addAll(ids);
        }
        this.updatedAt = Instant.now();
    }
}
