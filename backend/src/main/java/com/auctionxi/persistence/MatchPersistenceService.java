package com.auctionxi.persistence;

import com.auctionxi.entity.MatchBallEntity;
import com.auctionxi.entity.MatchEntity;
import com.auctionxi.entity.PlayerMatchStatEntity;
import com.auctionxi.match.MiniMatch;
import com.auctionxi.repository.MatchBallRepository;
import com.auctionxi.repository.MatchRepository;
import com.auctionxi.repository.PlayerMatchStatRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Service
public class MatchPersistenceService {

    private static final Logger log = LoggerFactory.getLogger(MatchPersistenceService.class);

    private final MatchRepository matchRepository;
    private final MatchBallRepository ballRepository;
    private final PlayerMatchStatRepository statRepository;
    private final ObjectMapper objectMapper;

    public MatchPersistenceService(
            MatchRepository matchRepository,
            MatchBallRepository ballRepository,
            PlayerMatchStatRepository statRepository,
            ObjectMapper objectMapper) {
        this.matchRepository = matchRepository;
        this.ballRepository = ballRepository;
        this.statRepository = statRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void saveMatch(MiniMatch match) {
        if (match == null || match.getMatchId() == null) return;
        try {
            MatchEntity entity = matchRepository.findById(match.getMatchId())
                    .orElseGet(() -> {
                        MatchEntity e = new MatchEntity();
                        e.setMatchId(match.getMatchId());
                        e.setCreatedAt(Instant.now());
                        return e;
                    });

            entity.setRoomId(match.getRoomCode() != null ? match.getRoomCode() : "OFFLINE");
            entity.setHomeFranchise(match.getHomeFranchise());
            entity.setAwayFranchise(match.getAwayFranchise());
            entity.setOvers(match.getOvers());
            boolean isDone = match.getStatus() == MiniMatch.Status.MATCH_COMPLETE || match.getStatus() == MiniMatch.Status.COMPLETED;
            entity.setStatus(isDone ? "COMPLETED" : "IN_PROGRESS");
            entity.setWinnerFranchise(match.getWinnerFranchise());
            entity.setResultText(match.getResultText());
            entity.setHomeRuns(match.getHomeRuns());
            entity.setHomeWickets(match.getHomeWickets());
            entity.setHomeBalls(match.getHomeBalls());
            entity.setAwayRuns(match.getAwayRuns());
            entity.setAwayWickets(match.getAwayWickets());
            entity.setAwayBalls(match.getAwayBalls());
            if (isDone) {
                entity.setCompletedAt(Instant.now());
            }

            matchRepository.save(entity);
        } catch (Exception e) {
            log.error("Failed to persist match {}: {}", match.getMatchId(), e.getMessage());
        }
    }

    @Transactional
    public void saveMatchBall(
            String matchId,
            long deliverySeq,
            int innings,
            int overNo,
            int ballInOver,
            String battingFranchise,
            String bowlingFranchise,
            String batterId,
            String bowlerId,
            String outcome,
            int runs,
            boolean isWicket,
            int scoreRuns,
            int scoreWickets,
            int scoreBalls,
            String commentary) {
        if (matchId == null) return;
        try {
            MatchBallEntity ball = new MatchBallEntity();
            ball.setMatchBallId(matchId + ":" + deliverySeq);
            ball.setMatchId(matchId);
            ball.setDeliverySequence(deliverySeq);
            ball.setInnings(innings);
            ball.setOverNumber(overNo);
            ball.setBallInOver(ballInOver);
            ball.setBattingFranchise(battingFranchise);
            ball.setBowlingFranchise(bowlingFranchise);
            ball.setBatterId(batterId);
            ball.setBowlerId(bowlerId);
            ball.setOutcome(outcome);
            ball.setRuns(runs);
            ball.setWicket(isWicket);
            ball.setScoreRuns(scoreRuns);
            ball.setScoreWickets(scoreWickets);
            ball.setScoreBalls(scoreBalls);
            ball.setCommentary(commentary);
            ball.setCreatedAt(Instant.now());

            ballRepository.save(ball);
        } catch (Exception e) {
            log.error("Failed to persist match ball {}/{}: {}", matchId, deliverySeq, e.getMessage());
        }
    }

    @Transactional
    public void saveCompleteMatch(MiniMatch match) {
        if (match == null) return;
        saveMatch(match);
        try {
            Set<String> playerIds = new HashSet<>();
            if (match.getRunsByPlayer() != null) playerIds.addAll(match.getRunsByPlayer().keySet());
            if (match.getWicketsByPlayer() != null) playerIds.addAll(match.getWicketsByPlayer().keySet());
            if (match.getRunsConcededByBowler() != null) playerIds.addAll(match.getRunsConcededByBowler().keySet());

            for (String playerId : playerIds) {
                String statId = match.getMatchId() + ":" + playerId;
                PlayerMatchStatEntity stat = statRepository.findById(statId)
                        .orElseGet(() -> {
                            PlayerMatchStatEntity s = new PlayerMatchStatEntity();
                            s.setPlayerMatchStatId(statId);
                            s.setMatchId(match.getMatchId());
                            s.setPlayerId(playerId);
                            return s;
                        });

                stat.setFranchiseCode("UNKNOWN");
                if (match.getRunsByPlayer() != null) stat.setRuns(match.getRunsByPlayer().getOrDefault(playerId, 0));
                if (match.getBallsFacedByPlayer() != null) stat.setBallsFaced(match.getBallsFacedByPlayer().getOrDefault(playerId, 0));
                if (match.getFoursByPlayer() != null) stat.setFours(match.getFoursByPlayer().getOrDefault(playerId, 0));
                if (match.getSixesByPlayer() != null) stat.setSixes(match.getSixesByPlayer().getOrDefault(playerId, 0));
                if (match.getWicketsByPlayer() != null) stat.setWickets(match.getWicketsByPlayer().getOrDefault(playerId, 0));
                if (match.getBallsBowledByBowler() != null) stat.setBallsBowled(match.getBallsBowledByBowler().getOrDefault(playerId, 0));
                if (match.getRunsConcededByBowler() != null) stat.setRunsConceded(match.getRunsConcededByBowler().getOrDefault(playerId, 0));

                statRepository.save(stat);
            }
        } catch (Exception e) {
            log.error("Failed to persist match player stats for match {}: {}", match.getMatchId(), e.getMessage());
        }
    }
}
