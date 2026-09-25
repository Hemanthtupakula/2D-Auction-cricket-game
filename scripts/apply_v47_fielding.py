from __future__ import annotations

from pathlib import Path
import hashlib
import json
import shutil
import sys

REPO = Path(__file__).resolve().parents[1]
PACKAGE = REPO / "phase-v4.7"

COPY_FILES = [
    "frontend/src/components/auctionxi25d/dream/fielding/FieldingDirector.ts",
    "frontend/src/components/auctionxi25d/dream/players/rig.ts",
    "frontend/src/components/auctionxi25d/dream/ball/director.ts",
    "frontend/src/components/auctionxi25d/dream/presentation/director.ts",
    "frontend/src/components/auctionxi25d/playerPresentation/v4/ProductionCricketPlayerRig.ts",
]

BACKUPS = [p for p in COPY_FILES if not p.endswith("FieldingDirector.ts")]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def fail(message: str) -> int:
    print(f"ERROR: {message}")
    return 2


def main() -> int:
    if not PACKAGE.exists():
        return fail(f"phase package missing: {PACKAGE}")

    baseline = REPO / "frontend/src/components/auctionxi25d/dream/ball/trajectory.ts"
    if not baseline.exists():
        return fail("V4.6 trajectory.ts is missing. Apply V4.6 first.")

    trajectory = baseline.read_text(encoding="utf-8")
    if "resolveBallTrajectory" not in trajectory:
        return fail("This repository does not contain the expected V4.6 deterministic trajectory runtime.")

    backups = []
    for rel in BACKUPS:
        target = REPO / rel
        if target.exists():
            backup = target.with_suffix(target.suffix + ".v46-backup")
            if not backup.exists():
                shutil.copy2(target, backup)
            backups.append(str(backup.relative_to(REPO)))

    installed = []
    for rel in COPY_FILES:
        source = PACKAGE / rel
        target = REPO / rel
        if not source.exists():
            return fail(f"phase source missing: {rel}")
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        installed.append({"path": rel, "sha256": sha256(target)})

    report = {
        "status": "applied",
        "phase": "V4.7",
        "baseline": "V4.6 deterministic trajectory",
        "installed": installed,
        "backups": backups,
    }
    print(json.dumps(report, indent=2))
    print("V4.7 fielding runtime installed. Run scripts\\verify_v47.ps1 next.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
