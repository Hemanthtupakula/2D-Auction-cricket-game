package com.auctionxi.repository;

import com.auctionxi.entity.AuctionMemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuctionMemberRepository extends JpaRepository<AuctionMemberEntity, String> {
    List<AuctionMemberEntity> findByRoomId(String roomId);
}
