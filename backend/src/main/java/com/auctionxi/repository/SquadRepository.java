package com.auctionxi.repository;

import com.auctionxi.entity.SquadEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SquadRepository extends JpaRepository<SquadEntity, String> {
    List<SquadEntity> findByRoomId(String roomId);
    Optional<SquadEntity> findByRoomIdAndFranchiseCode(String roomId, String franchiseCode);
}
