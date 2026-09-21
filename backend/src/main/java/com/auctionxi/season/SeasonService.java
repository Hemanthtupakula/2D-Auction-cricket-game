package com.auctionxi.season;

import com.auctionxi.exception.AllocationErrorCode;
import com.auctionxi.exception.AllocationException;
import com.auctionxi.match.MiniMatch;
import com.auctionxi.match.MiniMatchService;
import com.auctionxi.match.PlayerRatings;
import com.auctionxi.model.AuctionLot;
import com.auctionxi.model.AuctionPhase;
import com.auctionxi.model.AuctionRoom;
import com.auctionxi.model.FranchiseAuctionState;
import com.auctionxi.model.Player;
import com.auctionxi.service.RealtimePublisher;
import com.auctionxi.service.RoomStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Phase 5, Section 7 — Season Mode. Only sequences mini matches and tracks the
 * table/bracket; cricket simulation lives entirely in {@link MiniMatchService}.
 */
@Service
public class SeasonService {
    private static final Logger log = LoggerFactory.getLogger(SeasonService.class);

    private final RoomStore roomStore;
    private final RealtimePublisher realtimePublisher;
    private final ObjectProvider<MiniMatchService> miniMatchServiceProvider;
    private final com.auctionxi.persistence.SeasonPersistenceService seasonPersistenceService;

    @org.springframework.beans.factory.annotation.Autowired
    private com.auctionxi.match.MatchResultStore resultStore;
    private final Map<String, Season> seasonsByRoom = new ConcurrentHashMap<>();

    public SeasonService(RoomStore roomStore,
                         RealtimePublisher realtimePublisher,
                         ObjectProvider<MiniMatchService> miniMatchServiceProvider) {
        this(roomStore, realtimePublisher, miniMatchServiceProvider, null);
    }

    @Autowired
    public SeasonService(RoomStore roomStore,
                         RealtimePublisher realtimePublisher,
                         ObjectProvider<MiniMatchService> miniMatchServiceProvider,
                         @org.springframework.lang.Nullable com.auctionxi.persistence.SeasonPersistenceService seasonPersistenceService) {
        this.roomStore = roomStore;
        this.realtimePublisher = realtimePublisher;
        this.miniMatchServiceProvider = miniMatchServiceProvider;
        this.seasonPersistenceService = seasonPersistenceService;
    }

    // =========================================================================
    // SEASON LIFECYCLE
    // =========================================================================

