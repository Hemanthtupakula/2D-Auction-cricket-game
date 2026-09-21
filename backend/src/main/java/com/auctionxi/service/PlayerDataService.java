package com.auctionxi.service;

import com.auctionxi.model.Player;
import com.auctionxi.model.PlayerMedia;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import com.auctionxi.persistence.PlayerPersistenceService;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.InputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class PlayerDataService {

    private final ObjectMapper objectMapper;
    private final MediaIngestionService mediaIngestionService;
    private final PlayerPersistenceService playerPersistenceService;
    private final Map<String, Player> playersById = new ConcurrentHashMap<>();
    private final Map<Integer, String> idByLotNumber = new ConcurrentHashMap<>();
    private final List<Player> canonicalRoster = new ArrayList<>();
    private final Random random = new Random();

    public PlayerDataService(ObjectMapper objectMapper, MediaIngestionService mediaIngestionService) {
        this(objectMapper, mediaIngestionService, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public PlayerDataService(ObjectMapper objectMapper, MediaIngestionService mediaIngestionService,
                             @org.springframework.lang.Nullable PlayerPersistenceService playerPersistenceService) {
        this.objectMapper = objectMapper;
        this.mediaIngestionService = mediaIngestionService;
        this.playerPersistenceService = playerPersistenceService;
    }

    @PostConstruct
    public void init() {
        loadDataset();
    }

    public synchronized void loadDataset() {
        try {
            List<Player> loaded = null;
            // 1. Try file in data directory
            File localDataFile = new File("data/players_369.json");
            if (!localDataFile.exists()) {
                localDataFile = new File("../data/players_369.json");
            }
            if (localDataFile.exists()) {
                loaded = objectMapper.readValue(localDataFile, new TypeReference<List<Player>>() {});
            } else {
                // 2. Try classpath
                ClassPathResource resource = new ClassPathResource("data/players_369.json");
                if (resource.exists()) {
                    try (InputStream is = resource.getInputStream()) {
                        loaded = objectMapper.readValue(is, new TypeReference<List<Player>>() {});
                    }
                }
            }

            if (loaded != null && !loaded.isEmpty()) {
                playersById.clear();
                idByLotNumber.clear();
                canonicalRoster.clear();

                for (Player p : loaded) {
                    // Strict invariant: active auction pool consists strictly of canonical Lots 1 to 369
                    if (p.getLotNumber() < 1 || p.getLotNumber() > 369 || p.getAuctionSet() == null) {
                        continue;
                    }

                    // Reconcile with media registry
                    mediaIngestionService.getMediaForPlayer(p.getId()).ifPresent(m -> {
                        String delivery = (m.getDeliveryUrl() != null && !m.getDeliveryUrl().isBlank()) ? m.getDeliveryUrl() : m.getSourceUrl();
                        if (delivery != null && !delivery.isBlank()) {
                            p.setPhotoUrl(delivery);
                        }
                        Map<String, Object> mediaMap = new LinkedHashMap<>();
                        mediaMap.put("id", m.getId());
                        mediaMap.put("playerId", m.getPlayerId());
                        mediaMap.put("mediaType", m.getMediaType());
                        mediaMap.put("storageProvider", m.getStorageProvider());
                        mediaMap.put("storageFileId", m.getStorageFileId());
                        mediaMap.put("storagePath", m.getStoragePath());
                        mediaMap.put("deliveryUrl", m.getDeliveryUrl());
                        mediaMap.put("sourceUrl", m.getSourceUrl());
                        mediaMap.put("sourceName", m.getSourceName());
                        mediaMap.put("sourcePageUrl", m.getSourcePageUrl());
                        mediaMap.put("status", m.getStatus());
                        mediaMap.put("rightsStatus", m.getRightsStatus());
                        mediaMap.put("mimeType", m.getMimeType());
                        mediaMap.put("width", m.getWidth());
                        mediaMap.put("height", m.getHeight());
                        p.setMedia(mediaMap);
                    });

                    playersById.put(p.getId(), p);
                    idByLotNumber.put(p.getLotNumber(), p.getId());
                    canonicalRoster.add(p);
                }
                canonicalRoster.sort(Comparator.comparingInt(Player::getLotNumber));
                System.out.println("PlayerDataService: Successfully loaded " + canonicalRoster.size() + " canonical 369-pool players.");
                if (playerPersistenceService != null) {
                    playerPersistenceService.syncCanonicalRoster(canonicalRoster);
                }
            } else {
                System.err.println("PlayerDataService: Warning - players_369.json not found or empty.");
            }
        } catch (Exception e) {
            System.err.println("PlayerDataService initialization failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public List<Player> getAllPlayers() {
        return new ArrayList<>(canonicalRoster);
    }

    public List<Player> filterPlayers(String search, String country, Boolean overseas, String role, Boolean capped, String set, String status) {
        return canonicalRoster.stream().filter(p -> {
            if (search != null && !search.isBlank()) {
                String q = search.trim().toLowerCase();
                boolean nameMatch = p.getFullName().toLowerCase().contains(q) || (p.getShortName() != null && p.getShortName().toLowerCase().contains(q));
                boolean countryMatch = p.getCountry() != null && p.getCountry().toLowerCase().contains(q);
                boolean roleMatch = p.getRole() != null && p.getRole().toLowerCase().contains(q);
                if (!nameMatch && !countryMatch && !roleMatch) return false;
            }
            if (country != null && !country.isBlank() && !p.getCountry().equalsIgnoreCase(country.trim())) {
                return false;
            }
            if (overseas != null && p.isOverseas() != overseas) {
                return false;
            }
            if (role != null && !role.isBlank() && !p.getRole().equalsIgnoreCase(role.trim())) {
                return false;
            }
            if (capped != null && p.isCapped() != capped) {
                return false;
            }
            if (set != null && !set.isBlank() && !p.getAuctionSet().equalsIgnoreCase(set.trim())) {
                return false;
            }
            if (status != null && !status.isBlank() && !p.getStatus().equalsIgnoreCase(status.trim())) {
                return false;
            }
            return true;
        }).collect(Collectors.toList());
    }

    public Optional<Player> getPlayerById(String id) {
        if (id == null) return Optional.empty();
        return Optional.ofNullable(playersById.get(id));
    }

    public Optional<Player> getPlayerByLot(int lot) {
        String id = idByLotNumber.get(lot);
        if (id == null) return Optional.empty();
        return getPlayerById(id);
    }

    /**
     * Server-authoritative Random Chit draw:
     * Selects a random player with status == 'REMAINING'
     */
    public synchronized Optional<Player> drawRandomChit() {
        List<Player> remaining = canonicalRoster.stream()
                .filter(p -> "REMAINING".equalsIgnoreCase(p.getStatus()))
                .collect(Collectors.toList());

        if (remaining.isEmpty()) {
            return Optional.empty();
        }

        Player chosen = remaining.get(random.nextInt(remaining.size()));
        chosen.setStatus("ON_BLOCK");
        return Optional.of(chosen);
    }

    public Map<String, Object> getAuditReport() {
        int total = canonicalRoster.size();
        long statsComplete = canonicalRoster.stream().filter(p -> p.getIpl() != null && p.getIpl().get("matches") != null).count();
        long statsPartial = total - statsComplete;

        Map<String, Object> mediaAudit = mediaIngestionService.getMediaAuditReport(total);

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("canonicalPoolSize", total);
        report.put("nonCanonicalDbRecords", 6);
        report.put("statisticsComplete", statsComplete);
        report.put("statisticsPartial", statsPartial);
        report.put("mediaAudit", mediaAudit);
        return report;
    }

    public Map<String, Object> getMediaAuditReport() {
        return mediaIngestionService.getMediaAuditReport(canonicalRoster.size());
    }

    public Optional<PlayerMedia> getPlayerMedia(String id) {
        return mediaIngestionService.getMediaForPlayer(id);
    }
}
