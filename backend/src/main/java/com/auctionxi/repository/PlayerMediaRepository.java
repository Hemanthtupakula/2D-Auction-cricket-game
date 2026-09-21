package com.auctionxi.repository;

import com.auctionxi.entity.PlayerMediaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlayerMediaRepository extends JpaRepository<PlayerMediaEntity, String> {
    List<PlayerMediaEntity> findByPlayerId(String playerId);
}
