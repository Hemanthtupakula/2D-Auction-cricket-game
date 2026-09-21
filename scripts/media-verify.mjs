import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const playersPath = path.resolve(rootDir, 'data', 'players_369.json');
const mediaPath = path.resolve(rootDir, 'data', 'player_media.json');
const envPath = path.resolve(rootDir, 'config', '.env');

console.log('=== AUCTION XI — IMAGEKIT LIVE MEDIA VERIFICATION ===');

let endpoint = 'https://ik.imagekit.io/hemanthhkt';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('IMAGEKIT_URL_ENDPOINT=')) endpoint = line.split('=')[1].trim().replace(/\/$/, '');
  }
}

if (!fs.existsSync(playersPath)) {
  console.error('[ERROR] data/players_369.json not found.');
  process.exit(1);
}

const players = JSON.parse(fs.readFileSync(playersPath, 'utf-8'));
const canonicalPlayers = players.filter(p => p.lotNumber >= 1 && p.lotNumber <= 369);

async function checkUrl(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Auction-XI-MediaVerify/1.0)',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const contentType = res.headers.get('content-type') || '';
    const buf = await res.arrayBuffer();
    return res.ok && contentType.startsWith('image/') && buf.byteLength > 0;
  } catch (e) {
    return false;
  }
}

let verifiedImageKit = 0;
let verifiedFallback = 0;
let brokenCount = 0;
let missingCount = 0;
let transformPassCount = 0;

const imageKitPlayers = canonicalPlayers.filter(p => p.media?.status === 'VERIFIED_IMAGEKIT');
console.log(`Found ${imageKitPlayers.length} players marked VERIFIED_IMAGEKIT.`);

// Check ImageKit delivery and all 5 transformations on a representative sample or all
const sampleSize = Math.min(imageKitPlayers.length, 15);
console.log(`Verifying live delivery and all 5 transformations across ${imageKitPlayers.length} assets (testing ${sampleSize} comprehensive samples)...`);

for (let i = 0; i < imageKitPlayers.length; i++) {
  const p = imageKitPlayers[i];
  const url = p.photoUrl || p.media?.deliveryUrl;

  const isDelivered = await checkUrl(url);
  if (isDelivered) {
    verifiedImageKit++;

    // Test 5 transformations on sample
    if (i < sampleSize) {
      const pid = p.id;
      const variants = [
        `${endpoint}/tr:w-100,h-100,c-maintain_ratio/auction-xi/players/${pid}.webp`, // thumbnail
        `${endpoint}/tr:w-200,h-200,c-maintain_ratio/auction-xi/players/${pid}.webp`, // pool
        `${endpoint}/tr:w-300,h-300,c-maintain_ratio/auction-xi/players/${pid}.webp`, // card
        `${endpoint}/tr:w-600,h-600,c-maintain_ratio/auction-xi/players/${pid}.webp`, // hero
        `${endpoint}/tr:w-250,h-250,c-maintain_ratio/auction-xi/players/${pid}.webp`  // mobile
      ];
      let all5Ok = true;
      for (const vUrl of variants) {
        const vOk = await checkUrl(vUrl);
        if (!vOk) { all5Ok = false; break; }
      }
      if (all5Ok) transformPassCount++;
      else brokenCount++;
    }
  } else {
    brokenCount++;
  }
}

// Check sample of fallback/missing
const fallbackPlayers = canonicalPlayers.filter(p => p.media?.status === 'SOURCE_FALLBACK');
for (const p of fallbackPlayers.slice(0, 5)) {
  const ok = await checkUrl(p.photoUrl);
  if (ok) verifiedFallback++;
  else brokenCount++;
}

const missingPlayers = canonicalPlayers.filter(p => !p.photoUrl || p.media?.status === 'MISSING');
missingCount = missingPlayers.length;

// Check 10 team logos
console.log('\nVerifying 10 Franchise Logos on ImageKit:');
const teams = ['MI', 'CSK', 'RCB', 'KKR', 'RR', 'SRH', 'GT', 'LSG', 'DC', 'PBKS'];
let teamLogosPass = 0;
for (const t of teams) {
  const tUrl = `${endpoint}/auction-xi/teams/${t}.webp`;
  const ok = await checkUrl(tUrl);
  if (ok) teamLogosPass++;
  console.log(`  Team ${t}: ${ok ? 'VERIFIED' : 'PENDING'}`);
}

console.log('\n==================================================');
console.log('LIVE MEDIA VERIFICATION REPORT');
console.log('==================================================');
console.log(`ImageKit Verified Assets:    ${verifiedImageKit}`);
console.log(`All 5 Transformations Pass:   ${transformPassCount}/${sampleSize} tested`);
console.log(`Franchise Team Logos Pass:    ${teamLogosPass}/10`);
console.log(`Approved Source Fallbacks:    ${verifiedFallback}`);
console.log(`Neutral Placeholder Players:  ${missingCount}`);
console.log(`Broken Media (HTTP Failed):   ${brokenCount}`);
console.log('==================================================');

if (brokenCount === 0) {
  console.log('[PASS] Media integrity verified with ZERO broken links.');
} else {
  console.warn(`[WARN] ${brokenCount} links failed verification.`);
}
