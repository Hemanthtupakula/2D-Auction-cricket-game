package com.auctionxi.repository;

import com.auctionxi.entity.FranchiseAllocationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FranchiseAllocationRepository extends JpaRepository<FranchiseAllocationEntity, String> {
    List<FranchiseAllocationEntity> findByRoomId(String roomId);
    Optional<FranchiseAllocationEntity> findByRoomIdAndFranchiseCode(String roomId, String franchiseCode);
}
