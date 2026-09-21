package com.auctionxi.auth;

import com.auctionxi.model.AuctionRoom;
import com.auctionxi.service.RoomStore;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Optional account system. Logged-in players get a STABLE member id, so they can
 * resume their rooms from any device (host paused, accidental close, playing later).
 * Guests keep the lightweight local-storage session and never need this.
 */
@Service
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final Path STORE = Paths.get("data", "accounts.json");

    private final Map<String, AuthAccount> accountsByEmail = new ConcurrentHashMap<>();
    private final Map<String, String> tokenToAccountId = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private final RoomStore roomStore;
    private final com.auctionxi.persistence.AccountPersistenceService accountPersistenceService;

    public AuthService(RoomStore roomStore) {
        this(roomStore, null);
    }

    @Autowired
    public AuthService(RoomStore roomStore, @org.springframework.lang.Nullable com.auctionxi.persistence.AccountPersistenceService accountPersistenceService) {
        this.roomStore = roomStore;
        this.accountPersistenceService = accountPersistenceService;
    }

    public record AuthResult(String token, String memberId, String displayName, String email) {}

    @PostConstruct
    public void load() {
        try {
            if (Files.exists(STORE)) {
                List<AuthAccount> loaded = mapper.readValue(STORE.toFile(), new TypeReference<>() {});
                for (AuthAccount a : loaded) {
                    accountsByEmail.put(a.getEmail().toLowerCase(), a);
                }
                log.info("Loaded {} player account(s) from {}", accountsByEmail.size(), STORE);
            }
        } catch (Exception e) {
            log.warn("Could not load accounts store: {}", e.getMessage());
        }
    }

    private void persist() {
        try {
            Files.createDirectories(STORE.getParent());
            mapper.writerWithDefaultPrettyPrinter().writeValue(STORE.toFile(), new ArrayList<>(accountsByEmail.values()));
            if (accountPersistenceService != null) {
                for (AuthAccount account : accountsByEmail.values()) {
                    accountPersistenceService.saveAccount(account);
                }
            }
        } catch (IOException e) {
            log.warn("Could not persist accounts: {}", e.getMessage());
        }
    }

    private String hash(String salt, String secret) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest((salt + "::" + secret).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private String newToken() {
        byte[] b = new byte[24];
        random.nextBytes(b);
        return HexFormat.of().formatHex(b);
    }

    public synchronized AuthResult register(String email, String password, String displayName,
                                            String securityQuestion, String securityAnswer) {
        String key = email == null ? "" : email.trim().toLowerCase();
        if (key.isEmpty() || !key.contains("@")) throw new IllegalArgumentException("Enter a valid email address.");
        if (password == null || password.length() < 4) throw new IllegalArgumentException("Password must be at least 4 characters.");
        if (securityQuestion == null || securityQuestion.isBlank()) throw new IllegalArgumentException("Pick a security question.");
        if (securityAnswer == null || securityAnswer.isBlank()) throw new IllegalArgumentException("Give a security answer.");
        if (accountsByEmail.containsKey(key)) throw new IllegalArgumentException("That email is already registered — log in instead.");

        String salt = UUID.randomUUID().toString();
        AuthAccount a = new AuthAccount();
        a.setAccountId(UUID.randomUUID().toString());
        a.setEmail(key);
        a.setDisplayName(displayName == null || displayName.isBlank() ? key.split("@")[0] : displayName.trim());
        a.setSalt(salt);
        a.setPasswordHash(hash(salt, password));
        a.setSecurityQuestion(securityQuestion.trim());
        a.setSecurityAnswerHash(hash(salt, securityAnswer.trim().toLowerCase()));
        a.setCreatedAt(Instant.now());
        accountsByEmail.put(key, a);
        persist();
        return issue(a);
    }

    public AuthResult login(String email, String password) {
        AuthAccount a = accountsByEmail.get(email == null ? "" : email.trim().toLowerCase());
        if (a == null || !a.getPasswordHash().equals(hash(a.getSalt(), password == null ? "" : password))) {
            throw new IllegalArgumentException("Wrong email or password.");
        }
        return issue(a);
    }

    public AuthResult recover(String email, String securityAnswer, String newPassword) {
        AuthAccount a = accountsByEmail.get(email == null ? "" : email.trim().toLowerCase());
        if (a == null) throw new IllegalArgumentException("No account found for that email.");
        if (!a.getSecurityAnswerHash().equals(hash(a.getSalt(), (securityAnswer == null ? "" : securityAnswer).trim().toLowerCase()))) {
            throw new IllegalArgumentException("Security answer doesn't match.");
        }
        if (newPassword == null || newPassword.length() < 4) throw new IllegalArgumentException("New password must be at least 4 characters.");
        a.setPasswordHash(hash(a.getSalt(), newPassword));
        persist();
        return issue(a);
    }

    private AuthResult issue(AuthAccount a) {
        String token = newToken();
        tokenToAccountId.put(token, a.getAccountId());
        return new AuthResult(token, a.getAccountId(), a.getDisplayName(), a.getEmail());
    }

    /** Returns the stable member id for a token, or null if unknown. */
    public String resolveMemberId(String token) {
        if (token == null || token.isBlank()) return null;
        return tokenToAccountId.get(token);
    }

    /** Rooms where this account's member id is a member (for "resume playing later"). */
    public List<Map<String, Object>> roomsFor(String token) {
        String memberId = resolveMemberId(token);
        if (memberId == null) return List.of();
        List<Map<String, Object>> out = new ArrayList<>();
        for (AuctionRoom room : roomStore.findAll()) {
            boolean member = room.getMembers().containsKey(memberId)
                    || room.getFranchiseAuctionStates().values().stream()
                        .anyMatch(f -> memberId.equals(f.getOwnerMemberId()))
                    || memberId.equals(room.getHostMemberId());
            if (member) {
                out.add(Map.of(
                        "roomCode", room.getRoomCode(),
                        "roomName", room.getRoomName(),
                        "status", room.getStatus().name(),
                        "isHost", memberId.equals(room.getHostMemberId())
                ));
            }
        }
        return out;
    }
}
