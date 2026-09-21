package com.auctionxi.repository;

import com.auctionxi.entity.AuctionRoomEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AuctionRoomRepository extends JpaRepository<AuctionRoomEntity, String> {
    Optional<AuctionRoomEntity> findByCode(String code);
}
