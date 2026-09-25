$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$required = @(
  'frontend/src/components/auctionxi25d/playerPresentation/v4/visualProfileResolver.ts',
  'frontend/src/components/auctionxi25d/playerPresentation/v4/ProductionCricketPlayerRig.ts',
  'frontend/src/components/auctionxi25d/livePresentation/buildPresentationFeed.ts',
  'frontend/src/components/auctionxi25d/dream/stadium/world.ts',
  'frontend/src/components/auctionxi25d/dream/camera/director.ts',
  'frontend/src/components/auctionxi25d/MiniMatch25DStage.tsx'
)

Write-Host 'V4.10 Visual Reality Verification' -ForegroundColor Cyan
foreach ($rel in $required) {
  $path = Join-Path $root $rel
  if (-not (Test-Path $path)) { throw "MISSING: $rel" }
  Write-Host "PASS  $rel" -ForegroundColor Green
}

$feed = Get-Content (Join-Path $root 'frontend/src/components/auctionxi25d/livePresentation/buildPresentationFeed.ts') -Raw
if ($feed -notmatch 'id:\s*player\.id') { throw 'Authoritative player ID is not preserved in presentation feed.' }
if ($feed -match 'FRIEND_NAME_ALIASES') { throw 'Legacy friend-name identity aliasing is still present.' }
if ($feed -notmatch 'visualProfileId') { throw 'Visual profile is not being assigned.' }
Write-Host 'PASS  Original identity preserved + visual profile separated' -ForegroundColor Green

$rig = Get-Content (Join-Path $root 'frontend/src/components/auctionxi25d/playerPresentation/v4/ProductionCricketPlayerRig.ts') -Raw
if ($rig -notmatch 'input\.visualProfileId') { throw 'Production rig is not consuming visualProfileId.' }
if ($rig -notmatch 'preloadProfiles') { throw 'Friend likeness preload was not installed.' }
Write-Host 'PASS  Real GLB/face visual path connected' -ForegroundColor Green

$world = Get-Content (Join-Path $root 'frontend/src/components/auctionxi25d/dream/stadium/world.ts') -Raw
foreach ($term in @('buildStands','buildScreens','buildLights','buildUmpires','reactToBall')) {
  if ($world -notmatch $term) { throw "Stadium feature missing: $term" }
}
Write-Host 'PASS  Stadium / crowd / lights / screens / umpires' -ForegroundColor Green

Write-Host ''
Write-Host 'Run full checks:' -ForegroundColor Yellow
Write-Host '  npm run build:frontend'
Write-Host '  npm run test:backend'
Write-Host ''
Write-Host 'V4.10 static verification complete.' -ForegroundColor Cyan
