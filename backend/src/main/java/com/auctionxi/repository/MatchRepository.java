package com.auctionxi.repository;

import com.auctionxi.entity.MatchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MatchRepository extends JpaRepository<MatchEntity, String> {
    List<MatchEntity> findByRoomId(String roomId);
}
