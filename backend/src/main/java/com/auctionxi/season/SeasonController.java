package com.auctionxi.season;

import com.auctionxi.match.MiniMatch;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Phase 5, Section 9 — Season Mode REST surface.
 */
@RestController
@RequestMapping("/api/rooms/{roomCode}/season")
public class SeasonController {

    private final SeasonService seasonService;

    @Autowired
    public SeasonController(SeasonService seasonService) {
        this.seasonService = seasonService;
    }

    public record StartSeasonRequest(String hostMemberId, Boolean doubleRoundRobin, Integer overs) {}
    public record StartFixtureRequest(String memberId) {}
    public record RestartSeasonRequest(String hostMemberId) {}

    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startSeason(
            @PathVariable String roomCode,
            @RequestBody StartSeasonRequest req
    ) {
        Season season = seasonService.startSeason(roomCode, req.hostMemberId(),
                Boolean.TRUE.equals(req.doubleRoundRobin()), req.overs());
        return ResponseEntity.ok(seasonService.seasonSnapshot(season));
    }

    /** Host resets the season (mid-tournament or after completion) so a fresh one can start. */
    @PostMapping("/restart")
    public ResponseEntity<Map<String, String>> restartSeason(
            @PathVariable String roomCode,
            @RequestBody RestartSeasonRequest req
    ) {
        seasonService.restartSeason(roomCode, req.hostMemberId());
        return ResponseEntity.ok(Map.of("status", "restarted"));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getSeason(@PathVariable String roomCode) {
        return ResponseEntity.ok(seasonService.seasonSnapshot(seasonService.getSeason(roomCode)));
    }

    @PostMapping("/fixtures/{fixtureId}/start")
    public ResponseEntity<MiniMatch> startFixtureMatch(
            @PathVariable String roomCode,
            @PathVariable String fixtureId,
            @RequestBody StartFixtureRequest req
    ) {
        return ResponseEntity.ok(seasonService.startFixtureMatch(roomCode, fixtureId, req.memberId()));
    }
}
