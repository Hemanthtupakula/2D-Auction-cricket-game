package com.auctionxi.match;

import com.auctionxi.model.Player;

import java.util.Map;

/**
 * Deterministic player ratings from the real IPL career stats in players_369.json.
 *
 * Accuracy rules (player request):
 * - Ratings come from stats + experience (matches played).
 * - Star / marquee sets (STAR, M1, M2) get respected floors when stats back them up.
 * - Uncapped or no-stats players are capped at 50 — never above that.
 */
public final class PlayerRatings {

    private PlayerRatings() {}

    private static double num(Map<String, Object> ipl, String key, double fallback) {
        if (ipl == null) return fallback;
        Object v = ipl.get(key);
        if (v instanceof Number) return ((Number) v).doubleValue();
        return fallback;
    }

    public static double clamp(double v, double lo, double hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    private static double normalize(double value, double lo, double hi) {
        return clamp((value - lo) / (hi - lo), 0.0, 1.0) * 100.0;
    }

    /** Real career stats present (played at least one recorded match). */
    public static boolean hasStats(Player p) {
        return p.getIpl() != null && num(p.getIpl(), "matches", 0) > 0;
    }

    /** Experience bonus: up to +6 from matches played. */
    private static double experienceBonus(Map<String, Object> ipl) {
        return clamp(num(ipl, "matches", 0) / 30.0, 0, 6);
    }

    /** Floor for proven star/marquee sets when stats exist. */
    private static double setFloor(Player p) {
        String set = p.getAuctionSet() == null ? "" : p.getAuctionSet().toUpperCase();
        return switch (set) {
            case "STAR" -> 65;
            case "M1" -> 62;
            case "M2" -> 60;
            default -> 5;
        };
    }

    private static boolean isBowler(Player p) {
        return p.getRole() != null && p.getRole().toLowerCase().contains("bowl");
    }

    private static boolean isAllRounder(Player p) {
        return p.getRole() != null && p.getRole().toLowerCase().contains("all");
    }

    /**
     * Batting rating 5-99: balanced blend of total runs, average, and strike rate.
     * High runs + moderate SR (accumulators) AND high SR + moderate runs (finishers)
     * both earn top-tier ratings. Star/marquee floors are respected.
     */
    public static double battingRating(Player p) {
        Map<String, Object> ipl = p.getIpl();
        if (!hasStats(p)) {
            double base = isBowler(p) ? 22 : isAllRounder(p) ? 35 : 30;
            return clamp(base, 5, 50);
        }
        double runs = num(ipl, "runs", 0.0);
        double sr = num(ipl, "strikeRate", 120.0);
        double avg = num(ipl, "average", 25.0);

        // Volume score (0 to 4500+ runs)
        double volumeScore = normalize(runs, 100, 4500);
        // Consistency score (18 to 48+ average)
        double avgScore = normalize(avg, 18, 48);
        // Speed score (110 to 170+ strike rate)
        double srScore = normalize(sr, 110, 170);

        // Balanced blend: volume (35%), strike rate (35%), average (30%)
        double raw = 0.35 * volumeScore + 0.35 * srScore + 0.30 * avgScore;

        // Quality boosts for proven milestones
        if (runs >= 2000) raw += 6.0;
        if (sr >= 145.0) raw += 4.0;

        return clamp(Math.max(raw + experienceBonus(ipl), setFloor(p)), 5, 99);
    }

    /**
     * Bowling rating 5-99: inverted economy + wickets per match, plus experience.
     * No-stats players: role-based base, hard-capped at 50.
     */
    public static double bowlingRating(Player p) {
        Map<String, Object> ipl = p.getIpl();
        if (!hasStats(p)) {
            double base = isBowler(p) ? 30 : isAllRounder(p) ? 30 : 15;
            return clamp(base, 5, 50);
        }
        double wickets = num(ipl, "wickets", 0.0);
        if (wickets <= 0) return isAllRounder(p) ? clamp(35 + experienceBonus(ipl), 5, 50) : 15.0;
        double econ = num(ipl, "economy", 9.0);
        double matches = Math.max(1.0, num(ipl, "matches", 1.0));
        double bowlingSr = num(ipl, "bowlingStrikeRate", 0.0);
        double wicketsScore = normalize(wickets / matches, 0, 1.5);
        double economyScore = normalize(11.5 - econ, 0, 5.5);
        double srScore = bowlingSr > 0 ? normalize(45.0 - bowlingSr, 0, 30.0)
                : normalize(wickets / matches, 0, 1.5);
        double raw = 0.40 * wicketsScore + 0.40 * economyScore + 0.20 * srScore;
        return clamp(Math.max(raw + experienceBonus(ipl), setFloor(p)), 5, 99);
    }

    /** Impact = batting/bowling blend by role; all-rounders get a small boost. */
    public static double impactScore(Player p) {
        double bat = battingRating(p);
        double bowl = bowlingRating(p);
        String role = p.getRole() == null ? "" : p.getRole().toLowerCase();
        if (role.contains("all")) {
            return clamp(0.5 * bat + 0.5 * bowl + 4, 5, 99);
        }
        if (role.contains("bowl")) {
            return clamp(0.3 * bat + 0.7 * bowl, 5, 99);
        }
        return clamp(0.8 * bat + 0.2 * bowl, 5, 99);
    }

    /** Runtime derived capabilities for batting — calculated on-the-fly from official BAT rating & role. */
    public record BatterCapabilities(
            double batRating,
            double timingWindowMs,      // 100ms - 150ms effective timing window
            double contactConsistency,  // 0.40 - 0.95 contact quality multiplier
            double exitPower,           // 0.50 - 1.00 exit velocity multiplier
            double placementAccuracy,   // 0.40 - 0.90 directional precision
            double footworkResponse,    // 0.30 - 0.85 response vs yorker/bouncer
            double boundaryIntent       // 0.30 - 0.90 boundary conversion intent
    ) {}

    /** Derive runtime batting capabilities from official BAT rating & player role. */
    public static BatterCapabilities deriveBatterCapabilities(Player p) {
        double bat = battingRating(p);
        String role = p.getRole() == null ? "" : p.getRole().toLowerCase();

        double timingWindowMs = 100.0 + (bat / 99.0) * 50.0; // 100 - 150 ms
        double contactConsistency = 0.40 + (bat / 99.0) * 0.55;
        double exitPower = 0.50 + (bat / 99.0) * 0.50;
        double placementAccuracy = 0.40 + (bat / 99.0) * 0.50;
        double footworkResponse = 0.30 + (bat / 99.0) * 0.55;
        double boundaryIntent = 0.30 + (bat / 99.0) * 0.60;

        // Apply archetype adjustments based on role/profile
        if (role.contains("all") || bat > 80.0) {
            // Power / Finisher tendencies
            exitPower = clamp(exitPower + 0.08, 0.5, 1.0);
            boundaryIntent = clamp(boundaryIntent + 0.08, 0.3, 1.0);
        } else if (bat > 65.0) {
            // Anchor tendencies
            contactConsistency = clamp(contactConsistency + 0.06, 0.4, 1.0);
            placementAccuracy = clamp(placementAccuracy + 0.06, 0.4, 1.0);
        }

        return new BatterCapabilities(bat, timingWindowMs, contactConsistency, exitPower, placementAccuracy, footworkResponse, boundaryIntent);
    }

    /** Runtime derived capabilities for bowling — calculated on-the-fly from official BOWL rating & role. */
    public record BowlerCapabilities(
            double bowlRating,
            double releaseSpeedKph,    // 110 - 150 kph
            double lineControl,        // 0.40 - 0.95 line accuracy
            double lengthControl,      // 0.40 - 0.95 length accuracy
            double movementIndex,      // 0.10 - 0.85 swing/seam/cut movement
            double yorkerExecution,    // 0.20 - 0.90 yorker hit chance
            double bouncerExecution,   // 0.20 - 0.90 bouncer hit chance
            double pressureModifier    // 0.00 - 0.15 pressure bowling bonus
    ) {}

    /** Derive runtime bowling capabilities from official BOWL rating & player role. */
    public static BowlerCapabilities deriveBowlerCapabilities(Player p) {
        double bowl = bowlingRating(p);
        String role = p.getRole() == null ? "" : p.getRole().toLowerCase();

        double releaseSpeedKph = 115.0 + (bowl / 99.0) * 35.0; // 115 - 150 kph
        double lineControl = 0.40 + (bowl / 99.0) * 0.55;
        double lengthControl = 0.40 + (bowl / 99.0) * 0.55;
        double movementIndex = 0.10 + (bowl / 99.0) * 0.65;
        double yorkerExecution = 0.20 + (bowl / 99.0) * 0.70;
        double bouncerExecution = 0.20 + (bowl / 99.0) * 0.65;
        double pressureModifier = 0.02 + (bowl / 99.0) * 0.13;

        if (role.contains("bowl") || role.contains("all")) {
            movementIndex = clamp(movementIndex + 0.05, 0.1, 0.9);
            yorkerExecution = clamp(yorkerExecution + 0.05, 0.2, 0.95);
        }

        return new BowlerCapabilities(bowl, releaseSpeedKph, lineControl, lengthControl, movementIndex, yorkerExecution, bouncerExecution, pressureModifier);
    }
}

