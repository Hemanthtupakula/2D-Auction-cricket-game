# Antigravity — V4.8 Implementation

This phase is a code package.

1. Extract the package into the Auction XI repository root.
2. Run `python .\\scripts\\apply_v48_broadcast_camera.py`.
3. Run `powershell -ExecutionPolicy Bypass -File .\\scripts\\verify_v48.ps1`.
4. Start the existing Auction XI application.

The installer creates `.v47-backup` copies of every replaced V4.7 presentation file before installing V4.8.

Backend files, MiniMatchService, scoring, WebSocket authority, and database code are not changed by this phase.
