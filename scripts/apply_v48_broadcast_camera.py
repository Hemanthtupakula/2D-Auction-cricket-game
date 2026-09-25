from __future__ import annotations

from pathlib import Path
import hashlib
import json
import shutil

PACKAGE = Path(__file__).resolve().parents[1]
REPO = PACKAGE.parent if (PACKAGE.parent / 'frontend').exists() else PACKAGE
PAYLOAD = PACKAGE / 'payload'

FILES = [
    Path('frontend/src/components/auctionxi25d/dream/camera/director.ts'),
    Path('frontend/src/components/auctionxi25d/dream/camera/cinematic.ts'),
    Path('frontend/src/components/auctionxi25d/dream/presentation/director.ts'),
    Path('frontend/src/components/auctionxi25d/dream/ball/director.ts'),
    Path('frontend/src/components/auctionxi25d/dream/fielding/FieldingDirector.ts'),
    Path('frontend/src/components/auctionxi25d/MiniMatch25DStage.tsx'),
]

BACKUP_SUFFIX = '.v47-backup'


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def main() -> int:
    if not PAYLOAD.exists():
        raise SystemExit(f'ERROR: payload directory missing: {PAYLOAD}')
    if not (REPO / 'frontend').exists():
        raise SystemExit(f'ERROR: expected Auction XI repository root with frontend/: {REPO}')

    missing = [str(path) for path in FILES if not (PAYLOAD / path).exists()]
    if missing:
        raise SystemExit('ERROR: package is incomplete:\n' + '\n'.join(missing))

    # Validate the critical V4.7 baseline before touching it.
    baseline_fielding = REPO / FILES[4]
    baseline_presentation = REPO / FILES[2]
    baseline_ball = REPO / FILES[3]
    for path in [baseline_fielding, baseline_presentation, baseline_ball]:
        if not path.exists():
            raise SystemExit(f'ERROR: V4.7 baseline file not found: {path}')

    baseline_checks = {
        'fielding': ['FieldingSequence', 'getSequence'],
        'presentation': ['FieldingDirector', 'this.fielding.begin'],
        'ball': ['getTrajectory', 'getTimings'],
    }
    baseline_texts = {
        'fielding': baseline_fielding.read_text(encoding='utf-8'),
        'presentation': baseline_presentation.read_text(encoding='utf-8'),
        'ball': baseline_ball.read_text(encoding='utf-8'),
    }
    for label, markers in baseline_checks.items():
        for marker in markers:
            if marker not in baseline_texts[label]:
                raise SystemExit(f'ERROR: expected V4.7 baseline marker missing: {label} -> {marker}')

    backups = []
    installed = []
    for rel in FILES:
        dst = REPO / rel
        src = PAYLOAD / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if dst.exists():
            backup = Path(str(dst) + BACKUP_SUFFIX)
            if not backup.exists():
                shutil.copy2(dst, backup)
            backups.append(str(backup.relative_to(REPO)))
        shutil.copy2(src, dst)
        installed.append(str(rel))

    # Self-check the installed source markers.
    installed_camera = (REPO / FILES[0]).read_text(encoding='utf-8')
    installed_cinematic = (REPO / FILES[1]).read_text(encoding='utf-8')
    installed_presentation = (REPO / FILES[2]).read_text(encoding='utf-8')
    installed_stage = (REPO / FILES[5]).read_text(encoding='utf-8')

    for marker in ['setManual', 'beginBall', 'BOUNDARY_VIEW', 'WICKET_VIEW']:
        source = installed_camera + installed_cinematic
        if marker not in source:
            raise SystemExit(f'ERROR: installed V4.8 camera marker missing: {marker}')
    for marker in ['this.camera.beginBall', 'this.ball.getPosition()', 'this.fielding.getTarget()']:
        if marker not in installed_presentation:
            raise SystemExit(f'ERROR: installed presentation marker missing: {marker}')
    if 'setManual' not in installed_stage:
        raise SystemExit('ERROR: installed stage manual camera binding is missing.')

    print(json.dumps({
        'status': 'applied',
        'phase': 'V4.8',
        'baseline': 'V4.7',
        'installedFiles': installed,
        'backups': backups,
        'sha256': {str(rel): sha256(REPO / rel) for rel in FILES},
        'backendTouched': False,
    }, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
