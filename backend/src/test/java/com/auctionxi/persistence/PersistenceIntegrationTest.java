package com.auctionxi.persistence;

import com.auctionxi.auth.AuthAccount;
import com.auctionxi.entity.AccountEntity;
import com.auctionxi.entity.PlayerEntity;

import com.auctionxi.model.AuctionRoom;
import com.auctionxi.model.Player;
import com.auctionxi.repository.AccountRepository;
import com.auctionxi.repository.AuctionRoomRepository;
import com.auctionxi.repository.PlayerRepository;
import com.auctionxi.service.PlayerDataService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
public class PersistenceIntegrationTest {

    @Autowired
    private PlayerDataService playerDataService;

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private AccountPersistenceService accountPersistenceService;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private AuctionPersistenceService auctionPersistenceService;

    @Autowired
    private AuctionRoomRepository roomRepository;

    @Test
    public void testCanonicalPlayersSeededIntoDatabase() {
        List<PlayerEntity> allInDb = playerRepository.findAll();
        assertEquals(369, allInDb.size(), "Database must be seeded with all 369 canonical players on startup");

        Optional<PlayerEntity> p1 = playerRepository.findById("p1");
        assertTrue(p1.isPresent());
        assertEquals("Jos Buttler", p1.get().getFullName());
        assertEquals(31, p1.get().getLotNumber());
        assertEquals("M1", p1.get().getAuctionSet());
        assertEquals(20000000L, p1.get().getBasePriceRupees());
    }

    @Test
    public void testAccountPersistence() {
        AuthAccount account = new AuthAccount();
        account.setAccountId("test-acc-1");
        account.setEmail("testuser@auctionxi.com");
        account.setDisplayName("Test User");
        account.setPasswordHash("hashedpass");
        account.setSalt("salt123");
        account.setSecurityQuestion("Question?");
        account.setSecurityAnswerHash("hashedans");

        AccountEntity saved = accountPersistenceService.saveAccount(account);
        assertNotNull(saved);

        Optional<AccountEntity> fetched = accountPersistenceService.findByNormalizedEmail("testuser@auctionxi.com");
        assertTrue(fetched.isPresent());
        assertEquals("Test User", fetched.get().getDisplayName());
    }

    @Test
    public void testRoomPersistence() {
        AuctionRoom room = new AuctionRoom("room-uuid-1", "TEST01", "Test Room", "host-member-1");
        auctionPersistenceService.saveRoom(room);

        var fetched = roomRepository.findByCode("TEST01");
        assertTrue(fetched.isPresent());
        assertEquals("Test Room", fetched.get().getName());
        assertEquals("host-member-1", fetched.get().getHostMemberId());
    }
}
