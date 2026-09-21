package com.auctionxi.persistence;

import com.auctionxi.entity.SeasonEntity;
import com.auctionxi.entity.SeasonFixtureEntity;
import com.auctionxi.entity.SeasonTeamEntity;
import com.auctionxi.repository.SeasonFixtureRepository;
import com.auctionxi.repository.SeasonRepository;
import com.auctionxi.repository.SeasonTeamRepository;
import com.auctionxi.season.Season;
import com.auctionxi.season.SeasonFixture;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class SeasonPersistenceService {

    private static final Logger log = LoggerFactory.getLogger(SeasonPersistenceService.class);

    private final SeasonRepository seasonRepository;
    private final SeasonTeamRepository teamRepository;
    private final SeasonFixtureRepository fixtureRepository;
    private final ObjectMapper objectMapper;

    public SeasonPersistenceService(
            SeasonRepository seasonRepository,
            SeasonTeamRepository teamRepository,
            SeasonFixtureRepository fixtureRepository,
            ObjectMapper objectMapper) {
        this.seasonRepository = seasonRepository;
        this.teamRepository = teamRepository;
        this.fixtureRepository = fixtureRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void saveSeason(Season season) {
        if (season == null || season.getSeasonId() == null) return;
        try {
            SeasonEntity entity = seasonRepository.findById(season.getSeasonId())
                    .orElseGet(() -> {
                        SeasonEntity e = new SeasonEntity();
                        e.setSeasonId(season.getSeasonId());
                        e.setStartedAt(Instant.now());
                        return e;
                    });

            entity.setRoomId(season.getRoomCode() != null ? season.getRoomCode() : "UNKNOWN");
            entity.setOvers(season.getOvers());
            entity.setDoubleRoundRobin(season.isDoubleRoundRobin());
            entity.setStage(season.getStage() != null ? season.getStage().name() : "LEAGUE");
            entity.setChampionFranchise(season.getChampionFranchise());
            entity.setRunnerUpFranchise(season.getRunnerUpFranchise());
            if (season.getStage() == Season.Stage.COMPLETED) {
                entity.setCompletedAt(Instant.now());
            }

            seasonRepository.save(entity);

            // Save teams
            if (season.getTeams() != null) {
                int seed = 1;
                for (String code : season.getTeams()) {
                    String teamId = season.getSeasonId() + ":" + code;
                    SeasonTeamEntity team = teamRepository.findById(teamId)
                            .orElseGet(() -> {
                                SeasonTeamEntity ste = new SeasonTeamEntity();
                                ste.setSeasonTeamId(teamId);
                                ste.setSeasonId(season.getSeasonId());
                                ste.setFranchiseCode(code);
                                return ste;
                            });
                    team.setSeedOrder(seed++);
                    teamRepository.save(team);
                }
            }

            // Save fixtures
            if (season.getFixtures() != null) {
                for (SeasonFixture fix : season.getFixtures()) {
                    if (fix.getFixtureId() == null) continue;
                    SeasonFixtureEntity fe = fixtureRepository.findById(fix.getFixtureId())
                            .orElseGet(() -> {
                                SeasonFixtureEntity f = new SeasonFixtureEntity();
                                f.setFixtureId(fix.getFixtureId());
                                f.setSeasonId(season.getSeasonId());
                                return f;
                            });

                    fe.setLabel(fix.getLabel());
                    fe.setStage(fix.getStage() != null ? fix.getStage() : "LEAGUE");
                    fe.setHomeFranchise(fix.getHomeFranchise());
                    fe.setAwayFranchise(fix.getAwayFranchise());
                    fe.setStatus(fix.getStatus() != null ? fix.getStatus().name() : "PENDING");
                    fe.setMatchId(fix.getMatchId());
                    fe.setWinnerFranchise(fix.getWinnerFranchise());
                    fe.setLoserFranchise(fix.getLoserFranchise());
                    fe.setHomeRuns(fix.getHomeRuns());
                    fe.setHomeBalls(fix.getHomeBalls());
                    fe.setAwayRuns(fix.getAwayRuns());
                    fe.setAwayBalls(fix.getAwayBalls());
                    fe.setResultText(fix.getResultText());

                    fixtureRepository.save(fe);
                }
            }

        } catch (Exception e) {
            log.error("Failed to persist season {}: {}", season.getSeasonId(), e.getMessage());
        }
    }
}