    /** Host can restart the season after it completes — or reset it mid-tournament. */
    public void restartSeason(String roomCode, String hostMemberId) {
        AuctionRoom room = roomStore.findByCode(roomCode)
                .orElseThrow(() -> new AllocationException(AllocationErrorCode.ROOM_NOT_FOUND, "Room not found: " + roomCode));
        room.getLock().lock();
        try {
            if (!hostMemberId.equals(room.getHostMemberId())) {
                throw new AllocationException(AllocationErrorCode.NOT_ROOM_HOST, "Only the host can restart the season.");
            }
            seasonsByRoom.remove(room.getRoomCode());
            room.setChampionFranchise(null);
            room.addActivity("Season was reset by the host — a fresh season can be started.");
            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "SEASON_RESTARTED", Map.of());
        } finally {
            room.getLock().unlock();
        }
    }

    public Season startSeason(String roomCode, String hostMemberId, boolean doubleRoundRobin, Integer overs) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        room.getLock().lock();
        try {
            if (!hostMemberId.equals(room.getHostMemberId())) {
                throw new AllocationException(AllocationErrorCode.NOT_ROOM_HOST, "Only the host can start Season Mode.");
            }

            List<String> humanTeams = room.getFranchiseAuctionStates().values().stream()
                    .filter(FranchiseAuctionState::isActive)
                    .map(FranchiseAuctionState::getFranchiseCode)
                    .sorted()
                    .toList();

            if (humanTeams.size() < 2) {
                // Auto-activate at least 2 franchises
                room.getFranchiseAuctionStates().values().stream().limit(2).forEach(f -> f.setActive(true));
                humanTeams = room.getFranchiseAuctionStates().values().stream()
                        .filter(FranchiseAuctionState::isActive)
                        .map(FranchiseAuctionState::getFranchiseCode)
                        .sorted()
                        .toList();
            }

            Season existing = seasonsByRoom.get(room.getRoomCode());
            if (existing != null && existing.getStage() != Season.Stage.COMPLETED) {
                return existing; // idempotent: season already running
            }

            Season season = new Season(UUID.randomUUID().toString().substring(0, 8),
                    room.getRoomCode(), doubleRoundRobin, humanTeams);
            season.setOvers(com.auctionxi.match.MiniMatchService.normalizeOvers(overs));

            // Single round robin (default, fast); optional double round robin
            int rounds = doubleRoundRobin ? 2 : 1;
            int n = 1;
            for (int round = 0; round < rounds; round++) {
                for (int i = 0; i < humanTeams.size(); i++) {
                    for (int j = i + 1; j < humanTeams.size(); j++) {
                        String home = round == 0 ? humanTeams.get(i) : humanTeams.get(j);
                        String away = round == 0 ? humanTeams.get(j) : humanTeams.get(i);
                        season.getFixtures().add(new SeasonFixture(
                                "L" + n, "League Match " + n, "LEAGUE", home, away));
                        n++;
                    }
                }
            }

            if (season.leagueFixtures().isEmpty()) {
                throw new AllocationException(AllocationErrorCode.INVALID_REQUEST,
                        "No playable fixtures — every pairing is owned by the same person.");
            }

            seasonsByRoom.put(room.getRoomCode(), season);
            room.addActivity(String.format("SEASON MODE started! %d teams, %d league matches%s.",
                    humanTeams.size(), season.leagueFixtures().size(), doubleRoundRobin ? " (double round robin)" : ""));

            log.info("Season {} started in room {} with teams {}", season.getSeasonId(), roomCode, humanTeams);
            if (seasonPersistenceService != null) {
                seasonPersistenceService.saveSeason(season);
            }
            realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "SEASON_STARTED", seasonSnapshot(season));
            return season;
        } finally {
            room.getLock().unlock();
        }
    }

    public Season getSeason(String roomCode) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        Season season = seasonsByRoom.get(room.getRoomCode());
        if (season == null) {
            throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "No season running in this room yet.");
        }
        return season;
    }

    /** Host or one of the two involved owners starts the match for a pending fixture. */
    public MiniMatch startFixtureMatch(String roomCode, String fixtureId, String memberId) {
        AuctionRoom room = getRoomOrThrow(roomCode);
        Season season = seasonsByRoom.get(room.getRoomCode());
        if (season == null) {
            throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "No season running in this room.");
        }
        SeasonFixture fixture = season.findFixture(fixtureId);
        if (fixture == null) {
            throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Fixture not found: " + fixtureId);
        }
        if (fixture.getStatus() != SeasonFixture.Status.PENDING) {
            throw new AllocationException(AllocationErrorCode.INVALID_REQUEST, "Fixture already played or in progress.");
        }

        boolean isHost = memberId != null && memberId.equals(room.getHostMemberId());
        FranchiseAuctionState home = room.getFranchiseAuctionState(fixture.getHomeFranchise());
        FranchiseAuctionState away = room.getFranchiseAuctionState(fixture.getAwayFranchise());
        boolean involved = memberId != null && home != null && away != null
                && (memberId.equals(home.getOwnerMemberId()) || memberId.equals(away.getOwnerMemberId()));
        if (!isHost && !involved) {
            throw new AllocationException(AllocationErrorCode.NOT_FRANCHISE_OWNER,
                    "Only the host or one of the two franchise owners can start this fixture.");
        }

        MiniMatchService miniMatchService = miniMatchServiceProvider.getObject();
        MiniMatch match = miniMatchService.startMatch(roomCode, memberId,
                fixture.getHomeFranchise(), fixture.getAwayFranchise(), fixture.getFixtureId(),
                season.getOvers(), null, null);

        fixture.setStatus(SeasonFixture.Status.IN_PROGRESS);
        fixture.setMatchId(match.getMatchId());

        realtimePublisher.broadcastAuctionEvent(room.getRoomCode(), "SEASON_UPDATED", seasonSnapshot(season));
        return match;
    }

    // =========================================================================
    // RESULT INTAKE (called by MiniMatchService when a fixture match completes)
    // =========================================================================

    public void onMatchComplete(MiniMatch match) {
        Season season = seasonsByRoom.get(match.getRoomCode());
        if (season == null) return;

        synchronized (season) {
            SeasonFixture fixture = season.findFixture(match.getSeasonFixtureId());
            if (fixture == null || fixture.getStatus() == SeasonFixture.Status.COMPLETED) return;

            fixture.setStatus(SeasonFixture.Status.COMPLETED);
            fixture.setWinnerFranchise(match.getWinnerFranchise());
            String loser = match.getWinnerFranchise().equals(fixture.getHomeFranchise())
                    ? fixture.getAwayFranchise() : fixture.getHomeFranchise();
            fixture.setLoserFranchise(loser);
            fixture.setHomeRuns(match.getHomeRuns());
            fixture.setHomeBalls(match.getHomeBalls());
            fixture.setAwayRuns(match.getAwayRuns());
            fixture.setAwayBalls(match.getAwayBalls());
            fixture.setResultText(match.getResultText());

            AuctionRoom room = getRoomOrThrow(match.getRoomCode());
            room.addActivity(String.format("SEASON: %s — %s beat %s.",
                    fixture.getLabel(), fixture.getWinnerFranchise(), fixture.getLoserFranchise()));

            if (season.getStage() == Season.Stage.LEAGUE) {
                realtimePublisher.broadcastAuctionEvent(match.getRoomCode(), "SEASON_TABLE_UPDATED", seasonSnapshot(season));
                boolean leagueDone = season.leagueFixtures().stream()
                        .allMatch(f -> f.getStatus() == SeasonFixture.Status.COMPLETED);
                if (leagueDone) {
                    advanceToPlayoffs(season);
                }
            } else if (season.getStage() == Season.Stage.PLAYOFFS) {
                advanceBracket(season, fixture);
            }

            if (seasonPersistenceService != null) {
                seasonPersistenceService.saveSeason(season);
            }
            realtimePublisher.broadcastAuctionEvent(match.getRoomCode(), "SEASON_UPDATED", seasonSnapshot(season));
        }
    }

    // =========================================================================
    // POINTS TABLE & SEEDING (points -> NRR -> head-to-head)
    // =========================================================================

    public List<Map<String, Object>> pointsTable(Season season) {
        Map<String, int[]> agg = new HashMap<>();      // code -> [played, won, lost, runsFor, ballsFaced, runsAgainst, ballsBowled]
        for (String team : season.getTeams()) {
            agg.put(team, new int[7]);
        }
        Map<String, String> headToHead = new HashMap<>(); // "A|B" (sorted) -> winner

        for (SeasonFixture f : season.leagueFixtures()) {
            if (f.getStatus() != SeasonFixture.Status.COMPLETED) continue;
            int[] home = agg.get(f.getHomeFranchise());
            int[] away = agg.get(f.getAwayFranchise());
            home[0]++; away[0]++;
            home[3] += f.getHomeRuns();  home[4] += f.getHomeBalls();
            home[5] += f.getAwayRuns();  home[6] += f.getAwayBalls();
            away[3] += f.getAwayRuns();  away[4] += f.getAwayBalls();
            away[5] += f.getHomeRuns();  away[6] += f.getHomeBalls();
            if (f.getWinnerFranchise() != null) {
                int[] w = agg.get(f.getWinnerFranchise());
                int[] l = agg.get(f.getLoserFranchise());
                w[1]++; l[2]++;
                String a = f.getHomeFranchise().compareTo(f.getAwayFranchise()) < 0
                        ? f.getHomeFranchise() : f.getAwayFranchise();
                String b = a.equals(f.getHomeFranchise()) ? f.getAwayFranchise() : f.getHomeFranchise();
                headToHead.put(a + "|" + b, f.getWinnerFranchise());
            }
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (String team : season.getTeams()) {
            int[] a = agg.get(team);
            double nrr = 0.0;
            if (a[4] > 0 && a[6] > 0) {
                nrr = (a[3] / (a[4] / 6.0)) - (a[5] / (a[6] / 6.0));
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("franchise", team);
            row.put("played", a[0]);
            row.put("won", a[1]);
            row.put("lost", a[2]);
            row.put("points", a[1] * 2);
            row.put("nrr", Math.round(nrr * 1000.0) / 1000.0);
            rows.add(row);
        }

        rows.sort((r1, r2) -> {
            int pts = Integer.compare((int) r2.get("points"), (int) r1.get("points"));
            if (pts != 0) return pts;
            int nrrCmp = Double.compare((double) r2.get("nrr"), (double) r1.get("nrr"));
            if (nrrCmp != 0) return nrrCmp;
            // head-to-head
            String t1 = (String) r1.get("franchise");
            String t2 = (String) r2.get("franchise");
            String key = t1.compareTo(t2) < 0 ? t1 + "|" + t2 : t2 + "|" + t1;
            String winner = headToHead.get(key);
            if (winner != null) {
                return winner.equals(t1) ? -1 : 1;
            }
            return t1.compareTo(t2);
        });
        return rows;
    }

    // =========================================================================
    // PLAYOFF BRACKET (with small-group fallbacks, Section 7.4)
    // =========================================================================

    private void advanceToPlayoffs(Season season) {
        List<Map<String, Object>> table = pointsTable(season);
        List<String> seeds = table.stream().map(r -> (String) r.get("franchise")).toList();
        int teamCount = season.getTeams().size();

        if (teamCount == 2) {
            // League is effectively the Final — crown the table-topper
            crownChampion(season, seeds.get(0), seeds.get(1));
            return;
        }

        season.setStage(Season.Stage.PLAYOFFS);

        if (teamCount == 3) {
            // #1 vs #2 play the Final directly; #3 eliminated by table position
            season.getFixtures().add(new SeasonFixture("F1", "Final", "PLAYOFF", seeds.get(0), seeds.get(1)));
        } else {
            // Standard IPL bracket: Q1 (#1 v #2), Eliminator (#3 v #4), Q2, Final
            season.getFixtures().add(new SeasonFixture("Q1", "Qualifier 1", "PLAYOFF", seeds.get(0), seeds.get(1)));
            season.getFixtures().add(new SeasonFixture("E1", "Eliminator", "PLAYOFF", seeds.get(2), seeds.get(3)));
        }

        realtimePublisher.broadcastAuctionEvent(season.getRoomCode(), "SEASON_BRACKET_UPDATED", seasonSnapshot(season));
    }

    private void advanceBracket(Season season, SeasonFixture completed) {
        String id = completed.getFixtureId();

        if ("F1".equals(id)) {
            crownChampion(season, completed.getWinnerFranchise(), completed.getLoserFranchise());
            return;
        }

        if ("Q1".equals(id) || "E1".equals(id)) {
            SeasonFixture q1 = season.findFixture("Q1");
            SeasonFixture e1 = season.findFixture("E1");
            boolean q1Done = q1 != null && q1.getStatus() == SeasonFixture.Status.COMPLETED;
            boolean e1Done = e1 != null && e1.getStatus() == SeasonFixture.Status.COMPLETED;
            if (q1Done && e1Done && season.findFixture("Q2") == null) {
                // Qualifier 2: loser of Q1 vs winner of Eliminator
                season.getFixtures().add(new SeasonFixture("Q2", "Qualifier 2", "PLAYOFF",
                        q1.getLoserFranchise(), e1.getWinnerFranchise()));
                realtimePublisher.broadcastAuctionEvent(season.getRoomCode(), "SEASON_BRACKET_UPDATED", seasonSnapshot(season));
            }
            return;
        }

        if ("Q2".equals(id)) {
            SeasonFixture q1 = season.findFixture("Q1");
            season.getFixtures().add(new SeasonFixture("F1", "Final", "PLAYOFF",
                    q1.getWinnerFranchise(), completed.getWinnerFranchise()));
            realtimePublisher.broadcastAuctionEvent(season.getRoomCode(), "SEASON_BRACKET_UPDATED", seasonSnapshot(season));
        }
    }

    private void crownChampion(Season season, String champion, String runnerUp) {
        season.setStage(Season.Stage.COMPLETED);
        season.setChampionFranchise(champion);
        season.setRunnerUpFranchise(runnerUp);
        season.setCompletedAt(Instant.now());
        season.setAwards(computeAwards(season));

        // Persist on the room so the lobby shows the champion afterward
        AuctionRoom room = getRoomOrThrow(season.getRoomCode());
        room.setChampionFranchise(champion);
        room.addActivity(String.format("SEASON CHAMPIONS: %s! (runner-up: %s)", champion, runnerUp));

        log.info("Season {} in room {} complete. Champion: {}", season.getSeasonId(), season.getRoomCode(), champion);
        try {
            resultStore.recordChampion(season.getRoomCode(), champion, season.getSeasonId());
        } catch (Exception e) {
            log.warn("Could not record champion: {}", e.getMessage());
        }
        realtimePublisher.broadcastAuctionEvent(season.getRoomCode(), "SEASON_CHAMPION_DECLARED", seasonSnapshot(season));
    }

    // =========================================================================
    // SEASON AWARDS (Orange Cap, Purple Cap, Best Buy of the Auction)
    // =========================================================================

    private Map<String, Object> computeAwards(Season season) {
        Map<String, Object> awards = new HashMap<>();

        // Aggregate player stats across every completed season match
        MiniMatchService miniMatchService = miniMatchServiceProvider.getIfAvailable();
        Map<String, Integer> totalRuns = new HashMap<>();
        Map<String, Integer> totalWickets = new HashMap<>();
        Map<String, String> names = new HashMap<>();
        Map<String, String> playerFranchise = new HashMap<>();

        if (miniMatchService != null) {
            for (MiniMatch m : miniMatchService.listMatches(season.getRoomCode())) {
                if (m.getSeasonFixtureId() == null || m.getStatus() != MiniMatch.Status.COMPLETED) continue;
                names.putAll(m.getPlayerNames());
                m.getRunsByPlayer().forEach((pid, runs) -> totalRuns.merge(pid, runs, Integer::sum));
                m.getWicketsByPlayer().forEach((pid, wkts) -> totalWickets.merge(pid, wkts, Integer::sum));
                m.getHomeXi().forEach(p -> playerFranchise.put(p.getId(), m.getHomeFranchise()));
                m.getAwayXi().forEach(p -> playerFranchise.putIfAbsent(p.getId(), m.getAwayFranchise()));
            }
        }

        totalRuns.entrySet().stream().max(Map.Entry.comparingByValue()).ifPresent(e -> {
            Map<String, Object> cap = new HashMap<>();
            cap.put("playerId", e.getKey());
            cap.put("playerName", names.getOrDefault(e.getKey(), e.getKey()));
            cap.put("franchise", playerFranchise.getOrDefault(e.getKey(), ""));
            cap.put("runs", e.getValue());
            awards.put("orangeCap", cap);
        });

        totalWickets.entrySet().stream().max(Map.Entry.comparingByValue()).ifPresent(e -> {
            Map<String, Object> cap = new HashMap<>();
            cap.put("playerId", e.getKey());
            cap.put("playerName", names.getOrDefault(e.getKey(), e.getKey()));
            cap.put("franchise", playerFranchise.getOrDefault(e.getKey(), ""));
            cap.put("wickets", e.getValue());
            awards.put("purpleCap", cap);
        });

        // Best Buy of the Auction: best rating-per-crore across every sold player
        AuctionRoom room = getRoomOrThrow(season.getRoomCode());
        double bestValue = -1;
        Map<String, Object> bestBuy = null;
        for (AuctionLot lot : room.getCompletedLots()) {
            if (lot.getPhase() != AuctionPhase.SOLD || lot.getPlayer() == null || lot.getCurrentBidLakhs() <= 0) continue;
            Player p = lot.getPlayer();
            double priceCr = lot.getCurrentBidLakhs() / 100.0;
            double value = PlayerRatings.impactScore(p) / priceCr;
            if (value > bestValue) {
                bestValue = value;
                Map<String, Object> bb = new HashMap<>();
                bb.put("playerId", p.getId());
                bb.put("playerName", p.getFullName());
                bb.put("franchise", lot.getHighestBidderFranchise());
                bb.put("priceCr", priceCr);
                bb.put("impactScore", Math.round(PlayerRatings.impactScore(p) * 10.0) / 10.0);
                bb.put("valueScore", Math.round(value * 10.0) / 10.0);
                bestBuy = bb;
            }
        }
        if (bestBuy != null) {
            awards.put("bestBuy", bestBuy);
        }
        return awards;
    }

    // =========================================================================
    // SNAPSHOT
    // =========================================================================

    public Map<String, Object> seasonSnapshot(Season season) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("seasonId", season.getSeasonId());
        snapshot.put("roomCode", season.getRoomCode());
        snapshot.put("doubleRoundRobin", season.isDoubleRoundRobin());
        snapshot.put("stage", season.getStage().name());
        snapshot.put("teams", season.getTeams());
        snapshot.put("fixtures", season.getFixtures());
        snapshot.put("pointsTable", pointsTable(season));
        snapshot.put("championFranchise", season.getChampionFranchise() != null ? season.getChampionFranchise() : "");
        snapshot.put("runnerUpFranchise", season.getRunnerUpFranchise() != null ? season.getRunnerUpFranchise() : "");
        snapshot.put("awards", season.getAwards());
        SeasonFixture next = season.nextPendingFixture();
        snapshot.put("nextFixtureId", next != null ? next.getFixtureId() : "");
        return snapshot;
    }

    private AuctionRoom getRoomOrThrow(String roomCode) {
        return roomStore.findByCode(roomCode)
                .orElseThrow(() -> new AllocationException(AllocationErrorCode.ROOM_NOT_FOUND, "Room not found: " + roomCode));
    }
}
