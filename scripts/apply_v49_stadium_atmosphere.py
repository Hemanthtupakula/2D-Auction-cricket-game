from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / "payload"
TARGETS = [
    "frontend/src/components/auctionxi25d/dream/stadium/world.ts",
    "frontend/src/components/auctionxi25d/dream/officials/UmpireDirector.ts",
    "frontend/src/components/auctionxi25d/dream/presentation/director.ts",
    "frontend/src/components/auctionxi25d/dream/index.ts",
]


def main() -> None:
    backup_dir = ROOT / ".v48-backup-v49"
    backup_dir.mkdir(parents=True, exist_ok=True)

    for rel in TARGETS:
        source = PAYLOAD / rel
        target = ROOT / rel
        if not source.exists():
            raise SystemExit(f"Missing payload file: {source}")
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            backup = backup_dir / rel
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, backup)
        shutil.copy2(source, target)
        print(f"installed: {rel}")

    print("Phase V4.9 installed. Existing files were backed up under .v48-backup-v49.")


if __name__ == "__main__":
    main()
