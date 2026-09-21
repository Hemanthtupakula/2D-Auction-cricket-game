package com.auctionxi.repository;

import com.auctionxi.entity.AuctionPurchaseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuctionPurchaseRepository extends JpaRepository<AuctionPurchaseEntity, String> {
    List<AuctionPurchaseEntity> findByRoomId(String roomId);
}
