package com.auctionxi.repository;

import com.auctionxi.entity.MatchPlayerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MatchPlayerRepository extends JpaRepository<MatchPlayerEntity, String> {
    List<MatchPlayerEntity> findByMatchId(String matchId);
}
