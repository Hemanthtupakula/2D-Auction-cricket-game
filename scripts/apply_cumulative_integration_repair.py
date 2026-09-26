from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / "payload"
BACKUP = ROOT / ".cumulative-repair-backup"
FILES = [
    "frontend/src/components/auctionxi25d/MiniMatch25DStage.tsx",
    "frontend/src/components/auctionxi25d/types.ts",
    "frontend/src/components/auctionxi25d/dream/ball/director.ts",
    "frontend/src/components/auctionxi25d/dream/presentation/director.ts",
    "frontend/src/components/auctionxi25d/dream/players/rig.ts",
    "frontend/src/components/auctionxi25d/playerPresentation/v4/types.ts",
    "frontend/src/components/auctionxi25d/playerPresentation/v4/ProductionCricketPlayerRig.ts",
    "frontend/src/components/auctionxi25d/livePresentation/buildPresentationFeed.ts",
]


def main() -> None:
    BACKUP.mkdir(parents=True, exist_ok=True)
    for rel in FILES:
        source = PAYLOAD / rel
        target = ROOT / rel
        if not source.exists():
            raise SystemExit(f"Missing payload file: {rel}")
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            backup = BACKUP / rel
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, backup)
        shutil.copy2(source, target)
        print(f"installed: {rel}")
    print("Cumulative integration repair installed.")
    print("Backups: .cumulative-repair-backup")


if __name__ == "__main__":
    main()
