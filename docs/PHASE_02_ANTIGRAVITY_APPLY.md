# Antigravity Apply Guide — Phase 2

1. Open the repository root:
   `C:\Users\heman\Ethno tech mca\auction-xi\auction-xi`

2. Read these files from the Phase 2 source package before modifying anything:
   - `docs/PHASE_02_SCOPE.md`
   - `docs/PHASE_02_DATA_MODEL.md`
   - `docs/PHASE_02_SUPABASE_CONFIGURATION.md`
   - `docs/PHASE_02_MIGRATION_RUNBOOK.md`
   - `docs/PHASE_02_ACCEPTANCE.md`

3. Preserve all Phase 1 Unity contracts and tests.

4. Correct obsolete agent text from earlier phases only where it conflicts with the locked
   master gameplay direction. In particular, the master gameplay contract requires a real
   batting timing meter in the future; Phase 2 simply must not implement gameplay yet.

5. Implement database persistence carefully and incrementally. After each coherent step,
   run the narrowest relevant test, then the full suite.

6. Do not expose secrets in command output, reports or generated ZIPs.

7. Do not move to Phase 3 until this checklist is green and a Phase 2 checkpoint ZIP/report
   has been produced.
