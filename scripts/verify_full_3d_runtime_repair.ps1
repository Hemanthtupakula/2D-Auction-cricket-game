$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
$stage = Get-Content 'frontend/src/components/auctionxi25d/MiniMatch25DStage.tsx' -Raw
$feed = Get-Content 'frontend/src/components/auctionxi25d/livePresentation/buildPresentationFeed.ts' -Raw
$rig = Get-Content 'frontend/src/components/auctionxi25d/dream/players/rig.ts' -Raw
$prod = Get-Content 'frontend/src/components/auctionxi25d/playerPresentation/v4/ProductionCricketPlayerRig.ts' -Raw
$ball = Get-Content 'frontend/src/components/auctionxi25d/dream/ball/director.ts' -Raw
if ($stage -match '\[players, stadiumName, onAimChange\]') { throw 'scene still remounts on player snapshots' }
if ($stage -notmatch '\[stadiumName\]') { throw 'stable scene dependency missing' }
if ($rig -notmatch 'syncPlayers') { throw 'PlayerDirector sync missing' }
if ($prod -notmatch 'preloadVisuals') { throw 'Production rig preload missing' }
if ($stage -notmatch 'ball.batterId' -or $stage -notmatch 'ball.bowlerId') { throw 'authoritative ball participant binding missing' }
foreach ($name in @('DELIVERY_TRACK','CONTACT_VIEW','FIELDING_VIEW','BOUNDARY_VIEW','WICKET_VIEW','CELEBRATION_VIEW')) { if ($stage -notmatch $name) { throw "camera missing: $name" } }
if ($feed -notmatch '\[0, -11.5\], \[-3.8, -8.8\], \[3.8, -8.8\]') { throw 'full field positions missing' }
if ($ball -notmatch 'SphereGeometry\(0.11') { throw 'ball visibility enhancement missing' }
npm run build:frontend
npm run test:backend
Write-Host 'FULL 3D RUNTIME REPAIR: PASS'
