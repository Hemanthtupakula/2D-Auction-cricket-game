package com.auctionxi.repository;

import com.auctionxi.entity.SeasonFixtureEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeasonFixtureRepository extends JpaRepository<SeasonFixtureEntity, String> {
    List<SeasonFixtureEntity> findBySeasonId(String seasonId);
}
