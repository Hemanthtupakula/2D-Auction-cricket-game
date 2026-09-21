package com.auctionxi.repository;

import com.auctionxi.entity.AuctionEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuctionEventRepository extends JpaRepository<AuctionEventEntity, String> {
    List<AuctionEventEntity> findByRoomIdOrderBySequenceNoAsc(String roomId);
}
