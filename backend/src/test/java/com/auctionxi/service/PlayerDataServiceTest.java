package com.auctionxi.service;

import com.auctionxi.model.Player;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

public class PlayerDataServiceTest {

    private PlayerDataService playerDataService;

    @BeforeEach
    public void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        MediaIngestionService mediaIngestionService = new MediaIngestionService(objectMapper);
        mediaIngestionService.init();
        playerDataService = new PlayerDataService(objectMapper, mediaIngestionService);
        playerDataService.init();
    }

    @Test
    public void testAll369PlayersLoaded() {
        List<Player> all = playerDataService.getAllPlayers();
        assertEquals(369, all.size(), "Should load exactly 369 canonical players");
    }

    @Test
    public void testPlayerLookupByIdAndLot() {
        Optional<Player> p1 = playerDataService.getPlayerById("p1");
        assertTrue(p1.isPresent());
        assertEquals("Jos Buttler", p1.get().getFullName());
        assertEquals(31, p1.get().getLotNumber());
        assertEquals("M1", p1.get().getAuctionSet());
        assertEquals("Wicketkeeper", p1.get().getRole());
        assertEquals(20000000L, p1.get().getBasePrice());

        Optional<Player> lot1 = playerDataService.getPlayerByLot(1);
        assertTrue(lot1.isPresent());
        assertEquals("Virat Kohli", lot1.get().getFullName());
    }

    @Test
    public void testStrictNullForUnplayedStats() {
        Optional<Player> uncapped = playerDataService.getPlayerById("p351");
        assertTrue(uncapped.isPresent());
        assertNull(uncapped.get().getIpl(), "Unplayed IPL career must be strictly null, never zero");
    }

    @Test
    public void testSearchAndFilters() {
        List<Player> overseas = playerDataService.filterPlayers(null, null, true, null, null, null, null);
        assertFalse(overseas.isEmpty());
        assertTrue(overseas.stream().allMatch(Player::isOverseas));

        List<Player> bowlers = playerDataService.filterPlayers(null, null, null, "Bowler", null, null, null);
        assertFalse(bowlers.isEmpty());
        assertTrue(bowlers.stream().allMatch(p -> "Bowler".equalsIgnoreCase(p.getRole())));

        List<Player> searched = playerDataService.filterPlayers("Pant", null, null, null, null, null, null);
        assertEquals(1, searched.size());
        assertEquals("Rishabh Pant", searched.get(0).getFullName());
    }

    @Test
    public void testRandomChitDraw() {
        Optional<Player> drawn = playerDataService.drawRandomChit();
        assertTrue(drawn.isPresent());
        assertEquals("ON_BLOCK", drawn.get().getStatus());
    }

    @Test
    public void testAuditReport() {
        Map<String, Object> audit = playerDataService.getAuditReport();
        assertEquals(369, audit.get("canonicalPoolSize"));
        assertEquals(6, audit.get("nonCanonicalDbRecords"));
        assertNotNull(audit.get("statisticsComplete"));
        assertNotNull(audit.get("statisticsPartial"));
        assertNotNull(audit.get("mediaAudit"));
    }

    @Test
    public void testMediaRegistryIntegration() {
        Map<String, Object> mediaAudit = playerDataService.getMediaAuditReport();
        assertEquals(369, mediaAudit.get("canonical"));
        assertEquals(6, mediaAudit.get("nonCanonicalDbRecords"));

        // Lot 31 (Jos Buttler) has verified ImageKit media or source fallback
        Optional<Player> p1 = playerDataService.getPlayerById("p1");
        assertTrue(p1.isPresent());
        assertNotNull(p1.get().getPhotoUrl());
        assertTrue(p1.get().getPhotoUrl().contains("imagekit.io") || p1.get().getPhotoUrl().contains("documents.iplt20.com"));
        assertTrue(java.util.List.of("VERIFIED_IMAGEKIT", "SOURCE_FALLBACK").contains((String) p1.get().getMedia().get("status")));
        assertTrue(java.util.List.of("DEV_FALLBACK_FAIR_USE", "CREATIVE_COMMONS_CC_BY_SA", "PUBLIC_DOMAIN").contains((String) p1.get().getMedia().get("rightsStatus")));
        assertEquals("IMAGEKIT", p1.get().getMedia().get("storageProvider"));
        assertEquals("/auction-xi/players/p1.webp", p1.get().getMedia().get("storagePath"));

        // Lot 351 (Uncapped / debut) must have MISSING or PLACEHOLDER status and fallback placeholder
        Optional<Player> p351 = playerDataService.getPlayerById("p351");
        assertTrue(p351.isPresent());
        assertTrue(p351.get().getPhotoUrl() == null || p351.get().getPhotoUrl().contains("placeholder"));
        assertTrue(java.util.List.of("MISSING", "PLACEHOLDER").contains((String) p351.get().getMedia().get("status")));
    }
}
