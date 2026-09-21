package com.auctionxi.repository;

import com.auctionxi.entity.SeasonEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SeasonRepository extends JpaRepository<SeasonEntity, String> {
    Optional<SeasonEntity> findByRoomId(String roomId);
}
