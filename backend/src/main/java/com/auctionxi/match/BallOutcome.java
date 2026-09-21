package com.auctionxi.match;

/**
 * One resolved delivery in a mini match. Broadcast to clients one ball at a time.
 */
public record BallOutcome(
        int innings,              // 1 or 2
        int ballNumber,           // sequential ball index within the match
        int overNumber,           // 0-based over index
        int ballInOver,           // 1..6
        String battingFranchise,
        String bowlingFranchise,
        String batterId,
        String batterName,
        String bowlerId,
        String bowlerName,
        String outcome,           // DOT, SINGLE, DOUBLE, TRIPLE, FOUR, SIX, WICKET, WIDE
        int runs,                 // runs scored off this ball
        boolean wicket,
        boolean extra,            // wide
        int scoreRuns,            // batting side total after this ball
        int scoreWickets,
        int scoreBalls,           // legal balls faced after this ball
        Integer target,           // chase target (innings 2)
        String commentary,        // contextual commentary line
        String shotIntent,        // PERFECT | GOOD | OKAY | POOR
        String bowlPlan,          // PERFECT | GOOD | OKAY | POOR
        String deliveryType,      // PACE, SWING, CUTTER, YORKER, BOUNCER, SLOWER
        String line,              // OFF, MIDDLE, LEG
        String length,            // FULL, GOOD, SHORT
        String shot,              // DRIVE, COVER_DRIVE, PULL, CUT, LOFT, STRAIGHT, FLICK, DEFENCE, SWEEP
        String timing,            // PERFECT, EARLY, LATE
        String wicketType         // BOWLED, CAUGHT, LBW, RUN_OUT, NONE
) {
    public BallOutcome(
            int innings, int ballNumber, int overNumber, int ballInOver,
            String battingFranchise, String bowlingFranchise, String batterId, String batterName,
            String bowlerId, String bowlerName, String outcome, int runs, boolean wicket, boolean extra,
            int scoreRuns, int scoreWickets, int scoreBalls, Integer target, String commentary,
            String shotIntent, String bowlPlan
    ) {
        this(innings, ballNumber, overNumber, ballInOver, battingFranchise, bowlingFranchise,
             batterId, batterName, bowlerId, bowlerName, outcome, runs, wicket, extra,
             scoreRuns, scoreWickets, scoreBalls, target, commentary, shotIntent, bowlPlan,
             "PACE", "MIDDLE", "GOOD", "STRAIGHT", "PERFECT", wicket ? "BOWLED" : "NONE");
    }
}
