from __future__ import annotations

from pathlib import Path
import hashlib
import json
import shutil

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO = Path.cwd().resolve()
TARGETS = {
    "frontend/src/components/auctionxi25d/dream/ball/trajectory.ts": "frontend/src/components/auctionxi25d/dream/ball/trajectory.ts",
    "frontend/src/components/auctionxi25d/dream/ball/director.ts": "frontend/src/components/auctionxi25d/dream/ball/director.ts",
    "frontend/src/components/auctionxi25d/dream/core/types.ts": "frontend/src/components/auctionxi25d/dream/core/types.ts",
    "frontend/src/components/auctionxi25d/dream/presentation/director.ts": "frontend/src/components/auctionxi25d/dream/presentation/director.ts",
    "frontend/src/components/auctionxi25d/livePresentation/buildPresentationFeed.ts": "frontend/src/components/auctionxi25d/livePresentation/buildPresentationFeed.ts",
    "frontend/src/components/auctionxi25d/MiniMatch25DStage.tsx": "frontend/src/components/auctionxi25d/MiniMatch25DStage.tsx",
    "frontend/src/components/auctionxi25d/types.ts": "frontend/src/components/auctionxi25d/types.ts",
}

V45_ANCHOR = "buildPresentationFeed"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def main() -> int:
    arena = REPO / "frontend/src/components/MiniMatch2DArena.tsx"
    if not arena.exists():
        print(f"ERROR: repository root not detected: {REPO}")
        return 2

    arena_text = arena.read_text(encoding="utf-8")
    if V45_ANCHOR not in arena_text:
        print("ERROR: V4.5 live presentation binding was not detected in MiniMatch2DArena.tsx")
        print("Install V4.5 first, then run this V4.6 installer.")
        return 3

    backups = []
    copied = []
    for relative_target, package_relative in TARGETS.items():
        target = REPO / relative_target
        source = PACKAGE_ROOT / "payload" / package_relative
        if not source.exists():
            raise RuntimeError(f"Missing package file: {source}")
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            backup = target.with_name(target.name + ".v45-backup")
            if not backup.exists():
                shutil.copy2(target, backup)
                backups.append(str(backup.relative_to(REPO)))
        shutil.copy2(source, target)
        copied.append(str(target.relative_to(REPO)))

    manifest = {
        "phase": "V4.6",
        "title": "Deterministic Ball Flight & Contact Presentation",
        "baseline": "V4.5 live presentation binding",
        "copied": copied,
        "backupsCreated": backups,
        "authorityBoundary": "presentation-only; authoritative scoring and server result remain untouched",
        "sha256": {p: sha256(REPO / p) for p in copied},
    }
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
