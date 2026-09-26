$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$required = @(
  "frontend/src/components/auctionxi25d/MiniMatch25DStage.tsx",
  "frontend/src/components/auctionxi25d/types.ts",
  "frontend/src/components/auctionxi25d/dream/ball/director.ts",
  "frontend/src/components/auctionxi25d/dream/presentation/director.ts",
  "frontend/src/components/auctionxi25d/dream/players/rig.ts",
  "frontend/src/components/auctionxi25d/playerPresentation/v4/types.ts",
  "frontend/src/components/auctionxi25d/playerPresentation/v4/ProductionCricketPlayerRig.ts",
  "frontend/src/components/auctionxi25d/livePresentation/buildPresentationFeed.ts"
)

Write-Host "[1/8] checking required files..."
foreach ($path in $required) {
  if (!(Test-Path $path)) { throw "Missing: $path" }
}
Write-Host "PASS"

Write-Host "[2/8] checking 3D aim bridge..."
$stage = Get-Content "frontend/src/components/auctionxi25d/MiniMatch25DStage.tsx" -Raw
foreach ($token in @("aimX", "aimZ", "canAim", "onAimChange", "onAimLock", "Raycaster", "auction-xi-3d-aim-target")) {
  if ($stage -notmatch [regex]::Escape($token)) { throw "Aim token missing: $token" }
}
Write-Host "PASS"

Write-Host "[3/8] checking delivery preview..."
$ball = Get-Content "frontend/src/components/auctionxi25d/dream/ball/director.ts" -Raw
foreach ($token in @("beginDeliveryPreview", "previewOnly", "contactTime", "previewRunning")) {
  if ($ball -notmatch [regex]::Escape($token)) { throw "Preview token missing: $token" }
}
Write-Host "PASS"

Write-Host "[4/8] checking presentation handoff..."
$presentation = Get-Content "frontend/src/components/auctionxi25d/dream/presentation/director.ts" -Raw
foreach ($token in @("startDeliveryPreview", "isDeliveryPreview", "playBall", "ball.beginDeliveryPreview")) {
  if ($presentation -notmatch [regex]::Escape($token)) { throw "Presentation token missing: $token" }
}
Write-Host "PASS"

Write-Host "[5/8] checking original identity preservation..."
$feed = Get-Content "frontend/src/components/auctionxi25d/livePresentation/buildPresentationFeed.ts" -Raw
if ($feed -match "FRIEND_NAME_ALIASES") { throw "Legacy friend-name alias identity replacement is still present" }
if ($feed -notmatch "id: player.id") { throw "Authoritative player ID is not preserved" }
$rig = Get-Content "frontend/src/components/auctionxi25d/playerPresentation/v4/ProductionCricketPlayerRig.ts" -Raw
if ($rig -notmatch "visualProfileId") { throw "Visual profile resolver is missing" }
Write-Host "PASS"

Write-Host "[6/8] checking frontend build..."
npm run build:frontend
Write-Host "PASS"

Write-Host "[7/8] checking backend tests..."
npm run test:backend
Write-Host "PASS"

Write-Host "[8/8] cumulative integration repair verification complete."
