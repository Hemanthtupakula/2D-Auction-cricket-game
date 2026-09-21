package com.auctionxi.repository;

import com.auctionxi.entity.AuctionLotEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuctionLotRepository extends JpaRepository<AuctionLotEntity, String> {
    List<AuctionLotEntity> findByAuctionSessionIdOrderBySequenceNoAsc(String auctionSessionId);
}
