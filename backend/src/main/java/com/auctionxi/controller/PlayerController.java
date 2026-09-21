package com.auctionxi.controller;

import com.auctionxi.model.Player;
import com.auctionxi.service.PlayerDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    private final PlayerDataService playerDataService;

    public PlayerController(PlayerDataService playerDataService) {
        this.playerDataService = playerDataService;
    }

    @GetMapping
    public ResponseEntity<List<Player>> getPlayers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Boolean overseas,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean capped,
            @RequestParam(required = false) String set,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(playerDataService.filterPlayers(search, country, overseas, role, capped, set, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Player> getPlayerById(@PathVariable String id) {
        return playerDataService.getPlayerById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/lot/{lotNumber}")
    public ResponseEntity<Player> getPlayerByLot(@PathVariable int lotNumber) {
        return playerDataService.getPlayerByLot(lotNumber)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/random-chit")
    public ResponseEntity<?> drawRandomChit() {
        return playerDataService.drawRandomChit()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(404).body((Player) null));
    }

    @GetMapping("/audit")
    public ResponseEntity<Map<String, Object>> getAudit() {
        return ResponseEntity.ok(playerDataService.getAuditReport());
    }

    @GetMapping("/media/audit")
    public ResponseEntity<Map<String, Object>> getMediaAudit() {
        return ResponseEntity.ok(playerDataService.getMediaAuditReport());
    }

    @GetMapping({"/{id}/media", "/media/{id}"})
    public ResponseEntity<?> getPlayerMedia(@PathVariable String id) {
        return playerDataService.getPlayerMedia(id)
                .map(m -> ResponseEntity.ok((Object) m))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> syncPlayers() {
        playerDataService.loadDataset();
        return ResponseEntity.ok(playerDataService.getAuditReport());
    }
}
