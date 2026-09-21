package com.auctionxi.repository;

import com.auctionxi.entity.SquadPlayerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SquadPlayerRepository extends JpaRepository<SquadPlayerEntity, String> {
    List<SquadPlayerEntity> findByRoomId(String roomId);
    List<SquadPlayerEntity> findByRoomIdAndFranchiseCode(String roomId, String franchiseCode);
}
