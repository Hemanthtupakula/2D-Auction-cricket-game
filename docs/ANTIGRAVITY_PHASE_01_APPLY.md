# Antigravity — Phase 1 Apply Notes

This package is an overlay for the existing Auction XI repository.

## Where to extract

Extract the ZIP **directly into**:

`C:\Users\heman\Ethno tech mca\auction-xi\auction-xi`

Do not create another `auction-xi` folder.

After extraction, Antigravity should open the repository root and see the existing folders plus the new `docs/` and Unity contract files.

## Before running Antigravity

- Keep the existing working Auction XI code intact.
- Do not restore or add `node_modules`, `dist`, `target`, or Unity `Library` to the ZIP.
- Do not provide secrets to the agent.

## What Antigravity must do

1. Inspect the Phase 1 files supplied by this package.
2. Reconcile them against the actual repository and Unity project.
3. Integrate only what is compatible with the existing project.
4. Fix any namespace/path conflicts.
5. Verify Unity compilation/tests.
6. Run the existing backend tests and frontend build.
7. Do not implement later phases.
8. Do not rewrite the auction or existing MiniMatch engine.
9. Do not add a new database yet.
10. Stop after producing the Phase 1 implementation report.
