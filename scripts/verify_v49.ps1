$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$required = @(
  "frontend/src/components/auctionxi25d/dream/stadium/world.ts",
  "frontend/src/components/auctionxi25d/dream/officials/UmpireDirector.ts",
  "frontend/src/components/auctionxi25d/dream/presentation/director.ts",
  "frontend/src/components/auctionxi25d/dream/index.ts",
  "frontend/src/components/auctionxi25d/dream/camera/director.ts",
  "frontend/src/components/auctionxi25d/dream/fielding/FieldingDirector.ts",
  "frontend/src/components/auctionxi25d/dream/ball/trajectory.ts"
)

Write-Host "[V4.9] 1/5 checking presentation baseline..."
foreach ($path in $required) {
  if (!(Test-Path $path)) { throw "Missing required file: $path" }
}
Write-Host "PASS"

Write-Host "[V4.9] 2/5 checking stadium runtime..."
$world = Get-Content "frontend/src/components/auctionxi25d/dream/stadium/world.ts" -Raw
if ($world -notmatch "class DreamStadiumWorld") { throw "Stadium world class missing" }
if ($world -notmatch "buildCrowd") { throw "Crowd runtime missing" }
if ($world -notmatch "buildFloodlights") { throw "Floodlight runtime missing" }
if ($world -notmatch "onBall\(event") { throw "Outcome-driven atmosphere binding missing" }
Write-Host "PASS"

Write-Host "[V4.9] 3/5 checking umpire runtime..."
$umpire = Get-Content "frontend/src/components/auctionxi25d/dream/officials/UmpireDirector.ts" -Raw
foreach ($token in @("UmpireDirector", "onBall", "FOUR", "SIX", "WICKET", "RUN_OUT", "WIDE", "NO_BALL")) {
  if ($umpire -notmatch $token) { throw "Umpire feature missing: $token" }
}
Write-Host "PASS"

Write-Host "[V4.9] 4/5 checking presentation integration..."
$presentation = Get-Content "frontend/src/components/auctionxi25d/dream/presentation/director.ts" -Raw
if ($presentation -notmatch "UmpireDirector") { throw "UmpireDirector import missing" }
if ($presentation -notmatch "officials\.onBall") { throw "Umpire event binding missing" }
if ($presentation -notmatch "world\.onBall") { throw "Stadium event binding missing" }
Write-Host "PASS"

Write-Host "[V4.9] 5/5 building frontend and running backend tests..."
npm run build:frontend
npm run test:backend
Write-Host "V4.9 verification complete."
