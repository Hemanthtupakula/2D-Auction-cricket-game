from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / 'payload'
BACKUP = ROOT / '.v410-backup'

changed = [
    Path('frontend/src/components/auctionxi25d/types.ts'),
    Path('frontend/src/components/auctionxi25d/MiniMatch25DStage.tsx'),
    Path('frontend/src/components/auctionxi25d/livePresentation/buildPresentationFeed.ts'),
    Path('frontend/src/components/auctionxi25d/playerPresentation/v4/types.ts'),
    Path('frontend/src/components/auctionxi25d/playerPresentation/v4/assetAdapter.ts'),
    Path('frontend/src/components/auctionxi25d/playerPresentation/v4/ProductionCricketPlayerRig.ts'),
    Path('frontend/src/components/auctionxi25d/playerPresentation/v4/visualProfileResolver.ts'),
    Path('frontend/src/components/auctionxi25d/dream/players/rig.ts'),
    Path('frontend/src/components/auctionxi25d/dream/stadium/world.ts'),
    Path('frontend/src/components/auctionxi25d/dream/camera/director.ts'),
    Path('frontend/src/components/auctionxi25d/dream/presentation/director.ts'),
]

for rel in changed:
    src = PAYLOAD / rel
    dst = ROOT / rel
    if not src.exists():
        raise SystemExit(f'Missing payload file: {src}')
    if dst.exists():
        backup = BACKUP / rel
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(dst, backup)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    print(f'installed {rel.as_posix()}')

print('\nV4.10 visual reality pass installed.')
print(f'Backups: {BACKUP}')
