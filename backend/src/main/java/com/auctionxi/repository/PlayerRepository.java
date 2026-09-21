package com.auctionxi.repository;

import com.auctionxi.entity.PlayerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlayerRepository extends JpaRepository<PlayerEntity, String> {
    List<PlayerEntity> findByAuctionSet(String auctionSet);
    List<PlayerEntity> findByRole(String role);
}
