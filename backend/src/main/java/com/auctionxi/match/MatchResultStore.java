package com.auctionxi.match;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Real persisted results gallery: every completed match and every tournament
 * champion is stored on disk (data/results/<ROOM>.json). Nothing imaginary —
 * the Results section reads exactly what happened in your games.
 */
@Service
public class MatchResultStore {
    private static final Logger log = LoggerFactory.getLogger(MatchResultStore.class);
    private static final Path DIR = Paths.get("data", "results");

    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<String, List<Map<String, Object>>> matchesByRoom = new ConcurrentHashMap<>();
    private final Map<String, List<Map<String, Object>>> achievementsByRoom = new ConcurrentHashMap<>();

    @PostConstruct
    @SuppressWarnings("unchecked")
    public void load() {
        try {
            if (!Files.isDirectory(DIR)) return;
            try (var stream = Files.list(DIR)) {
                for (Path f : stream.filter(p -> p.toString().endsWith(".json")).toList()) {
                    Map<String, Object> data = mapper.readValue(f.toFile(), new TypeReference<>() {});
                    String room = f.getFileName().toString().replace(".json", "");
                    matchesByRoom.put(room, new ArrayList<>((List<Map<String, Object>>) data.getOrDefault("matches", List.of())));
                    achievementsByRoom.put(room, new ArrayList<>((List<Map<String, Object>>) data.getOrDefault("achievements", List.of())));
                }
            }
            log.info("Results store loaded for {} room(s)", matchesByRoom.size());
        } catch (Exception e) {
            log.warn("Could not load results store: {}", e.getMessage());
        }
    }

    private Path fileFor(String roomCode) {
        return DIR.resolve(roomCode.toUpperCase() + ".json");
    }

    private synchronized void persist(String roomCode) {
        try {
            Files.createDirectories(DIR);
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("matches", matchesByRoom.getOrDefault(roomCode, List.of()));
            data.put("achievements", achievementsByRoom.getOrDefault(roomCode, List.of()));
            mapper.writerWithDefaultPrettyPrinter().writeValue(fileFor(roomCode).toFile(), data);
        } catch (IOException e) {
            log.warn("Could not persist results for {}: {}", roomCode, e.getMessage());
        }
    }

    public synchronized void recordMatch(MiniMatch match) {
        String room = match.getRoomCode().toUpperCase();
        Map<String, Object> rec = new LinkedHashMap<>();
        rec.put("matchId", match.getMatchId());
        rec.put("homeFranchise", match.getHomeFranchise());
        rec.put("awayFranchise", match.getAwayFranchise());
        rec.put("homeRuns", match.getHomeRuns());
        rec.put("homeWickets", match.getHomeWickets());
        rec.put("homeBalls", match.getHomeBalls());
        rec.put("awayRuns", match.getAwayRuns());
        rec.put("awayWickets", match.getAwayWickets());
        rec.put("awayBalls", match.getAwayBalls());
        rec.put("winnerFranchise", match.getWinnerFranchise() != null ? match.getWinnerFranchise() : "");
        rec.put("resultText", match.getResultText() != null ? match.getResultText() : "");
        rec.put("overs", match.getOvers());
        rec.put("fixtureId", match.getSeasonFixtureId() != null ? match.getSeasonFixtureId() : "");
        rec.put("completedAt", Instant.now().toString());

        // Idempotency: a completed match may be delivered more than once after reconnect.
        List<Map<String, Object>> existing = matchesByRoom.getOrDefault(room, List.of());
        if (existing.stream().anyMatch(x -> match.getMatchId().equals(String.valueOf(x.get("matchId"))))) {
            return;
        }

        List<Map<String, Object>> players = new ArrayList<>();
        Set<String> ids = new java.util.LinkedHashSet<>();
        match.getHomeXi().forEach(p -> ids.add(p.getId()));
        match.getAwayXi().forEach(p -> ids.add(p.getId()));
        ids.addAll(match.getRunsByPlayer().keySet());
        ids.addAll(match.getWicketsByPlayer().keySet());
        for (String pid : ids) {
            Map<String, Object> pr = new LinkedHashMap<>();
            pr.put("playerId", pid);
            pr.put("name", match.getPlayerNames().getOrDefault(pid, pid));
            pr.put("team", match.getHomeTeamXi().contains(pid) ? match.getHomeFranchise() : match.getAwayFranchise());
            pr.put("runs", match.getRunsByPlayer().getOrDefault(pid, 0));
            pr.put("balls", match.getBallsFacedByPlayer().getOrDefault(pid, 0));
            pr.put("fours", match.getFoursByPlayer().getOrDefault(pid, 0));
            pr.put("sixes", match.getSixesByPlayer().getOrDefault(pid, 0));
            pr.put("wickets", match.getWicketsByPlayer().getOrDefault(pid, 0));
            pr.put("ballsBowled", match.getBallsBowledByBowler().getOrDefault(pid, 0));
            pr.put("runsConceded", match.getRunsConcededByBowler().getOrDefault(pid, 0));
            players.add(pr);
        }
        rec.put("players", players);
        matchesByRoom.computeIfAbsent(room, k -> new ArrayList<>()).add(rec);
        persist(room);
    }

