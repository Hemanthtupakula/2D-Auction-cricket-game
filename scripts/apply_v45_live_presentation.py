from __future__ import annotations

from pathlib import Path
import hashlib
import json
import shutil

REPO = Path(__file__).resolve().parents[1]
ARENA = REPO / "frontend/src/components/MiniMatch2DArena.tsx"
HELPER = REPO / "frontend/src/components/auctionxi25d/livePresentation/buildPresentationFeed.ts"

IMPORT_ANCHOR = "import { MiniMatchFieldMap, FieldPreset } from './MiniMatchFieldMap';"
IMPORT_REPLACEMENT = (
    IMPORT_ANCHOR
    + "\nimport { buildPresentationFeed } from './auctionxi25d/livePresentation/buildPresentationFeed';"
)

BOWLER_ANCHOR = """  const bowlerId = matchAny.currentBowlerId;
  const bowlerName = (bowlerId && matchAny.playerNames?.[bowlerId]) || matchAny.bowlerName || 'Bowler';"""

ROSTER_BLOCK = BOWLER_ANCHOR + """

  const presentationFeed = useMemo(
    () => buildPresentationFeed(match),
    [match],
  );"""

STAGE_ANCHOR = "          batIntent={battingIntent}"
STAGE_REPLACEMENT = """          batIntent={battingIntent}
          balls={presentationFeed.balls}
          lastBall={presentationFeed.lastBall}
          players={presentationFeed.players}"""


def replace_once(text: str, anchor: str, replacement: str, label: str) -> str:
    count = text.count(anchor)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 anchor, found {count}")
    return text.replace(anchor, replacement, 1)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def main() -> int:
    if not ARENA.exists():
        print(f"ERROR: cannot find {ARENA}")
        return 2
    if not HELPER.exists():
        print(f"ERROR: phase helper is missing at {HELPER}")
        return 2

    source = ARENA.read_text(encoding="utf-8")
    updated = source

    if "buildPresentationFeed" not in updated:
        updated = replace_once(updated, IMPORT_ANCHOR, IMPORT_REPLACEMENT, "arena import")

    if "const presentationFeed = useMemo(" not in updated:
        updated = replace_once(updated, BOWLER_ANCHOR, ROSTER_BLOCK, "presentation feed")

    if "players={presentationFeed.players}" not in updated:
        updated = replace_once(updated, STAGE_ANCHOR, STAGE_REPLACEMENT, "stage props")

    backup = ARENA.with_suffix(".tsx.v44-backup")
    if not backup.exists():
        shutil.copy2(ARENA, backup)

    ARENA.write_text(updated, encoding="utf-8")

    report = {
        "status": "applied",
        "arena": str(ARENA.relative_to(REPO)),
        "helper": str(HELPER.relative_to(REPO)),
        "backup": str(backup.relative_to(REPO)),
        "arena_sha256": sha256(ARENA),
        "helper_sha256": sha256(HELPER),
    }
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
