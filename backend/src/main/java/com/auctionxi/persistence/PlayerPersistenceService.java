package com.auctionxi.persistence;

import com.auctionxi.entity.PlayerEntity;
import com.auctionxi.model.Player;
import com.auctionxi.repository.PlayerRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PlayerPersistenceService {

    private static final Logger log = LoggerFactory.getLogger(PlayerPersistenceService.class);

    private final PlayerRepository playerRepository;
    private final ObjectMapper objectMapper;

    public PlayerPersistenceService(PlayerRepository playerRepository, ObjectMapper objectMapper) {
        this.playerRepository = playerRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void syncCanonicalRoster(List<Player> roster) {
        if (roster == null || roster.isEmpty()) {
            return;
        }

        try {
            long existingCount = playerRepository.count();
            if (existingCount >= roster.size()) {
                log.info("PlayerPersistenceService: Roster already fully synced in database ({} players).", existingCount);
                return;
            }

            java.util.Map<String, PlayerEntity> existingMap = playerRepository.findAll().stream()
                    .collect(Collectors.toMap(PlayerEntity::getPlayerId, e -> e, (a, b) -> a));

            List<PlayerEntity> toSave = new ArrayList<>();
            for (Player p : roster) {
                if (p.getId() == null || p.getId().isBlank()) {
                    continue;
                }

                PlayerEntity entity = existingMap.getOrDefault(p.getId(), new PlayerEntity());
                if (entity.getPlayerId() == null) {
                    entity.setPlayerId(p.getId());
                    entity.setCreatedAt(Instant.now());
                }

                entity.setLotNumber(p.getLotNumber());
                entity.setFullName(p.getFullName());
                entity.setCountry(p.getCountry());
                entity.setNationality(p.getNationality());
                entity.setAge(p.getAge());
                entity.setRole(p.getRole());
                entity.setBattingStyle(p.getBattingStyle());
                entity.setBowlingStyle(p.getBowlingStyle());
                entity.setOverseas(p.isOverseas());
                entity.setCapped(p.isCapped());
                entity.setAuctionSet(p.getAuctionSet());
                entity.setBasePriceRupees(p.getBasePrice());
                entity.setSourceName(p.getSource());
                entity.setSourceUrl(p.getSourceUrl());
                entity.setPhotoUrl(p.getPhotoUrl());
                entity.setStatus(p.getStatus() != null ? p.getStatus() : "REMAINING");
                entity.setUpdatedAt(Instant.now());

                try {
                    if (p.getIpl() != null) entity.setIplStats(objectMapper.writeValueAsString(p.getIpl()));
                    if (p.getInternational() != null) entity.setInternationalStats(objectMapper.writeValueAsString(p.getInternational()));
                    if (p.getRecent() != null) entity.setRecentStats(objectMapper.writeValueAsString(p.getRecent()));
                    if (p.getDomestic() != null) entity.setDomesticStats(objectMapper.writeValueAsString(p.getDomestic()));
                    if (p.getOverGraph() != null) entity.setOverGraph(objectMapper.writeValueAsString(p.getOverGraph()));
                    if (p.getMedia() != null) entity.setMedia(objectMapper.writeValueAsString(p.getMedia()));
                } catch (Exception jsonEx) {
                    log.warn("Failed to serialize jsonb stats for player {}: {}", p.getId(), jsonEx.getMessage());
                }

                toSave.add(entity);
            }
            playerRepository.saveAll(toSave);
            log.info("PlayerPersistenceService: Successfully synced {} canonical players into database.", toSave.size());
        } catch (Exception e) {
            log.error("PlayerPersistenceService: Error syncing player roster into database: {}", e.getMessage(), e);
        }
    }

    public Optional<PlayerEntity> getPlayerEntity(String playerId) {
        return playerRepository.findById(playerId);
    }
}
