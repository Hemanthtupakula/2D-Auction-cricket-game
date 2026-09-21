package com.auctionxi.repository;

import com.auctionxi.entity.AuctionSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AuctionSessionRepository extends JpaRepository<AuctionSessionEntity, String> {
    Optional<AuctionSessionEntity> findByRoomId(String roomId);
}
