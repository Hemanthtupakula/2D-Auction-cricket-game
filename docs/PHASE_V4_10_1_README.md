# Auction XI V4.10.1 — Cumulative Gameplay Integration Repair

This repair is cumulative. It does **not** replace the Phase 1+ gameplay system.

It restores the missing 2D -> 3D wiring at `MiniMatch25DStage`:

- Physical pitch aim circle is rendered and draggable.
- `onAimChange` updates the existing `MiniMatch2DArena` aim state.
- Releasing the drag calls the existing `onAimLock` flow.
- Existing `isDelivering` starts a **visual delivery preview** immediately after the bowling plan is committed.
- The server remains authoritative: once the real `lastBall` arrives, the preview is replaced by the authoritative V4.6/V4.7/V4.8 result presentation.
- Existing original player IDs/names are preserved.
- Existing `visualProfileId` is passed into the V4 likeness rig.
- Existing batting timing, field preset, scorecard, debug, QA, auction data and backend match logic are untouched.

Do NOT use the prior V4.10 package alone as the final state. Apply this repair after V4.10 or use the files directly against the current V4.8/V4.10 working tree.
