package com.auctionxi.auth;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Optional account auth: register / login / recover / resume rooms. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    @Autowired
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    public record RegisterRequest(String email, String password, String displayName,
                                  String securityQuestion, String securityAnswer) {}
    public record LoginRequest(String email, String password) {}
    public record RecoverRequest(String email, String securityAnswer, String newPassword) {}

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        try {
            return ResponseEntity.ok(authService.register(req.email(), req.password(), req.displayName(),
                    req.securityQuestion(), req.securityAnswer()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        try {
            return ResponseEntity.ok(authService.login(req.email(), req.password()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/recover")
    public ResponseEntity<?> recover(@RequestBody RecoverRequest req) {
        try {
            return ResponseEntity.ok(authService.recover(req.email(), req.securityAnswer(), req.newPassword()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** Rooms this account can resume (host paused, closed tab, playing later). */
    @GetMapping("/rooms")
    public ResponseEntity<List<Map<String, Object>>> rooms(@RequestParam String token) {
        return ResponseEntity.ok(authService.roomsFor(token));
    }
}
