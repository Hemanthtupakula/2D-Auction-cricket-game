package com.auctionxi.repository;

import com.auctionxi.entity.SeasonTeamEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeasonTeamRepository extends JpaRepository<SeasonTeamEntity, String> {
    List<SeasonTeamEntity> findBySeasonId(String seasonId);
}
