package com.auctionxi.repository;

import com.auctionxi.entity.RoomStateSnapshotEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomStateSnapshotRepository extends JpaRepository<RoomStateSnapshotEntity, String> {
    List<RoomStateSnapshotEntity> findByRoomIdOrderByVersionDesc(String roomId);
}