    public synchronized void recordMatchResult(String roomCode, MiniMatch match) {
        recordMatch(match);
    }

    public synchronized void recordChampion(String roomCode, String teamCode, String seasonId) {
        String room = roomCode.toUpperCase();
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("type", "CHAMPION");
        a.put("team", teamCode);
        a.put("seasonId", seasonId);
        a.put("at", Instant.now().toString());
        achievementsByRoom.computeIfAbsent(room, k -> new ArrayList<>()).add(a);
        persist(room);
    }

    /** Full results gallery: match history, achievements, player career stats, team records. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> results(String roomCode) {
        String room = roomCode.toUpperCase();
        List<Map<String, Object>> matches = matchesByRoom.getOrDefault(room, List.of());
        List<Map<String, Object>> achievements = achievementsByRoom.getOrDefault(room, List.of());

        Map<String, Map<String, Object>> byPlayer = new LinkedHashMap<>();
        for (Map<String, Object> m : matches) {
            Object ps = m.get("players");
            if (!(ps instanceof List)) continue;
            for (Object o : (List<Object>) ps) {
                Map<String, Object> pr = (Map<String, Object>) o;
                String pid = (String) pr.get("playerId");
                Map<String, Object> agg = byPlayer.computeIfAbsent(pid, k -> {
                    Map<String, Object> a = new LinkedHashMap<>();
                    a.put("playerId", pid);
                    a.put("name", pr.get("name"));
                    a.put("team", pr.get("team"));
                    a.put("runs", 0);
                    a.put("wickets", 0);
                    a.put("matches", 0);
                    a.put("fifties", 0);
                    a.put("hundreds", 0);
                    a.put("bestBowling", 0);
                    return a;
                });
                int runs = ((Number) pr.getOrDefault("runs", 0)).intValue();
                int wkts = ((Number) pr.getOrDefault("wickets", 0)).intValue();
                agg.put("name", pr.get("name"));
                agg.put("team", pr.get("team"));
                agg.put("runs", ((Number) agg.get("runs")).intValue() + runs);
                agg.put("wickets", ((Number) agg.get("wickets")).intValue() + wkts);
                agg.put("matches", ((Number) agg.get("matches")).intValue() + 1);
                if (runs >= 100) agg.put("hundreds", ((Number) agg.get("hundreds")).intValue() + 1);
                else if (runs >= 50) agg.put("fifties", ((Number) agg.get("fifties")).intValue() + 1);
                if (wkts > ((Number) agg.get("bestBowling")).intValue()) agg.put("bestBowling", wkts);
            }
        }

        Map<String, Map<String, Object>> byTeam = new LinkedHashMap<>();
        for (Map<String, Object> m : matches) {
            String home = (String) m.get("homeFranchise");
            String away = (String) m.get("awayFranchise");
            String winner = (String) m.get("winnerFranchise");
            for (String t : new String[]{home, away}) {
                Map<String, Object> ts = byTeam.computeIfAbsent(t, k -> {
                    Map<String, Object> a = new LinkedHashMap<>();
                    a.put("team", t);
                    a.put("played", 0);
                    a.put("won", 0);
                    a.put("lost", 0);
                    a.put("runsFor", 0);
                    a.put("runsAgainst", 0);
                    a.put("trophies", 0);
                    return a;
                });
                boolean isHome = t.equals(home);
                int rf = ((Number) m.get(isHome ? "homeRuns" : "awayRuns")).intValue();
                int ra = ((Number) m.get(isHome ? "awayRuns" : "homeRuns")).intValue();
                ts.put("played", ((Number) ts.get("played")).intValue() + 1);
                ts.put("runsFor", ((Number) ts.get("runsFor")).intValue() + rf);
                ts.put("runsAgainst", ((Number) ts.get("runsAgainst")).intValue() + ra);
                if (t.equals(winner)) ts.put("won", ((Number) ts.get("won")).intValue() + 1);
                else ts.put("lost", ((Number) ts.get("lost")).intValue() + 1);
            }
        }
        for (Map<String, Object> a : achievements) {
            Map<String, Object> ts = byTeam.get(a.get("team"));
            if (ts != null) ts.put("trophies", ((Number) ts.get("trophies")).intValue() + 1);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("matches", matches);
        out.put("achievements", achievements);
        out.put("playerStats", new ArrayList<>(byPlayer.values()));
        out.put("teamStats", new ArrayList<>(byTeam.values()));
        return out;
    }
}
